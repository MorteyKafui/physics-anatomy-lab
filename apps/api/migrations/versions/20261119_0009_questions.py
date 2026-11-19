"""The question bank (docs/content/ai-questions-brief.md).

A new table only, so it takes no locks on existing data; the downgrade drops it.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-19 22:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "questions",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("experiment_id", sa.Text(), nullable=False),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("marks", sa.Integer(), nullable=False),
        sa.Column("state", sa.Text(), server_default=sa.text("'submitted'"), nullable=False),
        sa.Column("submitted_by", sa.UUID(), nullable=True),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("reviewed_by", postgresql.CITEXT(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "experiment_id ~ '^[a-z][a-z0-9.-]{1,63}$'",
            name=op.f("ck_questions_experiment_format"),
        ),
        sa.CheckConstraint("topic ~ '^[a-z][a-z-]{1,31}$'", name=op.f("ck_questions_topic_format")),
        sa.CheckConstraint(
            "char_length(question) BETWEEN 10 AND 400", name=op.f("ck_questions_question_length")
        ),
        sa.CheckConstraint(
            "char_length(answer) BETWEEN 5 AND 800", name=op.f("ck_questions_answer_length")
        ),
        sa.CheckConstraint("marks BETWEEN 1 AND 4", name=op.f("ck_questions_marks_range")),
        sa.CheckConstraint(
            "state IN ('submitted', 'approved', 'rejected')", name=op.f("ck_questions_state_known")
        ),
        sa.CheckConstraint(
            "(state = 'submitted') = (reviewed_at IS NULL)",
            name=op.f("ck_questions_reviewed_when_decided"),
        ),
        sa.CheckConstraint(
            "state <> 'rejected' OR char_length(reason) BETWEEN 1 AND 300",
            name=op.f("ck_questions_rejected_why"),
        ),
        sa.ForeignKeyConstraint(
            ["submitted_by"],
            ["users.id"],
            name=op.f("fk_questions_submitted_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_questions")),
    )
    op.create_index(
        "ix_questions_state_submitted_at",
        "questions",
        ["state", sa.text("submitted_at DESC")],
    )
    op.create_index("ix_questions_experiment_id_state", "questions", ["experiment_id", "state"])
    op.create_index(op.f("ix_questions_submitted_by"), "questions", ["submitted_by"])


def downgrade() -> None:
    op.drop_index(op.f("ix_questions_submitted_by"), table_name="questions")
    op.drop_index("ix_questions_experiment_id_state", table_name="questions")
    op.drop_index("ix_questions_state_submitted_at", table_name="questions")
    op.drop_table("questions")
