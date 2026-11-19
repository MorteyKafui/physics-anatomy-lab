"""Daily quotas, the per-address limit and the daily budget (docs/content/ai-quotas-brief.md).

Counted from the AI request log (`ai_requests`), since midnight UTC (Ghana keeps UTC all year).
Every check runs before anything reaches Claude: a request over a limit is refused with a plain
line and costs nothing. Replies served from the answer cache are logged as `cached` and do not
count (item 4, the next pull request).
"""

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.features import FEATURES, FeatureName
from app.ai.log import pseudonym
from app.ai.policy import Unavailable, refuse, why_unavailable
from app.ai.switches import switched_off
from app.auth import rate_limit
from app.auth.policy import Limit
from app.auth.sessions import MaybePrincipal, Principal, Teacher
from app.config import Settings, get_settings
from app.db import Db
from app.models import AiRequest

FREE_OUTCOMES = ("cached",)


def midnight(now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    return now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)


def address_limit(settings: Settings) -> Limit:
    return Limit("ai:ip", settings.ai_requests_per_address, timedelta(days=1))


def quota(principal: Principal, feature: FeatureName, settings: Settings) -> int:
    table = (
        settings.ai_quota_teacher if isinstance(principal, Teacher) else settings.ai_quota_student
    )
    return table.get(feature.value, 0)


async def used_today(db: AsyncSession, principal: Principal, feature: FeatureName) -> int:
    count = await db.scalar(
        select(func.count())
        .select_from(AiRequest)
        .where(
            AiRequest.pseudonym == pseudonym(principal),
            AiRequest.feature == feature.value,
            AiRequest.at >= midnight(),
            AiRequest.outcome.not_in(FREE_OUTCOMES),
        )
    )
    return count or 0


async def spent_today(db: AsyncSession) -> int:
    """Millionths of a dollar spent since midnight, by everyone."""
    total = await db.scalar(
        select(func.coalesce(func.sum(AiRequest.cost_microdollars), 0)).where(
            AiRequest.at >= midnight()
        )
    )
    return int(total or 0)


async def budget_reached(db: AsyncSession, settings: Settings) -> bool:
    budget = settings.ai_daily_budget_usd
    return budget is not None and await spent_today(db) >= round(budget * 1_000_000)


async def why_limited(
    db: AsyncSession, principal: Principal, feature: FeatureName, settings: Settings
) -> Unavailable | None:
    """A limit that stops this request, if any: the day's budget first, then the quota."""
    if await budget_reached(db, settings):
        return Unavailable.budget_reached
    if await used_today(db, principal, feature) >= quota(principal, feature, settings):
        return Unavailable.quota_used
    return None


async def enforce(
    db: AsyncSession, request: Request, principal: Principal | None, name: FeatureName
) -> None:
    """Every AI route's gate: who may use it (ADR 0043) and the switches, then the day's limits."""
    settings = get_settings()
    off = await switched_off(db) if principal is not None else frozenset[str]()
    reason = why_unavailable(principal, FEATURES[name], settings, off)
    if reason is not None:
        raise refuse(reason)
    assert principal is not None  # checked by why_unavailable
    limited = await why_limited(db, principal, name, settings)
    if limited is not None:
        raise refuse(limited)
    limit = address_limit(settings)
    if await rate_limit.record(db, limit, rate_limit.client_address(request)) > limit.hits:
        raise refuse(Unavailable.address_busy)


def within_limits(name: FeatureName) -> Callable[..., Awaitable[None]]:
    """A route dependency that refuses, before the body is used, a request over a limit."""

    async def gate(request: Request, db: Db, principal: MaybePrincipal) -> None:
        await enforce(db, request, principal, name)

    return gate
