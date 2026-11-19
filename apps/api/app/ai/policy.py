"""Who may use AI (ADR 0008, ADR 0043): one rule, checked before anything reaches Claude.

- Signed out: never.
- A teacher (a signed-in adult): yes.
- A student: only while their class's teacher has AI on, which is off by default.
- Nobody, while AI is switched off or the key is not set.
"""

from enum import StrEnum

from fastapi import HTTPException, status

from app.ai.features import FEATURES, Feature, FeatureName
from app.auth.sessions import Principal, Student
from app.config import Settings


class Unavailable(StrEnum):
    signed_out = "signed-out"
    class_off = "class-off"
    switched_off = "switched-off"
    not_configured = "not-configured"
    not_for_students = "not-for-students"


MESSAGES: dict[Unavailable, str] = {
    Unavailable.signed_out: "Sign in to use AI help.",
    Unavailable.class_off: "Your teacher has not turned AI on for this class.",
    Unavailable.switched_off: "AI help is switched off at the moment. The coach still works.",
    Unavailable.not_configured: "AI help is not set up on this server. The coach still works.",
    Unavailable.not_for_students: "Only teachers can use this.",
}


def why_unavailable(
    principal: Principal | None, feature: Feature | None, settings: Settings
) -> Unavailable | None:
    """None when AI may be used; otherwise the reason it may not. Order matters: the most
    useful reason comes first, so a signed-out visitor is told to sign in, not that AI is off."""
    if principal is None:
        return Unavailable.signed_out
    if not settings.ai_enabled:
        return Unavailable.switched_off
    if settings.anthropic_api_key is None:
        return Unavailable.not_configured
    if isinstance(principal, Student):
        if feature is not None and not feature.students:
            return Unavailable.not_for_students
        if not principal.school_class.ai_enabled:
            return Unavailable.class_off
    return None


def available_features(principal: Principal | None, settings: Settings) -> list[FeatureName]:
    return [
        name
        for name, feature in FEATURES.items()
        if why_unavailable(principal, feature, settings) is None
    ]


def refuse(reason: Unavailable) -> HTTPException:
    code = {
        Unavailable.signed_out: status.HTTP_401_UNAUTHORIZED,
        Unavailable.class_off: status.HTTP_403_FORBIDDEN,
        Unavailable.not_for_students: status.HTTP_403_FORBIDDEN,
        Unavailable.switched_off: status.HTTP_503_SERVICE_UNAVAILABLE,
        Unavailable.not_configured: status.HTTP_503_SERVICE_UNAVAILABLE,
    }[reason]
    return HTTPException(code, detail=MESSAGES[reason])
