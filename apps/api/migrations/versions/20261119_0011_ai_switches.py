"""The AI switches (ai-quotas-brief.md, decision 4): all AI, and one per feature.

A new, empty table: every switch is on until staff turn one off. The downgrade drops it.

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-19 23:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_switches",
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "name IN ('all', 'tutor', 'what-if', 'report-review', 'question-drafting')",
            name=op.f("ck_ai_switches_name_known"),
        ),
        sa.PrimaryKeyConstraint("name", name=op.f("pk_ai_switches")),
    )


def downgrade() -> None:
    op.drop_table("ai_switches")
