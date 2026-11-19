"""The admin API: staff only, behind Cloudflare Access (ADR 0040).

Every route depends on `require_staff`, set once on the router, so a new route cannot forget it.
Reads go through `ReadDb` (read-only, time-limited, the replica when there is one). Changes go
through `Db`, and each writes its audit entry in the same transaction.
"""

import csv
import io
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import queries as q
from app.admin.access import CurrentStaff, Staff, require_staff
from app.admin.audit import record
from app.admin.db import ReadDb
from app.admin.schemas import (
    AiFeatureUse,
    AiFlagChange,
    AiFlagRow,
    AiOverview,
    AiSwitchChange,
    AiSwitchState,
    AuditEntry,
    AuditPage,
    ClassAiChange,
    ClassRow,
    DisplayNameChange,
    EvalFailure,
    EvalSummary,
    ExperimentTotal,
    ExperimentUse,
    ExportRequest,
    FlaggedName,
    HintCount,
    Learning,
    MemberRow,
    Overview,
    RangeInfo,
    SkillSeries,
    StaffMe,
    StageCount,
    StepTime,
    StudentCounts,
    Summary,
    SystemInfo,
    TableSize,
    TeacherRow,
    Usage,
)
from app.ai.features import FEATURES, FeatureName
from app.ai.quotas import midnight
from app.ai.switches import SWITCHES, SwitchName, forget
from app.config import get_settings
from app.db import Db
from app.models import AiFlag, AiSwitch, ClassMember, SchoolClass

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_staff)])

RangeQuery = Annotated[q.Range, Query()]
ExperimentQuery = Annotated[str, Query(min_length=1, max_length=200)]
DEFAULT_EXPERIMENT = "simple-pendulum"
LIST_LIMIT = 500


def _dt(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=UTC)


def _info(range_: q.Range, w: q.Window) -> RangeInfo:
    return RangeInfo(
        range=range_,
        since=_dt(w.since_ms),
        until=_dt(w.until_ms),
        bucket_minutes=w.bucket_ms // 60_000,
    )


@router.get("/me")
def staff_me(staff: CurrentStaff) -> StaffMe:
    return StaffMe(email=staff.email, via=staff.via, environment=get_settings().environment)


@router.get("/summary")
async def admin_summary(db: ReadDb) -> Summary:
    """The sidebar's numbers, kept small because every page asks for them."""
    w = q.window("30d")
    flagged = await q.flagged_names(db, limit=100)
    return Summary(
        experiments=[ExperimentUse(**r) for r in await q.per_experiment(db, w)],
        flagged_names=len(flagged),
    )


@router.get("/overview")
async def admin_overview(db: ReadDb, range: RangeQuery = "7d") -> Overview:
    w = q.window(range)
    s = await q.students(db, w.until_ms)
    return Overview(
        window=_info(range, w),
        students=StudentCounts(
            members=s["members"], active_30_days=s["active"], teachers=s["teachers"]
        ),
        classes=await q.classes(db),  # pyright: ignore[reportArgumentType]
        reports=await q.reports_series(db, w),
        experiments=[ExperimentUse(**r) for r in await q.per_experiment(db, w)],
        stages_experiment=DEFAULT_EXPERIMENT,
        stages=[StageCount(**r) for r in await q.stages(db, DEFAULT_EXPERIMENT, w)],
        mistakes=[HintCount(**r) for r in await q.mistakes(db, w, limit=6)],
        flagged_names=[FlaggedName(**r) for r in await q.flagged_names(db)],
        database_bytes=await q.database_bytes(db),
    )


@router.get("/usage")
async def admin_usage(db: ReadDb, range: RangeQuery = "7d") -> Usage:
    w = q.window(range)
    return Usage(
        window=_info(range, w),
        experiments=[ExperimentUse(**r) for r in await q.per_experiment(db, w)],
        step_minutes=[StepTime(**r) for r in await q.step_minutes(db, w)],
    )


@router.get("/learning")
async def admin_learning(
    db: ReadDb,
    range: RangeQuery = "7d",
    experiment: ExperimentQuery = DEFAULT_EXPERIMENT,
) -> Learning:
    w = q.window(range)
    skills = await q.skills_series(db, w)
    return Learning(
        window=_info(range, w),
        experiment_id=experiment,
        stages=[StageCount(**r) for r in await q.stages(db, experiment, w)],
        mistakes=[HintCount(**r) for r in await q.mistakes(db, w)],
        skills=[SkillSeries(skill=k, hints=v) for k, v in skills.items()],
        experiments=[ExperimentUse(**r) for r in await q.per_experiment(db, w)],
    )


@router.get("/content")
async def admin_content(db: ReadDb) -> list[ExperimentTotal]:
    return [ExperimentTotal(**r) for r in await q.experiment_totals(db)]


@router.get("/people/teachers")
async def admin_teachers(db: ReadDb) -> list[TeacherRow]:
    return [TeacherRow(**r) for r in await q.teachers(db, LIST_LIMIT)]


@router.get("/people/classes")
async def admin_classes(db: ReadDb) -> list[ClassRow]:
    return [ClassRow(**r) for r in await q.class_list(db, LIST_LIMIT)]


@router.get("/people/classes/{class_id}/members")
async def admin_class_members(class_id: uuid.UUID, db: ReadDb) -> list[MemberRow]:
    return [MemberRow(**r) for r in await q.members(db, class_id)]


@router.get("/system")
async def admin_system(db: ReadDb) -> SystemInfo:
    d = await q.database(db)
    settings = get_settings()
    return SystemInfo(
        environment=settings.environment,
        api_version="0.0.0",
        database_bytes=d["bytes"],
        postgres=d["postgres"],
        migration=d["migration"],
        tables=[TableSize(**t) for t in d["tables"]],
        attempts_synced_per_day=await q.synced_per_day(db),
        replica=settings.admin_database_url is not None,
    )


@router.get("/audit")
async def admin_audit(
    db: ReadDb,
    before: uuid.UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AuditPage:
    rows = (
        await db.execute(
            text(
                """
                SELECT id, at, actor_email, actor_via, action, target_type, target_id, detail
                FROM admin_audit
                WHERE CAST(:before AS uuid) IS NULL
                   OR (at, id) < (SELECT at, id FROM admin_audit WHERE id = :before)
                ORDER BY at DESC, id DESC
                LIMIT :limit
                """
            ),
            {"before": before, "limit": limit + 1},
        )
    ).all()
    entries = [AuditEntry(**r._mapping) for r in rows[:limit]]  # pyright: ignore[reportPrivateUsage]
    return AuditPage(entries=entries, next_before=entries[-1].id if len(rows) > limit else None)


@router.post("/classes/{class_id}/ai")
async def admin_set_class_ai(
    class_id: uuid.UUID, body: ClassAiChange, db: Db, staff: CurrentStaff
) -> ClassRow:
    """Turn AI on or off for one class. Undo is the same call the other way."""
    school_class = await db.scalar(
        select(SchoolClass).where(SchoolClass.id == class_id).with_for_update()
    )
    if school_class is None:
        raise HTTPException(404, "No class with that id.")
    was = school_class.ai_enabled
    school_class.ai_enabled = body.enabled
    await record(
        db,
        staff,
        "class.ai.set",
        "class",
        class_id,
        {"enabled": body.enabled, "was": was, "reason": body.reason},
    )
    [row] = await q.class_list(db, 1, class_id)
    return ClassRow(**row)


def _uses(rows: list[dict[str, Any]]) -> list[AiFeatureUse]:
    by = {r["feature"]: r for r in rows}
    empty = {"requests": 0, "cost_microdollars": 0, "held": 0, "cached": 0}
    return [
        AiFeatureUse(
            feature=name,
            **{k: int(v) for k, v in by.get(name.value, empty).items() if k != "feature"},
        )
        for name in FeatureName
    ]


async def _switches(db: Any) -> list[AiSwitchState]:
    stored = await q.ai_switches(db)
    settings = get_settings()
    out: list[AiSwitchState] = []
    for name in SWITCHES:
        row = stored.get(name, {})
        feature = None if name == "all" else FEATURES[FeatureName(name)]
        out.append(
            AiSwitchState(
                name=name,
                enabled=row.get("enabled", True),
                model=None if feature is None else feature.model(settings),
                teachers_only=feature is not None and not feature.students,
                changed_at=row.get("changed_at"),
            )
        )
    return out


EVAL_RESULTS = Path(__file__).parents[2] / "evals" / "results"
EVAL_BAR = 0.9
FLAG_LIST = 50


def _evaluations() -> list[EvalSummary]:
    """The committed results of the evaluation suite, as this deployment's code holds them."""
    out: list[EvalSummary] = []
    for name in FeatureName:
        path = EVAL_RESULTS / f"{name.value}.json"
        if not path.exists():
            out.append(
                EvalSummary(
                    feature=name,
                    cases=0,
                    run_at=None,
                    rate=None,
                    bar=EVAL_BAR,
                    passed=None,
                    failing=[],
                )
            )
            continue
        data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        cases: list[dict[str, Any]] = data.get("cases", [])
        failing = [
            EvalFailure(
                id=str(c["id"]),
                why="; ".join(
                    [k for k, ok in c.get("rules", {}).items() if not ok]
                    + [str(v["reason"]) for v in c.get("lines", []) if not v["pass"]]
                ),
            )
            for c in cases
            if not c.get("passed", False)
        ]
        out.append(
            EvalSummary(
                feature=name,
                cases=len(cases),
                run_at=datetime.fromisoformat(data["run_at"]),
                rate=float(data["rate"]),
                bar=float(data.get("bar", EVAL_BAR)),
                passed=bool(data["passed"]),
                failing=failing,
            )
        )
    return out


def _flag_row(f: AiFlag) -> AiFlagRow:
    return AiFlagRow(
        id=f.id,
        at=f.at,
        feature=FeatureName(f.feature),
        experiment_id=f.experiment_id,
        step=f.step,
        reason=f.reason,  # type: ignore[arg-type]
        reply=f.reply,
        dismissed=f.dismissed_at is not None,
    )


@router.get("/ai")
async def admin_ai(db: ReadDb, range: RangeQuery = "7d") -> AiOverview:
    """Requests, spend, the cache and held replies, by feature; and the switches."""
    settings = get_settings()
    w = q.window(range)
    today_ms = int(midnight().timestamp() * 1000)
    budget = settings.ai_daily_budget_usd
    budget_micro = None if budget is None else round(budget * 1_000_000)
    reached = (
        None if budget_micro is None else await q.ai_budget_reached_at(db, today_ms, budget_micro)
    )
    return AiOverview(
        range=_info(range, w),
        today=_uses(await q.ai_use(db, today_ms)),
        by_feature=_uses(await q.ai_use(db, w.since_ms)),
        budget_microdollars=budget_micro,
        budget_reached_at=reached,
        switches=await _switches(db),
        evaluations=_evaluations(),
        flags=[
            _flag_row(f)
            for f in await db.scalars(
                select(AiFlag)
                .where(AiFlag.dismissed_at.is_(None))
                .order_by(AiFlag.at.desc())
                .limit(FLAG_LIST)
            )
        ],
        flags_open=await db.scalar(
            select(func.count()).select_from(AiFlag).where(AiFlag.dismissed_at.is_(None))
        )
        or 0,
        server_enabled=settings.ai_enabled,
        configured=settings.anthropic_api_key is not None,
    )


@router.post("/ai/switches/{name}")
async def admin_set_ai_switch(
    name: SwitchName, body: AiSwitchChange, db: Db, staff: CurrentStaff
) -> list[AiSwitchState]:
    """Turn all AI, or one feature, on or off for everyone. Undo is the same call the other way.
    Takes effect at once on this API process and within 10 seconds on the others."""
    was = await db.scalar(select(AiSwitch.enabled).where(AiSwitch.name == name).with_for_update())
    await db.execute(
        insert(AiSwitch)
        .values(name=name, enabled=body.enabled)
        .on_conflict_do_update(
            index_elements=[AiSwitch.name],
            set_={"enabled": body.enabled, "changed_at": text("now()")},
        )
    )
    await record(
        db,
        staff,
        "ai.switch.set",
        "ai-switch",
        None,
        {
            "name": name,
            "enabled": body.enabled,
            "was": True if was is None else was,
            "reason": body.reason,
        },
    )
    forget()
    return await _switches(db)


async def _set_flag(
    flag_id: uuid.UUID, dismissed: bool, reason: str | None, db: AsyncSession, staff: Staff
) -> AiFlagRow:
    flag = await db.scalar(select(AiFlag).where(AiFlag.id == flag_id).with_for_update())
    if flag is None:
        raise HTTPException(404, "No flag with that id.")
    flag.dismissed_at = datetime.now(UTC) if dismissed else None
    await record(
        db,
        staff,
        "ai.flag.dismiss" if dismissed else "ai.flag.restore",
        "ai-flag",
        flag_id,
        {"feature": flag.feature, "flag_reason": flag.reason, "reason": reason},
    )
    return _flag_row(flag)


@router.post("/ai/flags/{flag_id}/dismiss")
async def admin_dismiss_flag(
    flag_id: uuid.UUID, body: AiFlagChange, db: Db, staff: CurrentStaff
) -> AiFlagRow:
    """Set a flagged reply aside. Undo is the restore call."""
    return await _set_flag(flag_id, True, body.reason, db, staff)


@router.post("/ai/flags/{flag_id}/restore")
async def admin_restore_flag(
    flag_id: uuid.UUID, body: AiFlagChange, db: Db, staff: CurrentStaff
) -> AiFlagRow:
    return await _set_flag(flag_id, False, body.reason, db, staff)


@router.post("/members/{member_id}/display-name")
async def admin_replace_display_name(
    member_id: uuid.UUID, body: DisplayNameChange, db: Db, staff: CurrentStaff
) -> MemberRow:
    """Replace a student's display name (safeguarding). The student keeps all their work.

    The audit entry records that the name was replaced and why, never the old or new name: an old
    name flagged as contact details must not be kept anywhere.
    """
    member = await db.scalar(
        select(ClassMember).where(ClassMember.id == member_id).with_for_update()
    )
    if member is None:
        raise HTTPException(404, "No student with that id.")
    try:
        async with db.begin_nested():
            member.display_name = body.display_name
            await db.flush()
    except IntegrityError as error:
        raise HTTPException(409, "Someone in that class already has that name.") from error
    await record(
        db, staff, "member.display-name.replace", "member", member_id, {"reason": body.reason}
    )
    rows = await q.members(db, member.class_id)
    return MemberRow(**next(r for r in rows if r["id"] == member_id))


FORMULA_START = ("=", "+", "-", "@", chr(9), chr(13))  # chr(9) is a tab, chr(13) a carriage return


def _csv(header: list[str], rows: list[list[Any]]) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(header)
    for row in rows:
        # A cell starting with = + - @, a tab or a carriage return runs as a spreadsheet formula.
        writer.writerow(
            ["'" + c if isinstance(c, str) and c.startswith(FORMULA_START) else c for c in row]
        )
    return out.getvalue()


@router.post("/exports", response_class=Response)
async def admin_export(body: ExportRequest, read: ReadDb, db: Db, staff: CurrentStaff) -> Response:
    """Download a table as CSV. Counts and class details only; never student names."""
    w = q.window(body.range)
    experiment = body.experiment_id or DEFAULT_EXPERIMENT
    if body.report == "mistakes":
        found = await q.mistakes(read, w, body.experiment_id, limit=500)
        header = ["experiment", "hint", "rule", "skill", "students", "attempts", "hints"]
        rows = [
            [
                m["experiment_id"],
                m["hint"],
                m["rule"],
                m["skill"],
                m["students"],
                m["attempts"],
                m["hints"],
            ]
            for m in found
        ]
    elif body.report == "stages":
        header = ["experiment", "step", "attempts", "students"]
        rows = [
            [experiment, s["step"], s["attempts"], s["students"]]
            for s in await q.stages(read, experiment, w)
        ]
    else:
        header = ["class", "code", "teacher", "students", "ai_on", "joining_open", "created"]
        rows = [
            [
                c["name"],
                c["code"],
                c["teacher_name"],
                c["members"],
                c["ai_enabled"],
                c["joining_open"],
                c["created_at"].isoformat(),
            ]
            for c in await q.class_list(read, LIST_LIMIT)
        ]
    await record(
        db,
        staff,
        "export.create",
        detail={
            "report": body.report,
            "range": body.range,
            "experiment_id": body.experiment_id,
            "rows": len(rows),
        },
    )
    name = f"physics-anatomy-{body.report}-{body.range}.csv"
    return Response(
        _csv(header, rows),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )
