"""The AI request log (ADR 0043).

A new table only, so it takes no locks on existing data; the downgrade drops it.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-19 15:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_requests",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("feature", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("principal_kind", sa.Text(), nullable=False),
        sa.Column("pseudonym", sa.LargeBinary(), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("cache_read_tokens", sa.Integer(), nullable=False),
        sa.Column("cache_write_tokens", sa.Integer(), nullable=False),
        sa.Column("cost_microdollars", sa.BigInteger(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "feature IN ('tutor', 'what-if', 'report-review', 'question-drafting')",
            name=op.f("ck_ai_requests_feature_known"),
        ),
        sa.CheckConstraint(
            "char_length(model) BETWEEN 1 AND 64", name=op.f("ck_ai_requests_model_length")
        ),
        sa.CheckConstraint(
            "principal_kind IN ('teacher', 'student')",
            name=op.f("ck_ai_requests_principal_kind_known"),
        ),
        sa.CheckConstraint(
            "octet_length(pseudonym) = 32", name=op.f("ck_ai_requests_pseudonym_length")
        ),
        sa.CheckConstraint(
            "outcome IN ('done', 'cut-short', 'refused', 'error', 'cancelled')",
            name=op.f("ck_ai_requests_outcome_known"),
        ),
        sa.CheckConstraint(
            "input_tokens >= 0 AND output_tokens >= 0 AND cache_read_tokens >= 0"
            " AND cache_write_tokens >= 0 AND duration_ms >= 0",
            name=op.f("ck_ai_requests_counts_not_negative"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_requests")),
    )
    op.create_index("ix_ai_requests_at", "ai_requests", ["at"])
    op.create_index("ix_ai_requests_pseudonym_at", "ai_requests", ["pseudonym", "at"])


def downgrade() -> None:
    op.drop_index("ix_ai_requests_pseudonym_at", table_name="ai_requests")
    op.drop_index("ix_ai_requests_at", table_name="ai_requests")
    op.drop_table("ai_requests")
