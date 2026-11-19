"""Flagged AI replies (ai-evals-brief.md, decision 6).

A new table only; the downgrade drops it.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-20 09:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_flags",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("feature", sa.Text(), nullable=False),
        sa.Column("experiment_id", sa.Text(), nullable=False),
        sa.Column("step", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("reply", sa.Text(), nullable=False),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "feature IN ('tutor', 'what-if', 'report-review', 'question-drafting')",
            name=op.f("ck_ai_flags_feature_known"),
        ),
        sa.CheckConstraint(
            "experiment_id ~ '^[a-z][a-z0-9.-]{1,63}$'", name=op.f("ck_ai_flags_experiment_format")
        ),
        sa.CheckConstraint(
            "reason IN ('wrong-physics', 'confusing', 'unsuitable', 'other')",
            name=op.f("ck_ai_flags_reason_known"),
        ),
        sa.CheckConstraint(
            "char_length(reply) BETWEEN 1 AND 2000", name=op.f("ck_ai_flags_reply_length")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_flags")),
    )
    op.create_index("ix_ai_flags_at", "ai_flags", ["at"])


def downgrade() -> None:
    op.drop_index("ix_ai_flags_at", table_name="ai_flags")
    op.drop_table("ai_flags")
