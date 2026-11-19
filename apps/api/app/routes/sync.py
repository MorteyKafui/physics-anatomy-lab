"""Event sync: push the events the server lacks, pull the ones the device lacks (ADR 0039)."""

import json
import re
import uuid
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import ColumnElement, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.policy import SYNC_PULL_MAX_BYTES, SYNC_PULL_PAGE
from app.auth.sessions import CurrentPrincipal, Principal, Teacher
from app.db import Db
from app.models import Attempt, AttemptEvent
from app.sync_schemas import (
    AttemptBatch,
    AttemptHeader,
    PullResult,
    PushedAttempt,
    PushRequest,
    PushResult,
    SyncEvent,
)

router = APIRouter(prefix="/sync", tags=["sync"])
log = structlog.get_logger()


def _owner(principal: Principal) -> tuple[str, uuid.UUID]:
    """The owner column and id: a teacher's user id, or a student's class member id."""
    if isinstance(principal, Teacher):
        return "user_id", principal.user.id
    return "member_id", principal.member.id


def _owned_by(column: str, owner: uuid.UUID) -> ColumnElement[bool]:
    return (Attempt.user_id if column == "user_id" else Attempt.member_id) == owner


async def _attempt_row(
    db: AsyncSession, column: str, owner: uuid.UUID, header: AttemptHeader
) -> Attempt | None:
    """The owner's row for this attempt, created on first sight, or None if the header changed.
    The header never changes once stored."""
    values: dict[str, Any] = {
        column: owner,
        "client_id": header.id,
        "experiment_id": header.experiment_id,
        "mode": header.mode,
        "seed": header.seed,
        "format_version": header.format_version,
        "created_at_ms": header.created_at,
        "updated_at_ms": header.updated_at,
    }
    await db.execute(
        insert(Attempt)
        .values(**values)
        .on_conflict_do_nothing(
            index_elements=[column, "client_id"], index_where=text(f"{column} IS NOT NULL")
        )
    )
    row = await db.scalar(
        select(Attempt).where(_owned_by(column, owner), Attempt.client_id == header.id)
    )
    assert row is not None
    same = (row.experiment_id, row.mode, row.seed, row.format_version) == (
        header.experiment_id,
        header.mode,
        header.seed,
        header.format_version,
    )
    if not same:
        return None
    row.updated_at_ms = max(row.updated_at_ms, header.updated_at)
    return row


async def _push_one(
    db: AsyncSession, column: str, owner: uuid.UUID, batch: AttemptBatch
) -> PushedAttempt:
    row = await _attempt_row(db, column, owner, batch.attempt)
    if row is None:
        log.info("sync.conflict", owner_id=str(owner))
        return PushedAttempt(id=batch.attempt.id, new_events=0, status="conflict")
    new = 0
    if batch.events:
        inserted = await db.scalars(
            insert(AttemptEvent)
            .values(
                [
                    {
                        "attempt_id": row.id,
                        "owner_id": owner,
                        "event_id": e.id,
                        "seq": e.seq,
                        "device": e.device,
                        "at_ms": e.at,
                        "kind": e.kind,
                        "data": e.data,
                    }
                    for e in batch.events
                ]
            )
            .on_conflict_do_nothing(index_elements=["attempt_id", "event_id"])
            .returning(AttemptEvent.event_id)
        )
        new = len(inserted.all())
    return PushedAttempt(id=batch.attempt.id, new_events=new, status="ok")


@router.post("/push", responses={413: {"description": "The body is too large"}})
async def push(body: PushRequest, principal: CurrentPrincipal, db: Db) -> PushResult:
    """Store attempts and events from this device. Known events are skipped, so retrying is safe."""
    column, owner = _owner(principal)
    # One owner's pushes take turns, so each owner's cursor positions follow commit order and a
    # pull never skips an event that commits late (ADR 0039).
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtextextended(str(owner), 0))))
    results = [await _push_one(db, column, owner, batch) for batch in body.attempts]
    log.info(
        "sync.pushed",
        owner_id=str(owner),
        attempts=len(results),
        new_events=sum(r.new_events for r in results),
    )
    return PushResult(attempts=results)


def parse_cursor(after: str | None) -> int:
    if after is None or after == "":
        return 0
    if not re.fullmatch(r"[0-9]{1,18}", after):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Bad cursor.")
    return int(after)


@router.get("/pull")
async def pull(
    principal: CurrentPrincipal,
    db: Db,
    after: Annotated[str | None, Query(description="The cursor from the last pull.")] = None,
) -> PullResult:
    """This owner's events after the cursor, oldest first, with their attempts' headers."""
    column, owner = _owner(principal)
    since = parse_cursor(after)
    rows = (
        await db.execute(
            select(AttemptEvent, Attempt.client_id)
            .join(Attempt, Attempt.id == AttemptEvent.attempt_id)
            .where(AttemptEvent.owner_id == owner, AttemptEvent.pos > since)
            .order_by(AttemptEvent.pos)
            .limit(SYNC_PULL_PAGE + 1)
        )
    ).all()
    more = len(rows) > SYNC_PULL_PAGE
    rows = rows[:SYNC_PULL_PAGE]
    # Stop the page early once its data is large; the cursor makes the rest the next page.
    size = 0
    for i, (e, _) in enumerate(rows):
        size += len(json.dumps(e.data, separators=(",", ":"), ensure_ascii=False))
        if size > SYNC_PULL_MAX_BYTES and i > 0:
            rows, more = rows[:i], True
            break
    events = [
        SyncEvent(
            id=e.event_id,
            attempt_id=client_id,
            seq=e.seq,
            device=e.device,
            at=e.at_ms,
            kind=e.kind,
            data=e.data,
        )
        for e, client_id in rows
    ]
    attempt_ids = {e.attempt_id for e, _ in rows}
    headers = []
    if attempt_ids:
        found = await db.scalars(
            select(Attempt)
            .where(Attempt.id.in_(attempt_ids), _owned_by(column, owner))
            .order_by(Attempt.client_id)
        )
        headers = [
            AttemptHeader(
                id=a.client_id,
                experiment_id=a.experiment_id,
                mode=a.mode,  # pyright: ignore[reportArgumentType] (checked by the table)
                seed=a.seed,
                created_at=a.created_at_ms,
                updated_at=a.updated_at_ms,
                format_version=1,  # push accepts only format 1, so every stored row is 1
            )
            for a in found
        ]
    cursor = str(rows[-1][0].pos) if rows else str(since)
    return PullResult(attempts=headers, events=events, cursor=cursor, more=more)
