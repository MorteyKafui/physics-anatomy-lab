"""Bodies for consent, data export and deletion (ADR 0042).

Attempt files in an export are in the engine's own camelCase shape (`packages/engine`,
events/attempt-file.ts), so each one can be imported back into the lab as it is.
"""

import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field

from app.legal import Purpose
from app.schemas import Body
from app.sync_schemas import AttemptHeader, Camel, SyncEvent

# Consent


class ConsentState(BaseModel):
    purpose: Purpose
    document: str = Field(description="The document this purpose is governed by.")
    required: bool = Field(description="Terms and privacy are required; analytics is optional.")
    current_version: str
    upcoming_version: str | None = Field(
        description="A new version in its notice period: tell the person before it applies."
    )
    upcoming_from: date | None
    granted: bool | None = Field(description="The latest choice on record; null if none.")
    version: str | None = Field(description="The version that choice was made on.")
    recorded_at: datetime | None
    needs_agreement: bool = Field(
        description="A required document's current version has not been agreed to yet."
    )


class ConsentsOut(BaseModel):
    consents: list[ConsentState]


class ConsentChoice(Body):
    purpose: Purpose
    version: Annotated[str, Field(min_length=1, max_length=40)] = Field(
        description="The version shown to the person. It must be the current one."
    )
    granted: bool


# Export


class ConsentRecord(BaseModel):
    purpose: Purpose
    version: str
    granted: bool
    via: Literal["sign-in", "join", "choice"]
    recorded_at: datetime


class ExportedClass(BaseModel):
    """A teacher's class. Its students' names and work are theirs, so they are not in it."""

    id: uuid.UUID
    name: str
    code: str
    joining_open: bool
    ai_enabled: bool
    school_permission_confirmed_at: datetime
    created_at: datetime
    students: int


class TeacherExport(BaseModel):
    format: Literal["physics-anatomy/export"] = "physics-anatomy/export"
    version: Literal[1] = 1
    kind: Literal["teacher"] = "teacher"
    exported_at: datetime
    email: str
    display_name: str | None
    google_linked: bool
    created_at: datetime
    last_signed_in_at: datetime | None
    consents: list[ConsentRecord]
    classes: list[ExportedClass]
    attempts: int = Field(description="How many attempts the pages at /export/attempts hold.")


class StudentExport(BaseModel):
    format: Literal["physics-anatomy/export"] = "physics-anatomy/export"
    version: Literal[1] = 1
    kind: Literal["student"] = "student"
    exported_at: datetime
    display_name: str
    class_name: str
    teacher_name: str | None
    joined_at: datetime
    consents: list[ConsentRecord]
    attempts: int = Field(description="How many attempts the pages of attempt files hold.")


Export = Annotated[TeacherExport | StudentExport, Field(discriminator="kind")]


class AttemptFile(Camel):
    """The lab's attempt file: import it on any device to rebuild the attempt."""

    format: Literal["physics-anatomy/attempt"] = "physics-anatomy/attempt"
    version: Literal[1] = 1
    attempt: AttemptHeader
    events: list[SyncEvent]


class ExportAttemptsPage(Camel):
    attempts: list[AttemptFile]
    cursor: str = Field(description="Pass as `after` for the next page. Opaque.")
    more: bool


# Deletion


class AccountDelete(Body):
    confirm_email: EmailStr = Field(description="The teacher types their email to confirm.")


class ClassDelete(Body):
    confirm_name: Annotated[str, Field(min_length=1, max_length=80)] = Field(
        description="The teacher types the class's name to confirm."
    )


class LeaveClass(Body):
    confirm_display_name: Annotated[str, Field(min_length=1, max_length=24)] = Field(
        description="The student types their display name to confirm."
    )
