"""Admin API bodies (ADR 0040). Students appear as counts, or by display name only."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.admin.queries import Range
from app.ai.features import FeatureName
from app.ai.switches import SwitchName
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
    mode: Literal["guided", "exam", "own-data", "what-if"]
    attempts: int
    students: int
    reports: int
    multi_device: int
    hints: int


class StageCount(BaseModel):
    step: str
    attempts: int
    students: int


class HintCount(BaseModel):
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
    mistakes: list[HintCount]
    flagged_names: list[FlaggedName]
    database_bytes: int


class Summary(BaseModel):
    """What the portal's sidebar shows on every page: the last 30 days, and open safeguarding."""

    experiments: list[ExperimentUse]
    flagged_names: int


class UsageExperiment(BaseModel):
    """Anonymous counts for one experiment (ADR 0048). Visitors are distinct day ids."""

    experiment_id: str
    opens: int
    visitors: int
    started: int
    reached_report: int
    completed: int


class UsageStep(BaseModel):
    experiment_id: str
    step: str
    visitors: int


class UsageCount(BaseModel):
    key: str
    n: int


class Usage(BaseModel):
    """The Usage area, from anonymous usage counts (ADR 0048), not from synced attempts."""

    window: RangeInfo
    visitors: int
    opens: int
    visitors_series: list[int]
    opens_series: list[int]
    experiments: list[UsageExperiment]
    steps: list[UsageStep]
    exports: list[UsageCount]
    devices: list[UsageCount]


class SkillSeries(BaseModel):
    skill: str
    hints: list[int]


class Learning(BaseModel):
    window: RangeInfo
    experiment_id: str
    stages: list[StageCount]
    mistakes: list[HintCount]
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


class AiFeatureUse(BaseModel):
    feature: FeatureName
    requests: int
    cost_microdollars: int = Field(description="Millionths of a US dollar.")
    held: int
    cached: int


class AiSwitchState(BaseModel):
    name: SwitchName
    enabled: bool
    model: str | None = Field(description="The feature's model; none for the switch for all AI.")
    teachers_only: bool
    changed_at: datetime | None


class EvalFailure(BaseModel):
    id: str
    why: str = Field(description="The rule that failed, or the grader's reason.")


class EvalSummary(BaseModel):
    """A feature's latest evaluation results in this deployment (apps/api/evals/results)."""

    feature: FeatureName
    cases: int
    run_at: datetime | None = Field(description="None when the suite has not run yet.")
    rate: float | None = Field(description="The share of rubric lines that pass.")
    bar: float
    passed: bool | None
    failing: list[EvalFailure]


class AiFlagRow(BaseModel):
    id: uuid.UUID
    at: datetime
    feature: FeatureName
    experiment_id: str
    step: str | None
    reason: Literal["wrong-physics", "confusing", "unsuitable", "other"]
    reply: str
    dismissed: bool


class AiFlagChange(BaseModel):
    reason: str | None = Reason


class AiOverview(BaseModel):
    """The admin AI page (ai-quotas-brief.md, decision 5). Today is since midnight UTC."""

    range: RangeInfo
    today: list[AiFeatureUse]
    by_feature: list[AiFeatureUse] = Field(description="Over the chosen range.")
    budget_microdollars: int | None = Field(description="AI_DAILY_BUDGET_USD, if set.")
    budget_reached_at: datetime | None = Field(description="When today's spend reached it.")
    switches: list[AiSwitchState]
    evaluations: list[EvalSummary]
    flags: list[AiFlagRow] = Field(description="Open flags, newest first, at most 50.")
    flags_open: int
    server_enabled: bool = Field(description="AI_ENABLED, the server's master switch.")
    configured: bool = Field(description="Whether the Anthropic key is set.")


class AiSwitchChange(BaseModel):
    enabled: bool
    reason: str | None = Reason
