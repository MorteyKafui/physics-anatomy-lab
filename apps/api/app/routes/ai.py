"""AI routes (ADR 0008, ADR 0043).

`GET /ai/status` tells the web app whether to show AI buttons, and why not. Each feature's own
route (Phase 4 item 2 onward) calls `ai_reply`, which checks the rule before anything reaches
Claude, builds the request from the typed context and streams the reply.

The test-only route streams a reply through the same path, so the stream is proved end to end
without a feature. It is mounted only in local and test, and left out of the OpenAPI file.
"""

from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sse_starlette import EventSourceResponse

from app.ai import prepare
from app.ai.answers import (
    AnswerStore,
    Caching,
    get_answer_store,
    tutor_keeps,
    tutor_key,
    what_if_keeps,
    what_if_key,
)
from app.ai.claude import Claude, get_claude
from app.ai.context import AiContext, ModelRequest, build_request
from app.ai.features import FEATURES, Feature, FeatureName
from app.ai.flags import CONTACT_DETAILS, FlagRequest, keep, looks_personal
from app.ai.log import AiLog, get_ai_log
from app.ai.policy import MESSAGES, Unavailable, available_features, refuse, why_unavailable
from app.ai.prepare import Prepared
from app.ai.questions import NOT_READY as DRAFT_NOT_READY
from app.ai.questions import DraftRequest
from app.ai.quotas import budget_reached, enforce, quota, used_today, within_limits
from app.ai.review import ReviewRequest
from app.ai.scenarios import NOT_READY
from app.ai.stream import ReplyCheck, ReplyItem, cached_stream, reply_stream
from app.ai.switches import switched_off
from app.auth.sessions import MaybePrincipal
from app.config import get_settings
from app.db import Db
from app.routes.load_test import TEST_ENVIRONMENTS

router = APIRouter(prefix="/ai", tags=["ai"])
test_router = APIRouter(prefix="/test-only/ai", include_in_schema=False)

ClaudeDep = Annotated[Claude | None, Depends(get_claude)]
AiLogDep = Annotated[AiLog, Depends(get_ai_log)]
AnswersDep = Annotated[AnswerStore, Depends(get_answer_store)]


class AiStatus(BaseModel):
    """Whether this person may use AI now, and if not, why, in a sentence to show."""

    available: bool
    reason: Unavailable | None
    message: str | None
    features: list[FeatureName] = Field(description="The features this person may use now.")
    used_up: dict[FeatureName, str] = Field(
        default_factory=dict[FeatureName, str],
        description="Features whose quota is used up today, each with the line to show.",
    )
    switched_off: dict[FeatureName, str] = Field(
        default_factory=dict[FeatureName, str],
        description="Features switched off in the admin portal, each with the line to show.",
    )


@router.get("/status")
async def ai_status(principal: MaybePrincipal, db: Db) -> AiStatus:
    """Signed out is an answer here, not an error: the reason is `signed-out`."""
    settings = get_settings()
    off = await switched_off(db) if principal is not None else frozenset[str]()
    reason = why_unavailable(principal, None, settings, off)
    if reason is None and await budget_reached(db, settings):
        reason = Unavailable.budget_reached
    if reason is not None or principal is None:
        message = None if reason is None else MESSAGES[reason]
        return AiStatus(available=False, reason=reason, message=message, features=[])
    features: list[FeatureName] = []
    used_up: dict[FeatureName, str] = {}
    switched = {
        name: MESSAGES[Unavailable.switched_off]
        for name in available_features(principal, settings)
        if name.value in off
    }
    for name in available_features(principal, settings, off):
        if await used_today(db, principal, name) >= quota(principal, name, settings):
            used_up[name] = MESSAGES[Unavailable.quota_used]
        else:
            features.append(name)
    return AiStatus(
        available=True,
        reason=None,
        message=None,
        features=features,
        used_up=used_up,
        switched_off=switched,
    )


def ai_reply(
    name: FeatureName,
    principal: MaybePrincipal,
    context: AiContext,
    instructions: str,
    claude: Claude | None,
    ai_log: AiLog,
    check: ReplyCheck | None = None,
    to_item: ReplyItem | None = None,
    output_schema: dict[str, Any] | None = None,
    caching: Caching | None = None,
    store: AnswerStore | None = None,
) -> EventSourceResponse:
    """The one way a feature calls Claude with an AiContext."""
    return ai_reply_with(
        name,
        principal,
        lambda feature, model: build_request(feature, model, instructions, context, output_schema),
        claude,
        ai_log,
        check,
        to_item,
        caching,
        store,
    )


def reply_to(
    name: FeatureName,
    principal: MaybePrincipal,
    prepared: Prepared,
    claude: Claude | None,
    ai_log: AiLog,
    caching: Caching | None = None,
    store: AnswerStore | None = None,
) -> EventSourceResponse:
    """Streams the reply to a request built in app/ai/prepare.py, the same one the evaluation
    suite grades."""
    return ai_reply_with(
        name,
        principal,
        lambda _feature, _model: prepared.request,
        claude,
        ai_log,
        prepared.check,
        prepared.to_item,
        caching,
        store,
    )


def ai_reply_with(
    name: FeatureName,
    principal: MaybePrincipal,
    build: Callable[[Feature, str], ModelRequest],
    claude: Claude | None,
    ai_log: AiLog,
    check: ReplyCheck | None = None,
    to_item: ReplyItem | None = None,
    caching: Caching | None = None,
    store: AnswerStore | None = None,
) -> EventSourceResponse:
    """Refuses with a plain HTTP error before streaming, or streams the reply to `build`."""
    settings = get_settings()
    feature = FEATURES[name]
    reason = why_unavailable(principal, feature, settings)
    if reason is None and claude is None:
        reason = Unavailable.not_configured
    if reason is not None:
        raise refuse(reason)
    assert principal is not None and claude is not None  # checked by why_unavailable
    request = build(feature, feature.model(settings))
    return reply_stream(feature, principal, request, claude, ai_log, check, to_item, caching, store)


async def from_cache(
    db: Db,
    store: AnswerStore,
    name: FeatureName,
    principal: MaybePrincipal,
    key: bytes | None,
    ai_log: AiLog,
) -> EventSourceResponse | None:
    """The cached answer for this question, as a stream, if there is one. Runs after the route's
    gate (app/ai/quotas.py), so only someone who may use the feature gets it."""
    if key is None or principal is None:
        return None
    answer = await store.get(db, key)
    return None if answer is None else cached_stream(FEATURES[name], principal, answer, ai_log)


@router.post(
    "/tutor",
    response_class=EventSourceResponse,
    dependencies=[Depends(within_limits(FeatureName.tutor))],
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "The reply (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "AI is off for this class"},
        429: {"description": "A quota, the daily budget or the address limit is used up"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def tutor(
    context: AiContext,
    db: Db,
    principal: MaybePrincipal,
    claude: ClaudeDep,
    ai_log: AiLogDep,
    answers: AnswersDep,
) -> EventSourceResponse:
    """The tutor's reply about the current step, streamed. Numbers not from the bench are held.
    A first question with no number may be answered from the cache."""
    key = tutor_key(context)
    cached = await from_cache(db, answers, FeatureName.tutor, principal, key, ai_log)
    if cached is not None:
        return cached
    return reply_to(
        FeatureName.tutor,
        principal,
        prepare.tutor(context, get_settings()),
        claude,
        ai_log,
        caching=None if key is None else Caching("tutor", key, keeps_text=tutor_keeps),
        store=answers,
    )


@router.post(
    "/what-if",
    response_class=EventSourceResponse,
    dependencies=[Depends(within_limits(FeatureName.what_if))],
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "One item (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "AI is off for this class"},
        429: {"description": "A quota, the daily budget or the address limit is used up"},
        422: {"description": "What if is not ready for this experiment"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def what_if(
    context: AiContext,
    db: Db,
    principal: MaybePrincipal,
    claude: ClaudeDep,
    ai_log: AiLogDep,
    answers: AnswersDep,
) -> EventSourceResponse:
    """A what-if question turned into a scenario the experiment's model supports, as one item.
    The same question on the same bench is answered from the cache."""
    try:
        prepared = prepare.what_if(context, get_settings())
    except prepare.NotReadyError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=NOT_READY) from None
    key = what_if_key(context)
    cached = await from_cache(db, answers, FeatureName.what_if, principal, key, ai_log)
    if cached is not None:
        return cached
    return reply_to(
        FeatureName.what_if,
        principal,
        prepared,
        claude,
        ai_log,
        caching=Caching("what-if", key, keeps_item=what_if_keeps(context)),
        store=answers,
    )


@router.post(
    "/report-review",
    response_class=EventSourceResponse,
    dependencies=[Depends(within_limits(FeatureName.report_review))],
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "One item (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "AI is off for this class"},
        429: {"description": "A quota, the daily budget or the address limit is used up"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def report_review(
    body: ReviewRequest, principal: MaybePrincipal, claude: ClaudeDep, ai_log: AiLogDep
) -> EventSourceResponse:
    """Comments on the conclusion, precautions, sources of error and discussion, as one item."""
    ids = [s.id for s in body.sections]
    if len(set(ids)) != len(ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="One of each section.")
    return reply_to(
        FeatureName.report_review,
        principal,
        prepare.report_review(body, get_settings()),
        claude,
        ai_log,
    )


@router.post(
    "/question-drafting",
    response_class=EventSourceResponse,
    dependencies=[Depends(within_limits(FeatureName.question_drafting))],
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "One item (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "Teachers only"},
        422: {"description": "Not ready for this experiment"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def question_drafting(
    body: DraftRequest,
    principal: MaybePrincipal,
    claude: ClaudeDep,
    ai_log: AiLogDep,
) -> EventSourceResponse:
    """Three drafted follow-up questions for exam mode, as one item, for a teacher to edit."""
    try:
        prepared = prepare.question_drafting(body, get_settings())
    except prepare.NotReadyError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=DRAFT_NOT_READY) from None
    return reply_to(FeatureName.question_drafting, principal, prepared, claude, ai_log)


@router.post(
    "/flags",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"description": "Signed out"},
        422: {"description": "The reply looks like it holds contact details"},
        429: {"description": "Ten reports a day"},
    },
)
async def flag_reply(body: FlagRequest, db: Db, principal: MaybePrincipal) -> None:
    """Report an AI answer, with a reason. Keeps the reply and the reason, never the question
    or who sent it (docs/content/ai-evals-brief.md, decision 6)."""
    if principal is None:
        raise refuse(Unavailable.signed_out)
    if looks_personal(body.reply):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=CONTACT_DETAILS)
    await keep(db, principal, body)


TEST_INSTRUCTIONS = "Answer the student's question about this step in one or two sentences."


@test_router.post("/{feature}")
async def test_reply(
    feature: FeatureName,
    context: AiContext,
    request: Request,
    db: Db,
    principal: MaybePrincipal,
    claude: ClaudeDep,
    ai_log: AiLogDep,
) -> EventSourceResponse:
    if get_settings().environment not in TEST_ENVIRONMENTS:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await enforce(db, request, principal, feature)
    return ai_reply(feature, principal, context, TEST_INSTRUCTIONS, claude, ai_log)
