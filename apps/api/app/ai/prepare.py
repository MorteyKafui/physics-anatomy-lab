"""Each feature's request to Claude and its checks, in one place (ADR 0043).

The routes (app/routes/ai.py) and the evaluation suite (evals/) both build their requests here,
so the suite grades exactly what students and teachers are sent.
"""

from dataclasses import dataclass

from app.ai.context import AiContext, ModelRequest, build_request, request_with
from app.ai.features import FEATURES, FeatureName
from app.ai.questions import FACTS as QUESTION_FACTS
from app.ai.questions import INSTRUCTIONS as DRAFT_INSTRUCTIONS
from app.ai.questions import DraftCheck, DraftRequest
from app.ai.questions import output_schema as draft_schema
from app.ai.questions import user_message as draft_message
from app.ai.review import INSTRUCTIONS as REVIEW_INSTRUCTIONS
from app.ai.review import ReviewCheck, ReviewRequest, user_message
from app.ai.review import output_schema as review_schema
from app.ai.scenarios import INSTRUCTIONS as WHAT_IF_INSTRUCTIONS
from app.ai.scenarios import SPECS, ScenarioCheck, output_schema
from app.ai.stream import ReplyCheck, ReplyItem
from app.ai.tutor import INSTRUCTIONS as TUTOR_INSTRUCTIONS
from app.ai.tutor import tutor_check
from app.config import Settings


class NotReadyError(Exception):
    """The feature has nothing to work from for this experiment yet."""


@dataclass(frozen=True)
class Prepared:
    request: ModelRequest
    check: ReplyCheck | None = None
    to_item: ReplyItem | None = None


def _model(name: FeatureName, settings: Settings) -> str:
    return FEATURES[name].model(settings)


def tutor(context: AiContext, settings: Settings) -> Prepared:
    feature = FEATURES[FeatureName.tutor]
    request = build_request(feature, _model(feature.name, settings), TUTOR_INSTRUCTIONS, context)
    return Prepared(request, check=tutor_check(context))


def what_if(context: AiContext, settings: Settings) -> Prepared:
    spec = SPECS.get(context.experiment_id)
    if spec is None:
        raise NotReadyError(context.experiment_id)
    feature = FEATURES[FeatureName.what_if]
    request = build_request(
        feature, _model(feature.name, settings), WHAT_IF_INSTRUCTIONS, context, output_schema(spec)
    )
    return Prepared(request, to_item=ScenarioCheck(context, spec))


def report_review(body: ReviewRequest, settings: Settings) -> Prepared:
    feature = FEATURES[FeatureName.report_review]
    request = request_with(
        feature,
        _model(feature.name, settings),
        REVIEW_INSTRUCTIONS,
        [{"role": "user", "content": user_message(body)}],
        review_schema([s.id for s in body.sections]),
    )
    return Prepared(request, to_item=ReviewCheck(body))


def question_drafting(body: DraftRequest, settings: Settings) -> Prepared:
    facts = QUESTION_FACTS.get(body.experiment_id)
    if facts is None:
        raise NotReadyError(body.experiment_id)
    feature = FEATURES[FeatureName.question_drafting]
    request = request_with(
        feature,
        _model(feature.name, settings),
        DRAFT_INSTRUCTIONS,
        [{"role": "user", "content": draft_message(body, facts)}],
        draft_schema(),
    )
    return Prepared(request, to_item=DraftCheck(facts))
