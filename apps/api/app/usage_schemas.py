"""What a device may send about how the lab is used (ADR 0048), and nothing more.

Every field is a fixed choice or a short pattern, so no reading, name or free text can arrive.
Unknown names and unknown fields are refused.
"""

from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from app.auth.policy import USAGE_MAX_BATCH
from app.sync_schemas import Camel

UsageName = Literal[
    "experiment_viewed",
    "attempt_started",
    "stage_completed",
    "hint_shown",
    "report_exported",
    "attempt_completed",
]
# The ten steps of an attempt (packages/engine/src/steps/machine.ts, GLOSSARY.md).
UsageStep = Literal[
    "question",
    "predict",
    "build",
    "check",
    "measure",
    "tabulate",
    "plot",
    "analyse",
    "conclude",
    "report",
]
UsageMode = Literal["guided", "exam", "own-data"]
# What the report screen downloads (apps/web/src/app/lab/report/screen.tsx).
UsageFormat = Literal["pdf", "docx", "figures", "data"]
UsageDevice = Literal["phone", "tablet", "desktop"]


class UsageEventIn(Camel):
    name: UsageName
    experiment_id: Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{0,63}$")]
    step: UsageStep | None = None
    mode: UsageMode | None = None
    format: UsageFormat | None = None
    device: UsageDevice
    app_version: Annotated[str, Field(pattern=r"^[A-Za-z0-9.+-]{1,40}$")]
    # 128 random bits as 32 lowercase hex digits, replaced every local day on the device.
    day_id: Annotated[str, Field(pattern=r"^[0-9a-f]{32}$")]

    @model_validator(mode="after")
    def _fields_fit_the_event(self) -> Self:
        if (self.name == "stage_completed") != (self.step is not None):
            raise ValueError("A step goes with stage_completed, and only with it.")
        if (self.name == "report_exported") != (self.format is not None):
            raise ValueError("A format goes with report_exported, and only with it.")
        return self


class UsageBatch(Camel):
    events: Annotated[list[UsageEventIn], Field(min_length=1, max_length=USAGE_MAX_BATCH)]
