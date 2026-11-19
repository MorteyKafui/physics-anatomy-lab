"""Consent, data export and deletion (ADR 0042).

- Everyone signed in reads their consents and exports their own data.
- A teacher exports one student's work (for a parent's request) and removes a student.
- A teacher deletes their own account. Deletion is immediate and permanent.

An export never holds another person's data: a teacher's export lists their classes without the
students, and a student's export holds only their own attempts.
"""

import uuid
from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import ColumnElement, delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app import consents, legal
from app.auth import rate_limit
from app.auth.codes import show_code
from app.auth.policy import (
    DELETE_ACCOUNT_RECENT_SIGN_IN,
    EMAIL_LINKS_PER_EMAIL,
    EXPORT_PAGE_ATTEMPTS,
    EXPORT_PAGE_MAX_BYTES,
)
from app.auth.sessions import CurrentPrincipal, CurrentTeacher, Teacher, clear_cookie
from app.db import Db
from app.models import (
    Attempt,
    AttemptEvent,
    ClassMember,
    Consent,
    EmailLinkToken,
    LiveMessage,
    SchoolClass,
    Session,
    User,
)
from app.privacy_schemas import (
    AccountDelete,
    AttemptFile,
    ConsentChoice,
    ConsentsOut,
    Export,
    ExportAttemptsPage,
    ExportedClass,
    StudentExport,
    TeacherExport,
)
from app.routes.classes import Responses, owned_class
from app.sync_schemas import AttemptHeader, SyncEvent

router = APIRouter(tags=["privacy"])
log = structlog.get_logger()

After = Annotated[str | None, Query(description="The cursor from the last page.")]
MEMBER_NOT_FOUND: Responses = {404: {"description": "No such class or student of yours"}}


# Consent


@router.get("/consents")
async def get_consents(principal: CurrentPrincipal, db: Db) -> ConsentsOut:
    """What this person has agreed to, against the current versions, and any notice running."""
    if isinstance(principal, Teacher):
        rows = await consents.history(db, user_id=principal.user.id)
        return ConsentsOut(consents=consents.states(rows, teacher=True))
    rows = await consents.history(db, member_id=principal.member.id)
    return ConsentsOut(consents=consents.states(rows, teacher=False))


@router.post(
    "/consents",
    responses={
        403: {"description": "Not something this person is asked about"},
        409: {"description": "That version is not the current one"},
        422: {"description": "A required document cannot be withdrawn"},
    },
)
async def record_consent(body: ConsentChoice, principal: CurrentPrincipal, db: Db) -> ConsentsOut:
    """Agree to the current version of a document, or give or withdraw analytics consent."""
    teacher = isinstance(principal, Teacher)
    if body.purpose not in legal.REQUIRED and not teacher:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Students are not asked this.")
    if body.purpose in legal.REQUIRED and not body.granted:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="To stop agreeing to this, delete your account.",
        )
    current = legal.current(body.purpose, datetime.now(UTC).date()).version
    if body.version != current:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="This page is out of date. Reload it to see the current version.",
        )
    user_id = principal.user.id if isinstance(principal, Teacher) else None
    member_id = None if isinstance(principal, Teacher) else principal.member.id
    db.add(
        Consent(
            user_id=user_id,
            member_id=member_id,
            purpose=body.purpose,
            version=current,
            granted=body.granted,
            via="choice",
        )
    )
    await db.flush()
    log.info(
        "consent.recorded",
        purpose=body.purpose,
        granted=body.granted,
        user_id=str(user_id) if user_id else None,
        member_id=str(member_id) if member_id else None,
    )
    rows = await consents.history(db, user_id=user_id, member_id=member_id)
    return ConsentsOut(consents=consents.states(rows, teacher=teacher))


# Export


def _owned(column: str, owner: uuid.UUID) -> ColumnElement[bool]:
    return (Attempt.user_id if column == "user_id" else Attempt.member_id) == owner


async def _attempt_count(db: AsyncSession, column: str, owner: uuid.UUID) -> int:
    return await db.scalar(select(func.count()).where(_owned(column, owner))) or 0


async def _teacher_export(db: AsyncSession, user: User) -> TeacherExport:
    students = (
        select(func.count())
        .where(ClassMember.class_id == SchoolClass.id)
        .correlate(SchoolClass)
        .scalar_subquery()
    )
    rows = await db.execute(
        select(SchoolClass, students)
        .where(SchoolClass.teacher_id == user.id)
        .order_by(SchoolClass.created_at)
    )
    classes = [
        ExportedClass(
            id=c.id,
            name=c.name,
            code=show_code(c.code),
            joining_open=c.joining_open,
            ai_enabled=c.ai_enabled,
            school_permission_confirmed_at=c.school_permission_confirmed_at,
            created_at=c.created_at,
            students=n,
        )
        for c, n in rows
    ]
    return TeacherExport(
        exported_at=datetime.now(UTC),
        email=user.email,
        display_name=user.display_name,
        google_linked=user.google_sub is not None,
        created_at=user.created_at,
        last_signed_in_at=user.last_signed_in_at,
        consents=consents.records(await consents.history(db, user_id=user.id)),
        classes=classes,
        attempts=await _attempt_count(db, "user_id", user.id),
    )


async def _student_export(
    db: AsyncSession, member: ClassMember, school_class: SchoolClass
) -> StudentExport:
    teacher_name = await db.scalar(
        select(User.display_name).where(User.id == school_class.teacher_id)
    )
    return StudentExport(
        exported_at=datetime.now(UTC),
        display_name=member.display_name,
        class_name=school_class.name,
        teacher_name=teacher_name,
        joined_at=member.created_at,
        consents=consents.records(await consents.history(db, member_id=member.id)),
        attempts=await _attempt_count(db, "member_id", member.id),
    )


def _export_cursor(after: str | None) -> uuid.UUID | None:
    if after is None or after == "":
        return None
    try:
        return uuid.UUID(after)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Bad cursor.") from error


async def _attempts_page(
    db: AsyncSession, column: str, owner: uuid.UUID, after: str | None
) -> ExportAttemptsPage:
    """The owner's attempts as attempt files, in id order (uuidv7, so oldest first).

    The size of each attempt's events is summed first, so a page is chosen before any event is
    loaded and never passes the byte limit unless one attempt alone does.
    """
    since = _export_cursor(after)
    size = (
        select(func.coalesce(func.sum(func.octet_length(text("attempt_events.data::text"))), 0))
        .where(AttemptEvent.attempt_id == Attempt.id)
        .correlate(Attempt)
        .scalar_subquery()
    )
    query = select(Attempt, size).where(_owned(column, owner))
    if since is not None:
        query = query.where(Attempt.id > since)
    found = (await db.execute(query.order_by(Attempt.id).limit(EXPORT_PAGE_ATTEMPTS + 1))).all()
    more = len(found) > EXPORT_PAGE_ATTEMPTS
    chosen: list[Attempt] = []
    total = 0
    for attempt, bytes_ in found[:EXPORT_PAGE_ATTEMPTS]:
        if chosen and total + bytes_ > EXPORT_PAGE_MAX_BYTES:
            more = True
            break
        chosen.append(attempt)
        total += bytes_

    events: dict[uuid.UUID, list[SyncEvent]] = {a.id: [] for a in chosen}
    if chosen:
        rows = await db.scalars(
            select(AttemptEvent)
            .where(AttemptEvent.attempt_id.in_(events.keys()))
            # The engine's replay order (packages/engine): seq, then device, then id.
            .order_by(
                AttemptEvent.attempt_id,
                AttemptEvent.seq,
                AttemptEvent.device,
                AttemptEvent.event_id,
            )
        )
        client_ids = {a.id: a.client_id for a in chosen}
        for e in rows:
            events[e.attempt_id].append(
                SyncEvent(
                    id=e.event_id,
                    attempt_id=client_ids[e.attempt_id],
                    seq=e.seq,
                    device=e.device,
                    at=e.at_ms,
                    kind=e.kind,
                    data=e.data,
                )
            )
    files = [
        AttemptFile(
            attempt=AttemptHeader(
                id=a.client_id,
                experiment_id=a.experiment_id,
                mode=a.mode,  # pyright: ignore[reportArgumentType] (checked by the table)
                seed=a.seed,
                created_at=a.created_at_ms,
                updated_at=a.updated_at_ms,
                format_version=1,  # sync accepts only format 1
            ),
            events=events[a.id],
        )
        for a in chosen
    ]
    cursor = str(chosen[-1].id) if chosen else (str(since) if since else "")
    return ExportAttemptsPage(attempts=files, cursor=cursor, more=more)


@router.get("/export")
async def export_mine(principal: CurrentPrincipal, db: Db) -> Export:
    """Everything the server holds about this person; their attempts follow in pages."""
    if isinstance(principal, Teacher):
        out: TeacherExport | StudentExport = await _teacher_export(db, principal.user)
        log.info("privacy.exported", user_id=str(principal.user.id))
    else:
        out = await _student_export(db, principal.member, principal.school_class)
        log.info("privacy.exported", member_id=str(principal.member.id))
    return out


@router.get("/export/attempts")
async def export_my_attempts(
    principal: CurrentPrincipal, db: Db, after: After = None
) -> ExportAttemptsPage:
    """This person's attempts as attempt files, a page at a time."""
    if isinstance(principal, Teacher):
        return await _attempts_page(db, "user_id", principal.user.id, after)
    return await _attempts_page(db, "member_id", principal.member.id, after)


async def _member_of(
    db: AsyncSession, teacher: Teacher, class_id: uuid.UUID, member_id: uuid.UUID
) -> tuple[ClassMember, SchoolClass]:
    school_class = await owned_class(db, teacher, class_id)
    member = await db.scalar(
        select(ClassMember).where(
            ClassMember.id == member_id, ClassMember.class_id == school_class.id
        )
    )
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return member, school_class


@router.get("/classes/{class_id}/members/{member_id}/export", responses=MEMBER_NOT_FOUND)
async def export_member(
    class_id: uuid.UUID, member_id: uuid.UUID, teacher: CurrentTeacher, db: Db
) -> StudentExport:
    """One student's data, for a parent's or the student's request; attempts follow in pages."""
    member, school_class = await _member_of(db, teacher, class_id, member_id)
    log.info("privacy.member_exported", member_id=str(member.id), user_id=str(teacher.user.id))
    return await _student_export(db, member, school_class)


@router.get("/classes/{class_id}/members/{member_id}/export/attempts", responses=MEMBER_NOT_FOUND)
async def export_member_attempts(
    class_id: uuid.UUID,
    member_id: uuid.UUID,
    teacher: CurrentTeacher,
    db: Db,
    after: After = None,
) -> ExportAttemptsPage:
    member, _ = await _member_of(db, teacher, class_id, member_id)
    return await _attempts_page(db, "member_id", member.id, after)


# Deletion


@router.delete(
    "/classes/{class_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=MEMBER_NOT_FOUND,
)
async def remove_member(
    class_id: uuid.UUID, member_id: uuid.UUID, teacher: CurrentTeacher, db: Db
) -> None:
    """Remove a student and delete everything of theirs: attempts, consents, sessions, benches.

    Permanent, at once. Their devices keep their own copy of the work (offline first).
    """
    member, _ = await _member_of(db, teacher, class_id, member_id)
    # Notes written to this student alone go with them; group hints just lose their id.
    await db.execute(
        delete(LiveMessage).where(
            LiveMessage.kind == "note", LiveMessage.to_member_ids == [member.id]
        )
    )
    await db.execute(
        update(LiveMessage)
        .where(LiveMessage.to_member_ids.contains([member.id]))
        .values(to_member_ids=func.array_remove(LiveMessage.to_member_ids, member.id))
    )
    await db.delete(member)
    await db.flush()
    log.info("privacy.member_removed", member_id=str(member.id), user_id=str(teacher.user.id))


@router.post(
    "/account/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        403: {"description": "Sign in again first"},
        422: {"description": "The email does not match"},
    },
)
async def delete_account(
    body: AccountDelete, response: Response, teacher: CurrentTeacher, db: Db
) -> None:
    """Delete this teacher's account with their classes, students and all their work. Permanent.

    The teacher types their email to confirm, and must have signed in within the last hour.
    """
    user = teacher.user
    if str(body.confirm_email).casefold() != user.email.casefold():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="That isn't the email you signed in with.",
        )
    signed_in = await db.scalar(select(Session.created_at).where(Session.id == teacher.session_id))
    if signed_in is None or datetime.now(UTC) - signed_in > DELETE_ACCOUNT_RECENT_SIGN_IN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="To delete your account, sign in again first.",
        )
    classes = await db.scalar(select(func.count()).where(SchoolClass.teacher_id == user.id))
    students = await db.scalar(
        select(func.count())
        .select_from(ClassMember)
        .join(SchoolClass, SchoolClass.id == ClassMember.class_id)
        .where(SchoolClass.teacher_id == user.id)
    )
    # The email is also held outside the account: unused sign-in links and their rate counter.
    await db.execute(delete(EmailLinkToken).where(EmailLinkToken.email == user.email))
    await rate_limit.forget(db, EMAIL_LINKS_PER_EMAIL, user.email)
    # Cascades to classes, students, attempts, events, sessions, consents and live sessions.
    await db.delete(user)
    await db.flush()
    clear_cookie(response)
    # Every session of the account went with it, so every device is signed out.
    log.info("privacy.account_deleted", user_id=str(user.id), classes=classes, students=students)
