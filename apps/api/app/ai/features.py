"""The AI features, who may use each, and how each calls the model (ADR 0043).

The model for each feature is a setting (app/config.py), so it can change without a code change.
The features themselves are built in Phase 4 item 2 and 3; this table is what they share.
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal

from app.config import Settings

Effort = Literal["low", "medium", "high"]


class FeatureName(StrEnum):
    tutor = "tutor"
    what_if = "what-if"
    report_review = "report-review"
    question_drafting = "question-drafting"


@dataclass(frozen=True)
class Feature:
    name: FeatureName
    # Students use it only while their class has AI on; teachers always (ADR 0008).
    students: bool
    max_tokens: int
    effort: Effort

    def model(self, settings: Settings) -> str:
        return {
            FeatureName.tutor: settings.ai_model_tutor,
            FeatureName.what_if: settings.ai_model_what_if,
            FeatureName.report_review: settings.ai_model_report_review,
            FeatureName.question_drafting: settings.ai_model_question_drafting,
        }[self.name]


FEATURES: dict[FeatureName, Feature] = {
    f.name: f
    for f in (
        Feature(FeatureName.tutor, students=True, max_tokens=2000, effort="low"),
        Feature(FeatureName.what_if, students=True, max_tokens=2000, effort="low"),
        Feature(FeatureName.report_review, students=True, max_tokens=4000, effort="medium"),
        Feature(FeatureName.question_drafting, students=False, max_tokens=8000, effort="medium"),
    )
}
