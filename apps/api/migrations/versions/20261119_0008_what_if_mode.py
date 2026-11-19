"""What-if attempts: a scenario on the bench, not marked (docs/content/ai-tutor-brief.md).

Swaps one check constraint on attempts; the downgrade refuses while what-if attempts exist.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-19 20:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NAME = "ck_attempts_mode_known"


def upgrade() -> None:
    op.drop_constraint(op.f(NAME), "attempts", type_="check")
    op.create_check_constraint(
        op.f(NAME), "attempts", "mode IN ('guided', 'exam', 'own-data', 'what-if')"
    )


def downgrade() -> None:
    op.drop_constraint(op.f(NAME), "attempts", type_="check")
    op.create_check_constraint(op.f(NAME), "attempts", "mode IN ('guided', 'exam', 'own-data')")
