"""Request and response bodies. These become the OpenAPI schema and the TypeScript client."""

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field

from app.auth.policy import DISPLAY_NAME_MAX, DISPLAY_NAME_MIN

_ALLOWED = re.compile(r"^[\w .\-]+$")


def _display_name(value: str) -> str:
    """A student's display name. Refuses anything that looks like contact details (ADR 0011)."""
    name = " ".join(value.split())
    if "@" in name:
        raise ValueError("Don't use an email address. Pick any kind name instead.")
    if sum(c.isdigit() for c in name) >= 7:
        raise ValueError("Don't use a phone number. Pick any kind name instead.")
    if not DISPLAY_NAME_MIN <= len(name) <= DISPLAY_NAME_MAX:
        raise ValueError(
            f"Use {DISPLAY_NAME_MIN} to {DISPLAY_NAME_MAX} letters, numbers or spaces."
        )
    if not _ALLOWED.match(name):
        raise ValueError("Use letters, numbers, spaces, dots, dashes or underscores.")
    return name


def _class_name(value: str) -> str:
    name = " ".join(value.split())
    if not 1 <= len(name) <= 80:
        raise ValueError("Give the class a name of up to 80 characters.")
    return name


def _teacher_name(value: str) -> str:
    name = " ".join(value.split())
    if not 1 <= len(name) <= 80:
        raise ValueError("Use up to 80 characters.")
    return name


DisplayName = Annotated[str, AfterValidator(_display_name)]
ClassName = Annotated[str, AfterValidator(_class_name)]
TeacherName = Annotated[str, AfterValidator(_teacher_name)]
TypedCode = Annotated[str, Field(min_length=1, max_length=32)]


class Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


# Signing in


class SignInMethods(BaseModel):
    email_link: bool
    google: bool


class EmailLinkRequest(Body):
    email: EmailStr
    turnstile_token: Annotated[str | None, Field(max_length=2048)] = Field(
        default=None, description="From the page's Turnstile widget, when Turnstile is on."
    )


class EmailLinkSent(BaseModel):
    detail: str


class EmailLinkVerify(Body):
    token: Annotated[str, Field(min_length=20, max_length=128)]


class TeacherMe(BaseModel):
    kind: Literal["teacher"] = "teacher"
    id: uuid.UUID
    email: str
    display_name: str | None


class ClassSummary(BaseModel):
    id: uuid.UUID
    name: str
    ai_enabled: bool


class StudentMe(BaseModel):
    kind: Literal["student"] = "student"
    member_id: uuid.UUID
    display_name: str
    school_class: ClassSummary


Me = Annotated[TeacherMe | StudentMe, Field(discriminator="kind")]


class TeacherUpdate(Body):
    display_name: TeacherName


# Classes, for teachers


class ClassCreate(Body):
    name: ClassName
    school_permission_confirmed: Literal[True] = Field(
        description="The teacher confirms the school allows this class to use Physics Anatomy."
    )


class ClassUpdate(Body):
    name: ClassName | None = None
    joining_open: bool | None = None
    ai_enabled: bool | None = None


class ClassOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str = Field(description="The class code as people read it, such as 7KQ-42M.")
    joining_open: bool
    ai_enabled: bool
    created_at: datetime
    code_changed_at: datetime


class MemberOut(BaseModel):
    id: uuid.UUID
    display_name: str
    created_at: datetime


class RejoinCodeOut(BaseModel):
    code: str = Field(description="Show it to the student once; it works once, for 24 hours.")
    expires_at: datetime


# Joining, for students


class JoinPreview(BaseModel):
    class_name: str
    teacher_name: str | None
    ai_enabled: bool


class JoinPreviewRequest(Body):
    code: TypedCode


class JoinRequest(Body):
    code: TypedCode
    display_name: DisplayName
    agreed_to_terms: Literal[True]
    turnstile_token: Annotated[str | None, Field(max_length=2048)] = Field(
        default=None, description="From the page's Turnstile widget, when Turnstile is on."
    )


class RejoinRequest(Body):
    code: TypedCode
    turnstile_token: Annotated[str | None, Field(max_length=2048)] = Field(
        default=None, description="From the page's Turnstile widget, when Turnstile is on."
    )
