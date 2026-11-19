"""Signing in and out: email links and Google for teachers (ADR 0038)."""

import secrets
from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import rate_limit
from app.auth.codes import hash_secret, new_token
from app.auth.email import EmailNotSentError, EmailSender, get_email_sender, sign_in_email
from app.auth.google import GoogleIdentity, GoogleProvider, GoogleSignInError, get_google
from app.auth.policy import (
    EMAIL_LINK_LIFETIME,
    EMAIL_LINKS_PER_ADDRESS,
    EMAIL_LINKS_PER_EMAIL,
    GOOGLE_STARTS_PER_ADDRESS,
    OAUTH_STATE_LIFETIME,
)
from app.auth.sessions import (
    CurrentPrincipal,
    CurrentTeacher,
    Principal,
    Teacher,
    end_session,
    start_teacher_session,
)
from app.auth.turnstile import HumanCheckDep, require_human
from app.config import get_settings
from app.db import Db
from app.models import ClassMember, EmailLinkToken, OAuthState, SchoolClass, User
from app.schemas import (
    ClassSummary,
    EmailLinkRequest,
    EmailLinkSent,
    EmailLinkVerify,
    Me,
    SignInMethods,
    StudentMe,
    TeacherMe,
    TeacherUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])
log = structlog.get_logger()

OAUTH_COOKIE = "pa_oauth_state"


def me_of(principal: Principal) -> TeacherMe | StudentMe:
    if isinstance(principal, Teacher):
        user = principal.user
        return TeacherMe(id=user.id, email=user.email, display_name=user.display_name)
    return student_me(principal.member, principal.school_class)


def student_me(member: ClassMember, school_class: SchoolClass) -> StudentMe:
    return StudentMe(
        member_id=member.id,
        display_name=member.display_name,
        school_class=ClassSummary(
            id=school_class.id, name=school_class.name, ai_enabled=school_class.ai_enabled
        ),
    )


@router.get("/methods")
async def sign_in_methods() -> SignInMethods:
    """Which ways of signing in this server offers, so the page shows only those."""
    return SignInMethods(email_link=True, google=get_google() is not None)


@router.get("/me", responses={401: {"description": "Not signed in"}})
async def me(principal: CurrentPrincipal) -> Me:
    return me_of(principal)


@router.patch("/me")
async def update_me(body: TeacherUpdate, teacher: CurrentTeacher) -> TeacherMe:
    """A teacher sets the name students see when they join, such as Mr Mensah."""
    teacher.user.display_name = body.display_name
    return TeacherMe(id=teacher.user.id, email=teacher.user.email, display_name=body.display_name)


@router.post("/sign-out", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out(request: Request, response: Response, db: Db) -> None:
    await end_session(db, request, response)
    log.info("auth.signed_out")


# Email links


@router.post(
    "/email-link",
    status_code=status.HTTP_202_ACCEPTED,
    responses={429: {"description": "Too many links asked for"}, 503: {"description": "Not sent"}},
)
async def request_email_link(
    body: EmailLinkRequest,
    request: Request,
    db: Db,
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    human: HumanCheckDep,
) -> EmailLinkSent:
    """Email a sign-in link. The answer is the same whether or not the email has an account."""
    await require_human(human, body.turnstile_token, request)
    email = str(body.email)
    await rate_limit.take(db, EMAIL_LINKS_PER_ADDRESS, rate_limit.client_address(request))
    await rate_limit.take(db, EMAIL_LINKS_PER_EMAIL, email)

    token = new_token()
    db.add(
        EmailLinkToken(
            token_hash=hash_secret(token),
            email=email,
            expires_at=datetime.now(UTC) + EMAIL_LINK_LIFETIME,
        )
    )
    await db.flush()
    link = f"{get_settings().web_origin}/sign-in/link#token={token}"
    try:
        await sender.send(sign_in_email(email, link))
    except EmailNotSentError as error:
        log.error("auth.email_link_not_sent", reason=str(error))
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't send the email just now. Try again in a few minutes.",
        ) from error
    log.info("auth.email_link_sent")
    return EmailLinkSent(detail="Check your email for a sign-in link. It works for 15 minutes.")


async def _teacher_for_email(db: AsyncSession, email: str) -> User:
    await db.execute(insert(User).values(email=email).on_conflict_do_nothing())
    user = await db.scalar(select(User).where(User.email == email))
    assert user is not None
    return user


@router.post("/email-link/verify", responses={400: {"description": "Link expired or used"}})
async def verify_email_link(
    body: EmailLinkVerify, request: Request, response: Response, db: Db
) -> TeacherMe:
    """Sign in with the token from an email link. The web page posts it; a GET never signs in."""
    now = datetime.now(UTC)
    email = await db.scalar(
        update(EmailLinkToken)
        .where(
            EmailLinkToken.token_hash == hash_secret(body.token),
            EmailLinkToken.used_at.is_(None),
            EmailLinkToken.expires_at > now,
        )
        .values(used_at=now)
        .returning(EmailLinkToken.email)
    )
    if email is None:
        log.info("auth.email_link_refused")
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This sign-in link has expired or was already used. Ask for a new one.",
        )
    user = await _teacher_for_email(db, email)
    await start_teacher_session(db, request, response, user)
    return TeacherMe(id=user.id, email=user.email, display_name=user.display_name)


# Google


def _google_or_404() -> GoogleProvider:
    google = get_google()
    if google is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Google sign-in is not turned on.")
    return google


GoogleDep = Annotated[GoogleProvider, Depends(_google_or_404)]


@router.get("/google/start", status_code=status.HTTP_302_FOUND, response_class=RedirectResponse)
async def google_start(request: Request, db: Db, google: GoogleDep) -> RedirectResponse:
    """Send the browser to Google, remembering the state, nonce and PKCE verifier."""
    await rate_limit.take(db, GOOGLE_STARTS_PER_ADDRESS, rate_limit.client_address(request))
    # Unauthenticated callers can start sign-ins, so clear the expired ones as we go.
    await db.execute(delete(OAuthState).where(OAuthState.expires_at <= datetime.now(UTC)))
    state, nonce, verifier = new_token(), new_token(), secrets.token_urlsafe(64)
    db.add(
        OAuthState(
            state_hash=hash_secret(state),
            nonce=nonce,
            code_verifier=verifier,
            expires_at=datetime.now(UTC) + OAUTH_STATE_LIFETIME,
        )
    )
    response = RedirectResponse(google.authorization_url(state, nonce, verifier), 302)
    response.set_cookie(
        OAUTH_COOKIE,
        state,
        max_age=int(OAUTH_STATE_LIFETIME.total_seconds()),
        path="/",
        secure=get_settings().secure_cookies,
        httponly=True,
        samesite="lax",
    )
    return response


async def _teacher_for_google(db: AsyncSession, who: GoogleIdentity) -> User:
    user = await db.scalar(select(User).where(User.google_sub == who.sub))
    if user is not None:
        return user
    user = await _teacher_for_email(db, who.email)
    if user.google_sub not in (None, who.sub):
        raise GoogleSignInError("This email is linked to a different Google account.")
    user.google_sub = who.sub
    if user.display_name is None and who.name:
        user.display_name = who.name[:80]
    return user


@router.get("/google/callback", status_code=status.HTTP_302_FOUND, response_class=RedirectResponse)
async def google_callback(
    request: Request,
    db: Db,
    google: GoogleDep,
    code: str | None = None,
    state: str | None = None,
) -> RedirectResponse:
    web = get_settings().web_origin
    failed = RedirectResponse(f"{web}/sign-in?error=google", 302)
    failed.delete_cookie(OAUTH_COOKIE, path="/")
    browser_state = request.cookies.get(OAUTH_COOKIE)
    if (
        not code
        or not state
        or not browser_state
        or not secrets.compare_digest(state, browser_state)
    ):
        log.info("auth.google_refused", reason="state")
        return failed
    pending = await db.scalar(
        delete(OAuthState).where(OAuthState.state_hash == hash_secret(state)).returning(OAuthState)
    )
    if pending is None or pending.expires_at <= datetime.now(UTC):
        log.info("auth.google_refused", reason="expired")
        return failed
    try:
        who = await google.identity(code, pending.code_verifier, pending.nonce)
        user = await _teacher_for_google(db, who)
    except GoogleSignInError as error:
        log.info("auth.google_refused", reason=str(error))
        return failed
    done = RedirectResponse(f"{web}/teach", 302)
    done.delete_cookie(OAUTH_COOKIE, path="/")
    await start_teacher_session(db, request, done, user)
    return done
