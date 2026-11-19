"""Recording and reading consent (ADR 0042). The latest record for a person and purpose counts."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import legal
from app.models import Consent
from app.privacy_schemas import ConsentRecord, ConsentState


def _today() -> date:
    return datetime.now(UTC).date()


async def history(
    db: AsyncSession, *, user_id: uuid.UUID | None = None, member_id: uuid.UUID | None = None
) -> list[Consent]:
    """Every consent record of one person, oldest first."""
    owner = Consent.user_id == user_id if user_id is not None else Consent.member_id == member_id
    rows = await db.scalars(select(Consent).where(owner).order_by(Consent.recorded_at, Consent.id))
    return list(rows)


def _latest(rows: list[Consent]) -> dict[str, Consent]:
    latest: dict[str, Consent] = {}
    for row in rows:  # oldest first, so later rows replace earlier ones
        latest[row.purpose] = row
    return latest


async def record_required(
    db: AsyncSession,
    *,
    via: str,
    user_id: uuid.UUID | None = None,
    member_id: uuid.UUID | None = None,
) -> None:
    """Record agreement to the current terms and privacy policy, unless it is already on record.

    Called where the screen says agreeing is part of the step: joining a class (the tick box) and a
    teacher signing in ("By signing in you agree…").
    """
    latest = _latest(await history(db, user_id=user_id, member_id=member_id))
    today = _today()
    for purpose in legal.REQUIRED:
        version = legal.current(purpose, today).version
        row = latest.get(purpose)
        # Agreeing early to an upcoming version also counts; it must not be overwritten.
        if row is None or row.version not in legal.agreeable(purpose, today):
            db.add(
                Consent(
                    user_id=user_id,
                    member_id=member_id,
                    purpose=purpose,
                    version=version,
                    granted=True,
                    via=via,
                )
            )
    await db.flush()


def states(rows: list[Consent], *, teacher: bool) -> list[ConsentState]:
    """Where a person stands on each purpose they can be asked about."""
    latest = _latest(rows)
    today = _today()
    purposes = legal.REQUIRED + (legal.OPTIONAL_FOR_TEACHERS if teacher else ())
    out: list[ConsentState] = []
    for purpose in purposes:
        now = legal.current(purpose, today)
        soon = legal.upcoming(purpose, today)
        row = latest.get(purpose)
        required = purpose in legal.REQUIRED
        out.append(
            ConsentState(
                purpose=purpose,
                document=legal.DOCUMENTS[purpose].title,
                required=required,
                current_version=now.version,
                upcoming_version=soon.version if soon else None,
                upcoming_from=soon.effective_from if soon else None,
                granted=None if row is None else row.granted,
                version=None if row is None else row.version,
                recorded_at=None if row is None else row.recorded_at,
                needs_agreement=required
                and (
                    row is None
                    or not row.granted
                    or row.version not in legal.agreeable(purpose, today)
                ),
            )
        )
    return out


def records(rows: list[Consent]) -> list[ConsentRecord]:
    return [
        ConsentRecord(
            purpose=r.purpose,  # pyright: ignore[reportArgumentType] (checked by the table)
            version=r.version,
            granted=r.granted,
            via=r.via,  # pyright: ignore[reportArgumentType] (checked by the table)
            recorded_at=r.recorded_at,
        )
        for r in rows
    ]
