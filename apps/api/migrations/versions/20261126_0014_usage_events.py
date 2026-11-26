"""Anonymous usage counts (ADR 0048).

`usage_events` is new, so creating it locks nothing. It holds no address, user agent or text: an
event name, the experiment, a step, mode or export format where the event has one, a device
class, the app version and the device's id for the day. The index on `received_at` serves the
admin portal's ranges and the 13-month deletion. The downgrade drops the table.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-26 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NAMES = (
    "'experiment_viewed', 'attempt_started', 'stage_completed', 'hint_shown', "
    "'report_exported', 'attempt_completed'"
)


def upgrade() -> None:
    op.create_table(
        "usage_events",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("experiment_id", sa.Text(), nullable=False),
        sa.Column("step", sa.Text(), nullable=True),
        sa.Column("mode", sa.Text(), nullable=True),
        sa.Column("format", sa.Text(), nullable=True),
        sa.Column("device", sa.Text(), nullable=False),
        sa.Column("app_version", sa.Text(), nullable=False),
        sa.Column("day_id", sa.UUID(), nullable=False),
        sa.CheckConstraint(f"name IN ({NAMES})", name=op.f("ck_usage_events_name_known")),
        sa.CheckConstraint(
            "experiment_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'",
            name=op.f("ck_usage_events_experiment_id_format"),
        ),
        sa.CheckConstraint(
            "(name = 'stage_completed') = (step IS NOT NULL)",
            name=op.f("ck_usage_events_step_only_for_stages"),
        ),
        sa.CheckConstraint(
            "(name = 'report_exported') = (format IS NOT NULL)",
            name=op.f("ck_usage_events_format_only_for_exports"),
        ),
        sa.CheckConstraint(
            "mode IS NULL OR mode IN ('guided', 'exam', 'own-data')",
            name=op.f("ck_usage_events_mode_known"),
        ),
        sa.CheckConstraint(
            "device IN ('phone', 'tablet', 'desktop')", name=op.f("ck_usage_events_device_known")
        ),
        sa.CheckConstraint(
            "app_version ~ '^[A-Za-z0-9.+-]{1,40}$'",
            name=op.f("ck_usage_events_app_version_format"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usage_events")),
    )
    op.create_index("ix_usage_events_received_at", "usage_events", ["received_at"])


def downgrade() -> None:
    op.drop_index("ix_usage_events_received_at", table_name="usage_events")
    op.drop_table("usage_events")
