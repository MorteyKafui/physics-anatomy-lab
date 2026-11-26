"""Anonymous usage counts from the lab (ADR 0048).

Open without sign-in. A body over 32 KB is refused before it is parsed (`BodyLimit` in
app/main.py). The caller's address is used for the rate limit only, as a hash, and is never
stored with the events.
"""

import hashlib

from fastapi import APIRouter, Request, Response, status

from app.auth import rate_limit
from app.auth.policy import USAGE_EVENTS_PER_ADDRESS
from app.db import Db
from app.models import UsageEvent
from app.usage_schemas import UsageBatch

router = APIRouter(prefix="/usage", tags=["usage"])


def _subject(request: Request) -> str:
    """The rate limit's key: a hash of the address, so not even the counter holds it."""
    return hashlib.sha256(rate_limit.client_address(request).encode()).hexdigest()


@router.post(
    "/events",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={
        413: {"description": "The body is over 32 KB."},
        429: {"description": "More than 600 events from this address in the hour."},
    },
)
async def usage_events(request: Request, db: Db, batch: UsageBatch) -> Response:
    """Count a batch of 1 to 50 events. No sign-in; at most 600 events per address an hour."""
    counted = await rate_limit.record(
        db, USAGE_EVENTS_PER_ADDRESS, _subject(request), by=len(batch.events)
    )
    if counted > USAGE_EVENTS_PER_ADDRESS.hits:
        await db.commit()
        raise rate_limit.too_many(USAGE_EVENTS_PER_ADDRESS)
    db.add_all(
        UsageEvent(
            name=e.name,
            experiment_id=e.experiment_id,
            step=e.step,
            mode=e.mode,
            format=e.format,
            device=e.device,
            app_version=e.app_version,
            day_id=e.day_id,
        )
        for e in batch.events
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
