"""AI routes (ADR 0008, ADR 0043).

`GET /ai/status` tells the web app whether to show AI buttons, and why not. Each feature's own
route (Phase 4 item 2 onward) calls `ai_reply`, which checks the rule before anything reaches
Claude, builds the request from the typed context and streams the reply.

The test-only route streams a reply through the same path, so the stream is proved end to end
without a feature. It is mounted only in local and test, and left out of the OpenAPI file.
"""

from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sse_starlette import EventSourceResponse

from app.ai.claude import Claude, get_claude
from app.ai.context import AiContext, ModelRequest, build_request, request_with
from app.ai.features import FEATURES, Feature, FeatureName
from app.ai.log import AiLog, get_ai_log
from app.ai.policy import MESSAGES, Unavailable, available_features, refuse, why_unavailable
from app.ai.questions import FACTS as QUESTION_FACTS
from app.ai.questions import INSTRUCTIONS as DRAFT_INSTRUCTIONS
from app.ai.questions import NOT_READY as DRAFT_NOT_READY
from app.ai.questions import DraftCheck, DraftRequest
from app.ai.questions import output_schema as draft_schema
from app.ai.questions import user_message as draft_message
from app.ai.review import INSTRUCTIONS as REVIEW_INSTRUCTIONS
from app.ai.review import ReviewCheck, ReviewRequest, user_message
from app.ai.review import output_schema as review_schema
from app.ai.scenarios import INSTRUCTIONS as WHAT_IF_INSTRUCTIONS
from app.ai.scenarios import NOT_READY, SPECS, ScenarioCheck, output_schema
from app.ai.stream import ReplyCheck, ReplyItem, reply_stream
from app.ai.tutor import INSTRUCTIONS as TUTOR_INSTRUCTIONS
from app.ai.tutor import tutor_check
from app.auth import rate_limit
from app.auth.sessions import MaybePrincipal, Teacher
from app.config import get_settings
from app.db import Db
from app.routes.load_test import TEST_ENVIRONMENTS
from app.routes.questions import DRAFTS_PER_TEACHER

router = APIRouter(prefix="/ai", tags=["ai"])
test_router = APIRouter(prefix="/test-only/ai", include_in_schema=False)

ClaudeDep = Annotated[Claude | None, Depends(get_claude)]
AiLogDep = Annotated[AiLog, Depends(get_ai_log)]


class AiStatus(BaseModel):
    """Whether this person may use AI now, and if not, why, in a sentence to show."""

    available: bool
    reason: Unavailable | None
    message: str | None
    features: list[FeatureName]


@router.get("/status")
async def ai_status(principal: MaybePrincipal) -> AiStatus:
    """Signed out is an answer here, not an error: the reason is `signed-out`."""
    settings = get_settings()
    reason = why_unavailable(principal, None, settings)
    return AiStatus(
        available=reason is None,
        reason=reason,
        message=None if reason is None else MESSAGES[reason],
        features=available_features(principal, settings),
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
    )


def ai_reply_with(
    name: FeatureName,
    principal: MaybePrincipal,
    build: Callable[[Feature, str], ModelRequest],
    claude: Claude | None,
    ai_log: AiLog,
    check: ReplyCheck | None = None,
    to_item: ReplyItem | None = None,
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
    return reply_stream(feature, principal, request, claude, ai_log, check, to_item)


@router.post(
    "/tutor",
    response_class=EventSourceResponse,
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "The reply (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "AI is off for this class"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def tutor(
    context: AiContext, principal: MaybePrincipal, claude: ClaudeDep, ai_log: AiLogDep
) -> EventSourceResponse:
    """The tutor's reply about the current step, streamed. Numbers not from the bench are held."""
    return ai_reply(
        FeatureName.tutor,
        principal,
        context,
        TUTOR_INSTRUCTIONS,
        claude,
        ai_log,
        tutor_check(context),
    )


@router.post(
    "/what-if",
    response_class=EventSourceResponse,
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "One item (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "AI is off for this class"},
        422: {"description": "What if is not ready for this experiment"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def what_if(
    context: AiContext, principal: MaybePrincipal, claude: ClaudeDep, ai_log: AiLogDep
) -> EventSourceResponse:
    """A what-if question turned into a scenario the experiment's model supports, as one item."""
    spec = SPECS.get(context.experiment_id)
    if spec is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=NOT_READY)
    return ai_reply(
        FeatureName.what_if,
        principal,
        context,
        WHAT_IF_INSTRUCTIONS,
        claude,
        ai_log,
        to_item=ScenarioCheck(context, spec),
        output_schema=output_schema(spec),
    )


@router.post(
    "/report-review",
    response_class=EventSourceResponse,
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "One item (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "AI is off for this class"},
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
    return ai_reply_with(
        FeatureName.report_review,
        principal,
        lambda feature, model: request_with(
            feature,
            model,
            REVIEW_INSTRUCTIONS,
            [{"role": "user", "content": user_message(body)}],
            review_schema(list(ids)),
        ),
        claude,
        ai_log,
        to_item=ReviewCheck(body),
    )


@router.post(
    "/question-drafting",
    response_class=EventSourceResponse,
    responses={
        200: {"content": {"text/event-stream": {}}, "description": "One item (ADR 0043)"},
        401: {"description": "Signed out"},
        403: {"description": "Teachers only"},
        422: {"description": "Not ready for this experiment"},
        429: {"description": "The day's drafts are used"},
        503: {"description": "AI is switched off or not set up"},
    },
)
async def question_drafting(
    body: DraftRequest,
    db: Db,
    principal: MaybePrincipal,
    claude: ClaudeDep,
    ai_log: AiLogDep,
) -> EventSourceResponse:
    """Three drafted follow-up questions for exam mode, as one item, for a teacher to edit."""
    facts = QUESTION_FACTS.get(body.experiment_id)
    if facts is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=DRAFT_NOT_READY)
    reason = why_unavailable(principal, FEATURES[FeatureName.question_drafting], get_settings())
    if reason is not None:
        raise refuse(reason)
    assert isinstance(principal, Teacher)  # students never get drafting (why_unavailable)
    await rate_limit.take(db, DRAFTS_PER_TEACHER, str(principal.user.id))
    return ai_reply_with(
        FeatureName.question_drafting,
        principal,
        lambda feature, model: request_with(
            feature,
            model,
            DRAFT_INSTRUCTIONS,
            [{"role": "user", "content": draft_message(body, facts)}],
            draft_schema(),
        ),
        claude,
        ai_log,
        to_item=DraftCheck(facts),
    )


TEST_INSTRUCTIONS = "Answer the student's question about this step in one or two sentences."


@test_router.post("/{feature}")
async def test_reply(
    feature: FeatureName,
    context: AiContext,
    principal: MaybePrincipal,
    claude: ClaudeDep,
    ai_log: AiLogDep,
) -> EventSourceResponse:
    if get_settings().environment not in TEST_ENVIRONMENTS:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return ai_reply(feature, principal, context, TEST_INSTRUCTIONS, claude, ai_log)
