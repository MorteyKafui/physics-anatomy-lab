"""The AI switches (docs/content/ai-quotas-brief.md, decision 4).

One switch for all AI and one per feature, under the server's AI_ENABLED. Staff change them in the
admin portal (app/routes/admin.py). Every AI request checks them, so they are read with a short
cache: a switch turned off takes effect within SWITCH_CACHE_SECONDS on every API process, and at
once on the process that changed it.
"""

import time
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.features import FeatureName
from app.models import AiSwitch

SwitchName = Literal["all", "tutor", "what-if", "report-review", "question-drafting"]
SWITCHES: tuple[SwitchName, ...] = ("all", "tutor", "what-if", "report-review", "question-drafting")
assert set(SWITCHES[1:]) == {f.value for f in FeatureName}
SWITCH_CACHE_SECONDS = 10.0

_read: tuple[float, frozenset[str]] | None = None


async def switched_off(db: AsyncSession) -> frozenset[str]:
    """The names of the switches that are off: "all" and any feature's."""
    global _read
    now = time.monotonic()
    if _read is not None and now - _read[0] < SWITCH_CACHE_SECONDS:
        return _read[1]
    names = await db.scalars(select(AiSwitch.name).where(AiSwitch.enabled.is_(False)))
    off = frozenset(names.all())
    _read = (now, off)
    return off


def forget() -> None:
    """Read the switches afresh next time (after a change on this process, and in tests)."""
    global _read
    _read = None
