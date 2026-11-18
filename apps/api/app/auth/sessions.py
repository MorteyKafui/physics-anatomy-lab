"""Server-side sessions in PostgreSQL, held by the browser as an HttpOnly cookie (ADR 0038)."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, Literal

import structlog
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.codes import hash_secret, new_token
from app.auth.policy import (
    SESSION_TOUCH_EVERY,
    STUDENT_SESSION_IDLE,
    STUDENT_SESSION_MAX,
    TEACHER_SESSION_IDLE,
    TEACHER_SESSION_MAX,
)
from app.config import get_settings
from app.db import Db
from app.models import ClassMember, SchoolClass, Session, User

log = structlog.get_logger()


def cookie_name() -> str:
    # __Host- makes the browser refuse the cookie unless it is Secure, on /, with no Domain.
    return "__Host-pa_session" if get_settings().secure_cookies else "pa_session"


@dataclass(frozen=True)
class Teacher:
    kind: Literal["teacher"]
    session_id: uuid.UUID
    user: User


@dataclass(frozen=True)
class Student:
    kind: Literal["student"]
    session_id: uuid.UUID
    member: ClassMember
    school_class: SchoolClass


Principal = Teacher | Student


def _set_cookie(response: Response, token: str, expires_at: datetime) -> None:
    response.set_cookie(
        cookie_name(),
        token,
        expires=expires_at,
        path="/",
        secure=get_settings().secure_cookies,
        httponly=True,
        samesite="lax",
    )


def clear_cookie(response: Response) -> None:
    response.delete_cookie(
        cookie_name(), path="/", secure=get_settings().secure_cookies, httponly=True, samesite="lax"
    )


async def _end_current(db: AsyncSession, request: Request) -> None:
    token = request.cookies.get(cookie_name())
    if token:
        await db.execute(delete(Session).where(Session.token_hash == hash_secret(token)))


async def _start(
    db: AsyncSession,
    request: Request,
    response: Response,
    *,
    user_id: uuid.UUID | None = None,
    member_id: uuid.UUID | None = None,
) -> None:
    """End this browser's old session and issue a new token (rotation at every sign-in)."""
    await _end_current(db, request)
    now = datetime.now(UTC)
    idle, longest = (
        (TEACHER_SESSION_IDLE, TEACHER_SESSION_MAX)
        if user_id is not None
        else (STUDENT_SESSION_IDLE, STUDENT_SESSION_MAX)
    )
    token = new_token()
    expires_at = now + longest
    db.add(
        Session(
            token_hash=hash_secret(token),
            user_id=user_id,
            member_id=member_id,
            last_used_at=now,
            idle_expires_at=min(now + idle, expires_at),
            expires_at=expires_at,
        )
    )
    await db.flush()
    _set_cookie(response, token, expires_at)


async def start_teacher_session(
    db: AsyncSession, request: Request, response: Response, user: User
) -> None:
    await _start(db, request, response, user_id=user.id)
    user.last_signed_in_at = datetime.now(UTC)
    log.info("auth.signed_in", kind="teacher", user_id=str(user.id))


async def start_student_session(
    db: AsyncSession, request: Request, response: Response, member: ClassMember
) -> None:
    await _start(db, request, response, member_id=member.id)
    log.info("auth.signed_in", kind="student", member_id=str(member.id))


async def end_session(db: AsyncSession, request: Request, response: Response) -> None:
    await _end_current(db, request)
    clear_cookie(response)


async def end_member_sessions(db: AsyncSession, member_id: uuid.UUID) -> None:
    await db.execute(delete(Session).where(Session.member_id == member_id))


async def _load(db: AsyncSession, request: Request) -> Principal | None:
    token = request.cookies.get(cookie_name())
    if not token:
        return None
    now = datetime.now(UTC)
    row = await db.scalar(select(Session).where(Session.token_hash == hash_secret(token)))
    if row is None:
        return None
    if now >= row.idle_expires_at or now >= row.expires_at:
        return None  # expired rows are removed by the cleanup job, not on a refused request

    if now - row.last_used_at >= SESSION_TOUCH_EVERY:
        idle = TEACHER_SESSION_IDLE if row.user_id is not None else STUDENT_SESSION_IDLE
        row.last_used_at = now
        row.idle_expires_at = min(now + idle, row.expires_at)

    if row.user_id is not None:
        user = await db.get(User, row.user_id)
        return None if user is None else Teacher("teacher", row.id, user)

    found = (
        await db.execute(
            select(ClassMember, SchoolClass)
            .join(SchoolClass, SchoolClass.id == ClassMember.class_id)
            .where(ClassMember.id == row.member_id)
        )
    ).one_or_none()
    if found is None:
        return None
    member, school_class = found
    return Student("student", row.id, member, school_class)


async def optional_principal(request: Request, db: Db) -> Principal | None:
    return await _load(db, request)


def _signed_out() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sign in first.")


async def require_principal(
    principal: Annotated[Principal | None, Depends(optional_principal)],
) -> Principal:
    if principal is None:
        raise _signed_out()
    return principal


async def require_teacher(
    principal: Annotated[Principal | None, Depends(optional_principal)],
) -> Teacher:
    if principal is None:
        raise _signed_out()
    if not isinstance(principal, Teacher):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only teachers can do this.")
    return principal


CurrentPrincipal = Annotated[Principal, Depends(require_principal)]
CurrentTeacher = Annotated[Teacher, Depends(require_teacher)]
MaybePrincipal = Annotated[Principal | None, Depends(optional_principal)]
