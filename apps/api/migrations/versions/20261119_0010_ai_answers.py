"""The AI answer cache, and `cached` as an outcome in the AI log (ai-quotas-brief.md, decision 3).

A new table, and one check constraint swapped on a small table. The downgrade drops the table and
turns cached log rows into done ones.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-19 21:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OUTCOME = "ck_ai_requests_outcome_known"


def upgrade() -> None:
    op.create_table(
        "ai_answers",
        sa.Column("key", sa.LargeBinary(), nullable=False),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("feature", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("answer", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint(
            "feature IN ('tutor', 'what-if')", name=op.f("ck_ai_answers_feature_cached")
        ),
        sa.CheckConstraint("octet_length(key) = 32", name=op.f("ck_ai_answers_key_length")),
        sa.CheckConstraint(
            "char_length(model) BETWEEN 1 AND 64", name=op.f("ck_ai_answers_model_length")
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_ai_answers")),
    )
    op.create_index("ix_ai_answers_at", "ai_answers", ["at"])
    op.drop_constraint(op.f(OUTCOME), "ai_requests", type_="check")
    op.create_check_constraint(
        op.f(OUTCOME),
        "ai_requests",
        "outcome IN ('done', 'cut-short', 'refused', 'held', 'error', 'cancelled', 'cached')",
    )


def downgrade() -> None:
    op.execute("UPDATE ai_requests SET outcome = 'done' WHERE outcome = 'cached'")
    op.drop_constraint(op.f(OUTCOME), "ai_requests", type_="check")
    op.create_check_constraint(
        op.f(OUTCOME),
        "ai_requests",
        "outcome IN ('done', 'cut-short', 'refused', 'held', 'error', 'cancelled')",
    )
    op.drop_index("ix_ai_answers_at", table_name="ai_answers")
    op.drop_table("ai_answers")
