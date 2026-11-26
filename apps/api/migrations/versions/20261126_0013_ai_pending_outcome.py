"""An AI request is logged as pending when it starts (ASVS review, finding C).

The row is written before the request reaches Claude and filled in when the reply ends, so
requests sent at the same time are all counted towards the quota and the budget. Swaps one check
constraint on a small table; the downgrade turns pending rows into errors.

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-26 09:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NAME = "ck_ai_requests_outcome_known"
ENDED = "'done', 'cut-short', 'refused', 'held', 'error', 'cancelled', 'cached'"


def upgrade() -> None:
    op.drop_constraint(op.f(NAME), "ai_requests", type_="check")
    op.create_check_constraint(op.f(NAME), "ai_requests", f"outcome IN ({ENDED}, 'pending')")


def downgrade() -> None:
    op.execute("UPDATE ai_requests SET outcome = 'error' WHERE outcome = 'pending'")
    op.drop_constraint(op.f(NAME), "ai_requests", type_="check")
    op.create_check_constraint(op.f(NAME), "ai_requests", f"outcome IN ({ENDED})")
