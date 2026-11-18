"""The admin portal's aggregates, worked out from the tables on each request (ADR 0040).

Each query counts; none returns a student's events or readings. Students appear only as counts,
except where staff must act on one (a flagged display name), and then only by display name.

Times: an event's `at_ms` is the device's clock when it was recorded, so "last 7 days" means
events recorded in the last 7 days, whenever they synced. Step and hint counts come straight from
the synced events; the lab's step machine (packages/engine) is the authority on what an attempt
means, and these charts are a close count of it, not a replay.
"""

import itertools
import time
import uuid
from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

Range = Literal["24h", "7d", "30d"]

HOUR_MS = 3_600_000
DAY_MS = 24 * HOUR_MS
# Each range, and the width of one bar in its small charts.
RANGES: dict[str, tuple[int, int]] = {
    "24h": (DAY_MS, HOUR_MS),
    "7d": (7 * DAY_MS, DAY_MS),
    "30d": (30 * DAY_MS, DAY_MS),
}
ACTIVE_WINDOW_MS = 30 * DAY_MS

# The ten steps of an attempt, in order (packages/engine/src/steps/machine.ts, GLOSSARY.md).
STEPS = (
    "question",
    "predict",
    "build",
    "check",
    "measure",
    "tabulate",
    "plot",
    "analyse",
    "conclude",
    "report",
)
SKILLS = ("apparatus", "measurement", "tabulation", "graph", "analysis", "writing")

# Display names are checked when a student joins (no emails, fewer than 7 digits). These look for
# what the check lets through but staff should still see: a run of digits, or a social handle.
FLAGGED_NAME_SQL = r"(\d.*){5}|^@|(whatsapp|snapchat|insta|tiktok|facebook|telegram)"


def now_ms() -> int:
    return int(time.time() * 1000)


@dataclass(frozen=True)
class Window:
    since_ms: int
    until_ms: int
    bucket_ms: int

    @property
    def buckets(self) -> int:
        return (self.until_ms - self.since_ms + self.bucket_ms - 1) // self.bucket_ms


def window(range_: Range, at_ms: int | None = None) -> Window:
    length, bucket = RANGES[range_]
    until = now_ms() if at_ms is None else at_ms
    return Window(since_ms=until - length, until_ms=until, bucket_ms=bucket)


def _series(rows: list[Any], w: Window) -> list[int]:
    out = [0] * w.buckets
    for row in rows:
        i = int(row.bucket)
        if 0 <= i < len(out):
            out[i] += int(row.n)
    return out


async def students(db: AsyncSession, at_ms: int) -> dict[str, int]:
    row = (
        await db.execute(
            text(
                """
                SELECT
                  (SELECT count(*) FROM class_members) AS members,
                  (SELECT count(DISTINCT member_id) FROM attempts
                    WHERE member_id IS NOT NULL AND updated_at_ms >= :since) AS active,
                  (SELECT count(*) FROM users) AS teachers
                """
            ),
            {"since": at_ms - ACTIVE_WINDOW_MS},
        )
    ).one()
    return {"members": row.members, "active": row.active, "teachers": row.teachers}


async def classes(db: AsyncSession) -> dict[str, int]:
    row = (
        await db.execute(
            text(
                """
                SELECT count(*) AS total,
                       count(*) FILTER (WHERE ai_enabled) AS ai_on,
                       count(*) FILTER (WHERE joining_open) AS joining_open
                FROM classes
                """
            )
        )
    ).one()
    return {"total": row.total, "ai_on": row.ai_on, "joining_open": row.joining_open}


async def reports_series(db: AsyncSession, w: Window) -> list[int]:
    rows = (
        await db.execute(
            text(
                """
                SELECT (at_ms - :since) / :bucket AS bucket, count(DISTINCT attempt_id) AS n
                FROM attempt_events
                WHERE kind = 'step.complete' AND data->>'step' = 'report'
                  AND at_ms >= :since AND at_ms < :until
                GROUP BY 1
                """
            ),
            {"since": w.since_ms, "until": w.until_ms, "bucket": w.bucket_ms},
        )
    ).all()
    return _series(list(rows), w)


async def per_experiment(db: AsyncSession, w: Window) -> list[dict[str, Any]]:
    """Attempts started in the window per experiment and mode, and how many reached the report."""
    rows = (
        await db.execute(
            text(
                """
                SELECT a.experiment_id, a.mode,
                       count(*) AS attempts,
                       count(DISTINCT a.owner_id) AS students,
                       count(*) FILTER (WHERE EXISTS (
                         SELECT 1 FROM attempt_events e
                         WHERE e.attempt_id = a.id AND e.kind = 'step.complete'
                           AND e.data->>'step' = 'report')) AS reports,
                       count(*) FILTER (WHERE (
                         SELECT count(DISTINCT e.device) FROM attempt_events e
                         WHERE e.attempt_id = a.id) > 1) AS multi_device
                FROM attempts a
                WHERE a.created_at_ms >= :since AND a.created_at_ms < :until
                GROUP BY 1, 2
                ORDER BY 1, 2
                """
            ),
            {"since": w.since_ms, "until": w.until_ms},
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]


async def stages(db: AsyncSession, experiment_id: str, w: Window) -> list[dict[str, Any]]:
    """Of the attempts started in the window, how many reached each step.

    Every attempt reaches Question; an attempt reaches a later step once it has completed the one
    before it.
    """
    params = {"experiment": experiment_id, "since": w.since_ms, "until": w.until_ms}
    cohort = (
        await db.execute(
            text(
                """
                SELECT count(*) AS attempts, count(DISTINCT owner_id) AS students FROM attempts
                WHERE experiment_id = :experiment
                  AND created_at_ms >= :since AND created_at_ms < :until
                """
            ),
            params,
        )
    ).one()
    rows = (
        await db.execute(
            text(
                """
                SELECT e.data->>'step' AS step,
                       count(DISTINCT a.id) AS attempts,
                       count(DISTINCT a.owner_id) AS students
                FROM attempts a
                JOIN attempt_events e ON e.attempt_id = a.id AND e.owner_id = a.owner_id
                WHERE a.experiment_id = :experiment
                  AND a.created_at_ms >= :since AND a.created_at_ms < :until
                  AND e.kind = 'step.complete'
                GROUP BY 1
                """
            ),
            params,
        )
    ).all()
    completed = {r.step: (r.attempts, r.students) for r in rows}
    out = [{"step": STEPS[0], "attempts": cohort.attempts, "students": cohort.students}]
    for previous, step in itertools.pairwise(STEPS):
        attempts, students_ = completed.get(previous, (0, 0))
        out.append({"step": step, "attempts": attempts, "students": students_})
    return out


async def step_minutes(db: AsyncSession, w: Window) -> list[dict[str, Any]]:
    """The median time spent on each step, per experiment: from the end of the step before."""
    rows = (
        await db.execute(
            text(
                """
                WITH done AS (
                  SELECT a.experiment_id, e.data->>'step' AS step,
                         e.at_ms - coalesce(
                           lag(e.at_ms) OVER (PARTITION BY a.id ORDER BY e.at_ms, e.seq),
                           a.created_at_ms) AS spent_ms
                  FROM attempts a
                  JOIN attempt_events e ON e.attempt_id = a.id AND e.owner_id = a.owner_id
                  WHERE a.created_at_ms >= :since AND a.created_at_ms < :until
                    AND e.kind = 'step.complete'
                )
                SELECT experiment_id, step, count(*) AS n,
                       percentile_cont(0.5) WITHIN GROUP (ORDER BY spent_ms) / 60000.0 AS minutes
                FROM done WHERE spent_ms >= 0
                GROUP BY 1, 2
                """
            ),
            {"since": w.since_ms, "until": w.until_ms},
        )
    ).all()
    return [
        {"experiment_id": r.experiment_id, "step": r.step, "n": r.n, "minutes": float(r.minutes)}
        for r in rows
        if r.step in STEPS
    ]


async def mistakes(
    db: AsyncSession, w: Window, experiment_id: str | None = None, limit: int = 50
) -> list[dict[str, Any]]:
    """The hints the coach showed most, by how many students needed each."""
    rows = (
        await db.execute(
            text(
                """
                SELECT a.experiment_id, e.data->>'hint' AS hint, e.data->>'rule' AS rule,
                       e.data->>'skill' AS skill,
                       count(DISTINCT a.owner_id) AS students,
                       count(DISTINCT a.id) AS attempts,
                       count(*) AS hints
                FROM attempt_events e
                JOIN attempts a ON a.id = e.attempt_id AND a.owner_id = e.owner_id
                WHERE e.kind = 'coach.hint' AND e.at_ms >= :since AND e.at_ms < :until
                  AND (CAST(:experiment AS text) IS NULL OR a.experiment_id = :experiment)
                  AND e.data->>'hint' IS NOT NULL
                GROUP BY 1, 2, 3, 4
                ORDER BY students DESC, hints DESC, hint
                LIMIT :limit
                """
            ),
            {
                "since": w.since_ms,
                "until": w.until_ms,
                "experiment": experiment_id,
                "limit": limit,
            },
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]


async def skills_series(db: AsyncSession, w: Window) -> dict[str, list[int]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT data->>'skill' AS skill, (at_ms - :since) / :bucket AS bucket,
                       count(*) AS n
                FROM attempt_events
                WHERE kind = 'coach.hint' AND at_ms >= :since AND at_ms < :until
                GROUP BY 1, 2
                """
            ),
            {"since": w.since_ms, "until": w.until_ms, "bucket": w.bucket_ms},
        )
    ).all()
    return {s: _series([r for r in rows if r.skill == s], w) for s in SKILLS}


async def flagged_names(db: AsyncSession, limit: int = 20) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT m.id AS member_id, m.display_name, m.created_at,
                       c.id AS class_id, c.code AS class_code, c.name AS class_name
                FROM class_members m JOIN classes c ON c.id = m.class_id
                WHERE m.display_name::text ~* :pattern
                ORDER BY m.created_at DESC
                LIMIT :limit
                """
            ),
            {"pattern": FLAGGED_NAME_SQL, "limit": limit},
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]


async def database(db: AsyncSession) -> dict[str, Any]:
    row = (
        await db.execute(
            text(
                """
                SELECT pg_database_size(current_database()) AS bytes,
                       (SELECT version_num FROM alembic_version LIMIT 1) AS migration,
                       current_setting('server_version') AS postgres
                """
            )
        )
    ).one()
    tables = (
        await db.execute(
            text(
                """
                SELECT c.relname AS name, coalesce(st.n_live_tup, 0) AS rows,
                       pg_total_relation_size(c.oid) AS bytes
                FROM pg_class c
                LEFT JOIN pg_stat_user_tables st ON st.relid = c.oid
                WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
                  AND c.relname <> 'alembic_version'
                ORDER BY c.relname
                """
            )
        )
    ).all()
    return {
        "bytes": row.bytes,
        "migration": row.migration,
        "postgres": row.postgres,
        "tables": [dict(t._mapping) for t in tables],  # pyright: ignore[reportPrivateUsage]
    }


async def synced_per_day(db: AsyncSession, days: int = 14) -> list[int]:
    """Attempts that reached the server for the first time, per day, oldest first."""
    rows = (
        await db.execute(
            text(
                """
                SELECT (current_date - received_at::date) AS ago, count(*) AS n
                FROM attempts
                WHERE received_at >= current_date - CAST(:days AS integer) + 1
                GROUP BY 1
                """
            ),
            {"days": days},
        )
    ).all()
    out = [0] * days
    for r in rows:
        ago = int(r.ago)
        if 0 <= ago < days:
            out[days - 1 - ago] = int(r.n)
    return out


async def teachers(db: AsyncSession, limit: int) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT u.id, u.email, u.display_name, u.created_at, u.last_signed_in_at,
                       count(c.id) AS classes
                FROM users u LEFT JOIN classes c ON c.teacher_id = u.id
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]


async def class_list(db: AsyncSession, limit: int) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT c.id, c.name, c.code, c.ai_enabled, c.joining_open, c.created_at,
                       u.display_name AS teacher_name,
                       (SELECT count(*) FROM class_members m WHERE m.class_id = c.id) AS members
                FROM classes c JOIN users u ON u.id = c.teacher_id
                ORDER BY c.created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]


async def members(db: AsyncSession, class_id: uuid.UUID) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT m.id, m.display_name, m.created_at,
                       (SELECT count(*) FROM attempts a WHERE a.member_id = m.id) AS attempts
                FROM class_members m WHERE m.class_id = :class_id
                ORDER BY m.display_name
                """
            ),
            {"class_id": class_id},
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]


async def experiment_totals(db: AsyncSession) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            text(
                """
                SELECT experiment_id, count(*) AS attempts, count(DISTINCT owner_id) AS students,
                       max(updated_at_ms) AS last_used_ms
                FROM attempts GROUP BY 1 ORDER BY 1
                """
            )
        )
    ).all()
    return [dict(r._mapping) for r in rows]  # pyright: ignore[reportPrivateUsage]
