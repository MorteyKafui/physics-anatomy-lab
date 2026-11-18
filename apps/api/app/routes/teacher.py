"""What a teacher can read about their classes: members' attempts and events, and aggregates.

Every query starts from a class the teacher owns (`owned_class`, 404 otherwise) and joins
attempts through `class_members` of that class, so no id from the URL can reach another class's
work (ADR 0041). A teacher's own attempts are not in a class and never appear here.
"""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import text

from app.auth.policy import SYNC_PULL_PAGE
from app.auth.sessions import CurrentTeacher
from app.db import Db
from app.live.schemas import (
    AttemptEventsPage,
    ClassAttempt,
    ClassMistake,
    StepCount,
)
from app.routes.classes import NOT_FOUND, owned_class
from app.routes.sync import parse_cursor
from app.sync_schemas import SyncEvent

router = APIRouter(prefix="/classes", tags=["teacher"])

ATTEMPTS_LIMIT = 500
MISTAKES_LIMIT = 50
Experiment = Annotated[str | None, Query(max_length=200, description="Only this experiment.")]

# The step an attempt is on: its latest valid step.go-to in replay order (seq, device, id), as
# packages/engine orders events. The device's projection is the authority; this is the server's
# reading of the same events for lists and aggregates.
STEP_OF_ATTEMPT = """
    coalesce((
        SELECT e.data->>'step' FROM attempt_events e
        WHERE e.attempt_id = a.id AND e.kind = 'step.go-to'
          AND e.data->>'step' IN ('question', 'predict', 'build', 'check', 'measure',
                                  'tabulate', 'plot', 'analyse', 'conclude', 'report')
        ORDER BY e.seq DESC, e.device DESC, e.event_id DESC
        LIMIT 1
    ), 'question')
"""


@router.get("/{class_id}/attempts", responses=NOT_FOUND)
async def list_class_attempts(
    class_id: uuid.UUID, teacher: CurrentTeacher, db: Db, experiment_id: Experiment = None
) -> list[ClassAttempt]:
    """The class members' attempts, latest first, with the step each is on."""
    row = await owned_class(db, teacher, class_id)
    found = await db.execute(
        text(f"""
            SELECT a.id, a.member_id, m.display_name, a.client_id, a.experiment_id, a.mode,
                   a.created_at_ms, a.updated_at_ms,
                   (SELECT count(*) FROM attempt_events e WHERE e.attempt_id = a.id) AS events,
                   {STEP_OF_ATTEMPT} AS step
            FROM attempts a
            JOIN class_members m ON m.id = a.member_id
            WHERE m.class_id = :class_id
              AND (CAST(:experiment_id AS text) IS NULL OR a.experiment_id = :experiment_id)
            ORDER BY a.updated_at_ms DESC, a.id
            LIMIT :limit
        """),  # noqa: S608 (STEP_OF_ATTEMPT is a constant; values are bound)
        {"class_id": row.id, "experiment_id": experiment_id, "limit": ATTEMPTS_LIMIT},
    )
    return [
        ClassAttempt(
            id=r.id,
            member_id=r.member_id,
            display_name=r.display_name,
            client_id=r.client_id,
            experiment_id=r.experiment_id,
            mode=r.mode,
            created_at=r.created_at_ms,
            updated_at=r.updated_at_ms,
            events=r.events,
            step=r.step,
        )
        for r in found
    ]


@router.get(
    "/{class_id}/attempts/{attempt_id}/events",
    responses={404: {"description": "No such class or attempt of yours"}},
)
async def list_attempt_events(
    class_id: uuid.UUID,
    attempt_id: uuid.UUID,
    teacher: CurrentTeacher,
    db: Db,
    after: Annotated[str | None, Query(description="The cursor from the last page.")] = None,
) -> AttemptEventsPage:
    """One class member's attempt, as its events, oldest first, a page at a time."""
    row = await owned_class(db, teacher, class_id)
    client_id = await db.scalar(
        text("""
            SELECT a.client_id FROM attempts a
            JOIN class_members m ON m.id = a.member_id
            WHERE a.id = :attempt_id AND m.class_id = :class_id
        """),
        {"attempt_id": attempt_id, "class_id": row.id},
    )
    if client_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found.")
    since = parse_cursor(after)
    found = (
        await db.execute(
            text("""
                SELECT event_id, seq, device, at_ms, kind, data, pos FROM attempt_events
                WHERE attempt_id = :attempt_id AND pos > :since
                ORDER BY pos
                LIMIT :limit
            """),
            {"attempt_id": attempt_id, "since": since, "limit": SYNC_PULL_PAGE + 1},
        )
    ).all()
    more = len(found) > SYNC_PULL_PAGE
    found = found[:SYNC_PULL_PAGE]
    events = [
        SyncEvent(
            id=r.event_id,
            attempt_id=client_id,
            seq=r.seq,
            device=r.device,
            at=r.at_ms,
            kind=r.kind,
            data=r.data,
        )
        for r in found
    ]
    cursor = str(found[-1].pos) if found else str(since)
    return AttemptEventsPage(events=events, cursor=cursor, more=more)


@router.get("/{class_id}/mistakes", responses=NOT_FOUND)
async def list_class_mistakes(
    class_id: uuid.UUID, teacher: CurrentTeacher, db: Db, experiment_id: Experiment = None
) -> list[ClassMistake]:
    """The mistakes the coach has noticed in the class, by how many students made each."""
    row = await owned_class(db, teacher, class_id)
    found = await db.execute(
        text("""
            SELECT e.data->>'rule' AS rule, e.data->>'hint' AS key, e.data->>'skill' AS skill,
                   count(DISTINCT a.member_id) AS students, count(*) AS times
            FROM attempt_events e
            JOIN attempts a ON a.id = e.attempt_id
            JOIN class_members m ON m.id = a.member_id
            WHERE m.class_id = :class_id
              AND e.kind IN ('coach.hint', 'coach.note')
              AND jsonb_typeof(e.data->'rule') = 'string'
              AND jsonb_typeof(e.data->'hint') = 'string'
              AND (CAST(:experiment_id AS text) IS NULL OR a.experiment_id = :experiment_id)
            GROUP BY 1, 2, 3
            ORDER BY students DESC, times DESC, rule
            LIMIT :limit
        """),
        {"class_id": row.id, "experiment_id": experiment_id, "limit": MISTAKES_LIMIT},
    )
    return [
        ClassMistake(
            rule=r.rule, key=r.key, skill=r.skill or "", students=r.students, times=r.times
        )
        for r in found
    ]


@router.get("/{class_id}/progress", responses=NOT_FOUND)
async def get_class_progress(
    class_id: uuid.UUID,
    teacher: CurrentTeacher,
    db: Db,
    experiment_id: Annotated[str, Query(min_length=1, max_length=200)],
) -> list[StepCount]:
    """Who is on which step: each student's latest attempt at the experiment, counted by step."""
    row = await owned_class(db, teacher, class_id)
    params: dict[str, Any] = {"class_id": row.id, "experiment_id": experiment_id}
    found = await db.execute(
        text(f"""
            WITH latest AS (
                SELECT DISTINCT ON (a.member_id) a.id
                FROM attempts a
                JOIN class_members m ON m.id = a.member_id
                WHERE m.class_id = :class_id AND a.experiment_id = :experiment_id
                ORDER BY a.member_id, a.updated_at_ms DESC, a.id
            )
            SELECT step, count(*) AS students FROM (
                SELECT {STEP_OF_ATTEMPT} AS step FROM latest a
            ) s
            GROUP BY step
        """),  # noqa: S608 (STEP_OF_ATTEMPT is a constant; values are bound)
        params,
    )
    return [StepCount(step=r.step, students=r.students) for r in found]
