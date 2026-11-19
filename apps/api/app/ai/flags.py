"""Flagged replies (docs/content/ai-evals-brief.md, decision 6).

A student or teacher reports an AI answer with a reason. The flag keeps the feature, the
experiment and step, the reason and the reply's own text, which the server had already checked.
It never keeps the question, or who sent it beyond the log's pseudonym for a daily limit. A reply
that looks like it holds contact details is refused rather than kept. Flags are kept 90 days.
"""

import re
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from pydantic import Field
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.features import FeatureName
from app.ai.log import pseudonym
from app.auth import rate_limit
from app.auth.policy import Limit
from app.auth.sessions import Principal
from app.live.schemas import StepName
from app.models import AiFlag
from app.schemas import Body

FLAG_RETENTION = timedelta(days=90)
FLAGS_PER_PERSON = Limit("ai-flag:who", 10, timedelta(days=1))
MAX_REPLY = 2000

Reason = Literal["wrong-physics", "confusing", "unsuitable", "other"]

# What looks like contact details: an email address, or a run of nine or more digits (a phone
# number), as the display-name check looks for (app/admin/queries.py).
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?:\+?\d[\s-]?){9,}")
CONTACT_DETAILS = "That answer looks like it holds contact details, so it cannot be reported."


class FlagRequest(Body):
    feature: FeatureName
    experiment_id: Annotated[str, Field(pattern=r"^[a-z][a-z0-9.-]{1,63}$")]
    step: StepName | None = None
    reason: Reason
    reply: Annotated[str, Field(min_length=1, max_length=MAX_REPLY)]


def looks_personal(text: str) -> bool:
    return bool(EMAIL.search(text) or PHONE.search(text))


async def keep(db: AsyncSession, principal: Principal, body: FlagRequest) -> AiFlag:
    """Keep a flag, after the daily limit; old flags are deleted on the way."""
    await rate_limit.take(db, FLAGS_PER_PERSON, pseudonym(principal).hex())
    await db.execute(delete(AiFlag).where(AiFlag.at < datetime.now(UTC) - FLAG_RETENTION))
    flag = AiFlag(
        feature=body.feature.value,
        experiment_id=body.experiment_id,
        step=body.step,
        reason=body.reason,
        reply=body.reply,
    )
    db.add(flag)
    await db.flush()
    return flag
