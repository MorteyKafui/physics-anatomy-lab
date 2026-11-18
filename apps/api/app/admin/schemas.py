"""Admin API bodies (ADR 0040). Students appear as counts, or by display name only."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.admin.queries import Range
from app.auth.codes import show_code
from app.schemas import DisplayName

Reason = Field(default=None, max_length=200)


class StaffMe(BaseModel):
    email: str
    via: Literal["access", "dev-bypass"]
    environment: str


class RangeInfo(BaseModel):
    range: Range
    since: datetime
    until: datetime
    bucket_minutes: int


class StudentCounts(BaseModel):
    """Class members only: the lab works signed out, and signed-out students are not counted."""

    members: int
    active_30_days: int
    teachers: int


class ClassCounts(BaseModel):
    total: int
    ai_on: int
    joining_open: int


class ExperimentUse(BaseModel):
    experiment_id: str
    mode: Literal["guided", "exam", "own-data"]
    attempts: int
    students: int
    reports: int
    multi_device: int
    hints: int


class StageCount(BaseModel):
    step: str
    attempts: int
    students: int


class Mistake(BaseModel):
    experiment_id: str
    hint: str
    rule: str | None
    skill: str | None
    students: int
    attempts: int
    hints: int


class FlaggedName(BaseModel):
    member_id: uuid.UUID
    display_name: str
    created_at: datetime
    class_id: uuid.UUID
    class_code: str
    class_name: str

    @field_validator("class_code")
    @classmethod
    def _show(cls, code: str) -> str:
        return show_code(code)


class Overview(BaseModel):
    window: RangeInfo
    students: StudentCounts
    classes: ClassCounts
    reports: list[int]
    experiments: list[ExperimentUse]
    stages_experiment: str
    stages: list[StageCount]
    mistakes: list[Mistake]
    flagged_names: list[FlaggedName]
    database_bytes: int


class Summary(BaseModel):
    """What the portal's sidebar shows on every page: the last 30 days, and open safeguarding."""

    experiments: list[ExperimentUse]
    flagged_names: int


class StepTime(BaseModel):
    experiment_id: str
    step: str
    n: int
    minutes: float


class Usage(BaseModel):
    window: RangeInfo
    experiments: list[ExperimentUse]
    step_minutes: list[StepTime]


class SkillSeries(BaseModel):
    skill: str
    hints: list[int]


class Learning(BaseModel):
    window: RangeInfo
    experiment_id: str
    stages: list[StageCount]
    mistakes: list[Mistake]
    skills: list[SkillSeries]
    experiments: list[ExperimentUse]


class ExperimentTotal(BaseModel):
    experiment_id: str
    attempts: int
    students: int
    last_used_ms: int | None


class TeacherRow(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None
    created_at: datetime
    last_signed_in_at: datetime | None
    classes: int


class ClassRow(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    ai_enabled: bool
    joining_open: bool
    created_at: datetime
    teacher_name: str | None
    members: int

    @field_validator("code")
    @classmethod
    def _show(cls, code: str) -> str:
        return show_code(code)


class MemberRow(BaseModel):
    id: uuid.UUID
    display_name: str
    created_at: datetime
    attempts: int


class TableSize(BaseModel):
    name: str
    rows: int
    bytes: int


class SystemInfo(BaseModel):
    environment: str
    api_version: str
    database_bytes: int
    postgres: str
    migration: str | None
    tables: list[TableSize]
    attempts_synced_per_day: list[int]
    replica: bool


class ClassAiChange(BaseModel):
    enabled: bool
    reason: str | None = Reason


class DisplayNameChange(BaseModel):
    display_name: DisplayName
    reason: str | None = Reason


class AuditEntry(BaseModel):
    id: uuid.UUID
    at: datetime
    actor_email: str
    actor_via: str
    action: str
    target_type: str | None
    target_id: uuid.UUID | None
    detail: dict[str, object]


class AuditPage(BaseModel):
    entries: list[AuditEntry]
    next_before: uuid.UUID | None


class ExportRequest(BaseModel):
    report: Literal["mistakes", "stages", "classes"]
    range: Range = "7d"
    experiment_id: str | None = Field(default=None, max_length=200)
