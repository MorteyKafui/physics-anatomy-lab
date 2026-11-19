"""A held reply is its own outcome in the AI log (the tutor's number check).

Swaps one check constraint on a small table; the downgrade turns held rows into refused ones.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-19 18:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NAME = "ck_ai_requests_outcome_known"


def upgrade() -> None:
    op.drop_constraint(op.f(NAME), "ai_requests", type_="check")
    op.create_check_constraint(
        op.f(NAME),
        "ai_requests",
        "outcome IN ('done', 'cut-short', 'refused', 'held', 'error', 'cancelled')",
    )


def downgrade() -> None:
    op.execute("UPDATE ai_requests SET outcome = 'refused' WHERE outcome = 'held'")
    op.drop_constraint(op.f(NAME), "ai_requests", type_="check")
    op.create_check_constraint(
        op.f(NAME),
        "ai_requests",
        "outcome IN ('done', 'cut-short', 'refused', 'error', 'cancelled')",
    )
