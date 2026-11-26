"""Classes for teachers, and joining one with a class code for students (ADR 0038)."""

import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import consents
from app.auth import rate_limit
from app.auth.codes import (
    hash_secret,
    is_code,
    new_class_code,
    new_rejoin_code,
    normalise_code,
    show_code,
)
from app.auth.policy import (
    CLASS_CODE_LENGTH,
    CLASS_MEMBER_LIMIT,
    REJOIN_CODE_LENGTH,
    REJOIN_CODE_LIFETIME,
    WRONG_CODES_PER_ADDRESS,
)
from app.auth.sessions import CurrentTeacher, end_member_sessions, start_student_session
from app.auth.turnstile import HumanCheckDep, require_human
from app.db import Db
from app.models import ClassMember, RejoinCode, SchoolClass, User
from app.routes.auth import student_me
from app.schemas import (
    ClassCreate,
    ClassOut,
    ClassUpdate,
    JoinPreview,
    JoinPreviewRequest,
    JoinRequest,
    MemberOut,
    RejoinCodeOut,
    RejoinRequest,
    StudentMe,
)

log = structlog.get_logger()
Responses = dict[int | str, dict[str, Any]]

teacher_router = APIRouter(prefix="/classes", tags=["classes"])
join_router = APIRouter(prefix="/join", tags=["join"])

NOT_FOUND: Responses = {404: {"description": "No such class of yours"}}


def class_out(row: SchoolClass) -> ClassOut:
    return ClassOut(
        id=row.id,
        name=row.name,
        code=show_code(row.code),
        joining_open=row.joining_open,
        ai_enabled=row.ai_enabled,
        created_at=row.created_at,
        code_changed_at=row.code_changed_at,
    )


async def owned_class(
    db: AsyncSession, teacher: CurrentTeacher, class_id: uuid.UUID
) -> SchoolClass:
    """The class, if this teacher owns it. Anyone else's class is simply not found."""
    row = await db.scalar(
        select(SchoolClass).where(
            SchoolClass.id == class_id, SchoolClass.teacher_id == teacher.user.id
        )
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Class not found.")
    return row


async def _unused_class_code(db: AsyncSession) -> str:
    for _ in range(10):
        code = new_class_code()
        taken = await db.scalar(select(SchoolClass.id).where(SchoolClass.code == code))
        if taken is None:
            return code
    raise RuntimeError("Could not find an unused class code.")  # 887 million codes; never


# Teachers


@teacher_router.post("", status_code=status.HTTP_201_CREATED)
async def create_class(body: ClassCreate, teacher: CurrentTeacher, db: Db) -> ClassOut:
    """Create a class. The teacher confirms the school's permission (ADR 0011); AI starts off."""
    now = datetime.now(UTC)
    for _ in range(3):
        row = SchoolClass(
            teacher_id=teacher.user.id,
            name=body.name,
            code=await _unused_class_code(db),
            school_permission_confirmed_at=now,
        )
        try:
            async with db.begin_nested():
                db.add(row)
        except IntegrityError:
            continue  # another class took the code a moment ago
        await db.refresh(row)
        log.info("class.created", class_id=str(row.id), user_id=str(teacher.user.id))
        return class_out(row)
    raise RuntimeError("Could not create the class.")


@teacher_router.get("")
async def list_classes(teacher: CurrentTeacher, db: Db) -> list[ClassOut]:
    rows = await db.scalars(
        select(SchoolClass)
        .where(SchoolClass.teacher_id == teacher.user.id)
        .order_by(SchoolClass.created_at.desc())
    )
    return [class_out(row) for row in rows]


@teacher_router.get("/{class_id}", responses=NOT_FOUND)
async def get_class(class_id: uuid.UUID, teacher: CurrentTeacher, db: Db) -> ClassOut:
    return class_out(await owned_class(db, teacher, class_id))


@teacher_router.patch("/{class_id}", responses=NOT_FOUND)
async def update_class(
    class_id: uuid.UUID, body: ClassUpdate, teacher: CurrentTeacher, db: Db
) -> ClassOut:
    """Rename the class, open or close joining, or turn AI help on or off (ADR 0008)."""
    row = await owned_class(db, teacher, class_id)
    if body.name is not None:
        row.name = body.name
    if body.joining_open is not None:
        row.joining_open = body.joining_open
    if body.ai_enabled is not None:
        row.ai_enabled = body.ai_enabled
    await db.flush()
    log.info("class.updated", class_id=str(row.id), user_id=str(teacher.user.id))
    return class_out(row)


@teacher_router.post("/{class_id}/code", responses=NOT_FOUND)
async def rotate_class_code(class_id: uuid.UUID, teacher: CurrentTeacher, db: Db) -> ClassOut:
    """Give the class a new code. The old one stops working; students already in stay in."""
    row = await owned_class(db, teacher, class_id)
    row.code = await _unused_class_code(db)
    row.code_changed_at = datetime.now(UTC)
    await db.flush()
    log.info("class.code_rotated", class_id=str(row.id), user_id=str(teacher.user.id))
    return class_out(row)


@teacher_router.get("/{class_id}/members", responses=NOT_FOUND)
async def list_members(class_id: uuid.UUID, teacher: CurrentTeacher, db: Db) -> list[MemberOut]:
    row = await owned_class(db, teacher, class_id)
    members = await db.scalars(
        select(ClassMember).where(ClassMember.class_id == row.id).order_by(ClassMember.display_name)
    )
    return [
        MemberOut(id=m.id, display_name=m.display_name, created_at=m.created_at) for m in members
    ]


@teacher_router.post(
    "/{class_id}/members/{member_id}/rejoin-code",
    status_code=status.HTTP_201_CREATED,
    responses=NOT_FOUND,
)
async def issue_rejoin_code(
    class_id: uuid.UUID, member_id: uuid.UUID, teacher: CurrentTeacher, db: Db
) -> RejoinCodeOut:
    """A one-time personal code for a student who lost their device. Replaces any earlier one."""
    row = await owned_class(db, teacher, class_id)
    member = await db.scalar(
        select(ClassMember).where(ClassMember.id == member_id, ClassMember.class_id == row.id)
    )
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")
    await db.execute(
        delete(RejoinCode).where(RejoinCode.member_id == member.id, RejoinCode.used_at.is_(None))
    )
    code = new_rejoin_code()
    expires_at = datetime.now(UTC) + REJOIN_CODE_LIFETIME
    db.add(
        RejoinCode(
            member_id=member.id,
            code_hash=hash_secret(code),
            created_by=teacher.user.id,
            expires_at=expires_at,
        )
    )
    log.info("class.rejoin_code_issued", member_id=str(member.id), user_id=str(teacher.user.id))
    return RejoinCodeOut(code=show_code(code), expires_at=expires_at)


# Students


async def _count_try(db: AsyncSession, request: Request) -> None:
    """Count this try against the network address before looking, so parallel guesses queue on
    the counter's row. A right code is forgiven; a wrong one stays counted."""
    await rate_limit.take(db, WRONG_CODES_PER_ADDRESS, rate_limit.client_address(request))


async def _forgive_try(db: AsyncSession, request: Request) -> None:
    await rate_limit.forgive(db, WRONG_CODES_PER_ADDRESS, rate_limit.client_address(request))


async def _wrong_code(db: AsyncSession) -> HTTPException:
    """Keep the count of this wrong try, and refuse."""
    await db.commit()
    log.info("join.wrong_code")
    return HTTPException(
        status.HTTP_404_NOT_FOUND,
        detail="We couldn't find that code. Check it with your teacher.",
    )


async def _open_class(db: AsyncSession, request: Request, typed: str) -> SchoolClass:
    await _count_try(db, request)
    code = normalise_code(typed)
    row = None
    if is_code(code, CLASS_CODE_LENGTH):
        row = await db.scalar(select(SchoolClass).where(SchoolClass.code == code))
    if row is None:
        raise await _wrong_code(db)
    await _forgive_try(db, request)
    if not row.joining_open:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="This class isn't taking new students. Ask your teacher.",
        )
    return row


CLASS_FULL = "This class is full. Ask your teacher."


async def _refuse_if_full(db: AsyncSession, row: SchoolClass) -> None:
    """A class has at most CLASS_MEMBER_LIMIT students (ASVS review, finding D)."""
    members = await db.scalar(
        select(func.count()).select_from(ClassMember).where(ClassMember.class_id == row.id)
    )
    if (members or 0) >= CLASS_MEMBER_LIMIT:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=CLASS_FULL)


CODE_ERRORS: Responses = {
    404: {"description": "No class has this code"},
    409: {"description": "Joining is closed, the class is full, or the name is taken"},
    429: {"description": "Too many wrong codes"},
}


@join_router.post("/preview", responses=CODE_ERRORS)
async def preview_class(body: JoinPreviewRequest, request: Request, db: Db) -> JoinPreview:
    """What a student sees before joining: the class, its teacher, and whether AI help is on.
    The code goes in the body, never the address, so it stays out of logs and history."""
    row = await _open_class(db, request, body.code)
    await _refuse_if_full(db, row)
    teacher_name = await db.scalar(select(User.display_name).where(User.id == row.teacher_id))
    return JoinPreview(class_name=row.name, teacher_name=teacher_name, ai_enabled=row.ai_enabled)


@join_router.post("", status_code=status.HTTP_201_CREATED, responses=CODE_ERRORS)
async def join_class(
    body: JoinRequest, request: Request, response: Response, db: Db, human: HumanCheckDep
) -> StudentMe:
    """Join with a class code and a display name. No email, age or phone number (ADR 0011)."""
    await require_human(human, body.turnstile_token, request)
    row = await _open_class(db, request, body.code)
    # Joins to one class take turns here, so two at once cannot both take the last place.
    await db.execute(select(SchoolClass.id).where(SchoolClass.id == row.id).with_for_update())
    await _refuse_if_full(db, row)
    member = ClassMember(class_id=row.id, display_name=body.display_name)
    try:
        async with db.begin_nested():
            db.add(member)
    except IntegrityError as error:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Someone in this class already uses that name. Pick another.",
        ) from error
    await db.refresh(member)
    # The join screen's tick box: agreeing to the current terms and privacy policy (ADR 0042).
    await consents.record_required(db, member_id=member.id, via="join")
    log.info("join.joined", class_id=str(row.id), member_id=str(member.id))
    await start_student_session(db, request, response, member)
    return student_me(member, row)


@join_router.post("/rejoin", responses=CODE_ERRORS)
async def rejoin(
    body: RejoinRequest, request: Request, response: Response, db: Db, human: HumanCheckDep
) -> StudentMe:
    """Sign back in with a teacher's re-join code. Ends the student's other sessions."""
    await require_human(human, body.turnstile_token, request)
    await _count_try(db, request)
    code = normalise_code(body.code)
    now = datetime.now(UTC)
    member_id = None
    if is_code(code, REJOIN_CODE_LENGTH):
        member_id = await db.scalar(
            update(RejoinCode)
            .where(
                RejoinCode.code_hash == hash_secret(code),
                RejoinCode.used_at.is_(None),
                RejoinCode.expires_at > now,
            )
            .values(used_at=now)
            .returning(RejoinCode.member_id)
        )
    found = None
    if member_id is not None:
        found = (
            await db.execute(
                select(ClassMember, SchoolClass)
                .join(SchoolClass, SchoolClass.id == ClassMember.class_id)
                .where(ClassMember.id == member_id)
            )
        ).one_or_none()
    if found is None:
        raise await _wrong_code(db)
    await _forgive_try(db, request)
    member, school_class = found
    await end_member_sessions(db, member.id)
    await start_student_session(db, request, response, member)
    log.info("join.rejoined", member_id=str(member.id))
    return student_me(member, school_class)
