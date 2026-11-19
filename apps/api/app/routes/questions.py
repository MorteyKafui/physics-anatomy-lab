"""The question bank (docs/content/ai-questions-brief.md).

- A teacher drafts with Claude (`POST /ai/question-drafting`, in routes/ai.py), edits, and sends
  questions for review (`POST /questions`), then follows them (`GET /questions/mine`).
- Staff review them in the admin portal (`/admin/questions…`), each decision in the audit log.
- Exam mode reads the approved ones for an experiment (`GET /questions/approved`), shared with
  everyone using it: the reviewer's approval is the content review.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.admin.access import CurrentStaff, require_staff
from app.admin.audit import record
from app.ai.questions import FACTS, NOT_READY, Topic, clean_question
from app.auth.policy import Limit
from app.auth.sessions import CurrentTeacher
from app.db import Db
from app.models import Question, User
from app.schemas import Body

log = structlog.get_logger()

# Until item 4's quotas: drafts a teacher may ask for each day, and questions waiting at once.
DRAFTS_PER_TEACHER = Limit("question-draft:user", 20, timedelta(days=1))
MAX_WAITING = 30

router = APIRouter(prefix="/questions", tags=["questions"])
admin_router = APIRouter(
    prefix="/admin/questions", tags=["admin"], dependencies=[Depends(require_staff)]
)


class QuestionIn(Body):
    question: Annotated[str, Field(min_length=1, max_length=600)]
    answer: Annotated[str, Field(min_length=1, max_length=1000)]
    marks: Annotated[int, Field(ge=1, le=4)]


class Submission(Body):
    experiment_id: Annotated[str, Field(pattern=r"^[a-z][a-z0-9.-]{1,63}$")]
    topic: Topic
    questions: Annotated[list[QuestionIn], Field(min_length=1, max_length=3)]


class QuestionOut(BaseModel):
    id: uuid.UUID
    experiment_id: str
    topic: str
    question: str
    answer: str
    marks: int
    state: Literal["submitted", "approved", "rejected"]
    reason: str | None
    submitted_at: datetime
    reviewed_at: datetime | None


class ApprovedQuestion(BaseModel):
    id: uuid.UUID
    question: str
    answer: str
    marks: int


class QuestionReview(QuestionOut):
    submitted_by: str | None = Field(description="The teacher's email, for staff (ADR 0040).")
    reviewed_by: str | None


class Approval(Body):
    """Approve as sent, or with the reviewer's edits."""

    question: Annotated[str | None, Field(max_length=600)] = None
    answer: Annotated[str | None, Field(max_length=1000)] = None
    marks: Annotated[int | None, Field(ge=1, le=4)] = None


class Rejection(Body):
    reason: Annotated[str, Field(min_length=1, max_length=300)]


def out(row: Question) -> QuestionOut:
    return QuestionOut(
        id=row.id,
        experiment_id=row.experiment_id,
        topic=row.topic,
        question=row.question,
        answer=row.answer,
        marks=row.marks,
        state=row.state,  # type: ignore[arg-type]
        reason=row.reason,
        submitted_at=row.submitted_at,
        reviewed_at=row.reviewed_at,
    )


UNUSABLE = (
    "A question must be 10 to 400 characters, its answer 5 to 800, and use no number except "
    "the experiment's stated settings."
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_questions(body: Submission, db: Db, teacher: CurrentTeacher) -> list[QuestionOut]:
    """Send up to three drafted, edited questions for review. Nothing reaches a student yet."""
    facts = FACTS.get(body.experiment_id)
    if facts is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=NOT_READY)
    cleaned = [clean_question(q.question, q.answer, q.marks, facts) for q in body.questions]
    if any(c is None for c in cleaned):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=UNUSABLE)
    waiting = await db.scalar(
        select(func.count())
        .select_from(Question)
        .where(Question.submitted_by == teacher.user.id, Question.state == "submitted")
    )
    if (waiting or 0) + len(cleaned) > MAX_WAITING:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You have {waiting} questions waiting for review. "
            "Wait for some to be reviewed.",
        )
    rows = [
        Question(
            experiment_id=body.experiment_id,
            topic=body.topic,
            submitted_by=teacher.user.id,
            **c,  # type: ignore[arg-type]
        )
        for c in cleaned
    ]
    db.add_all(rows)
    await db.flush()
    for row in rows:
        await db.refresh(row)
    log.info("questions.submitted", user_id=str(teacher.user.id), n=len(rows))
    return [out(r) for r in rows]


@router.get("/mine")
async def my_questions(db: Db, teacher: CurrentTeacher) -> list[QuestionOut]:
    """The questions this teacher sent, newest first, with their state."""
    rows = await db.scalars(
        select(Question)
        .where(Question.submitted_by == teacher.user.id)
        .order_by(Question.submitted_at.desc())
        .limit(200)
    )
    return [out(r) for r in rows]


@router.get("/approved")
async def approved_questions(
    db: Db, experiment_id: Annotated[str, Query(pattern=r"^[a-z][a-z0-9.-]{1,63}$")]
) -> list[ApprovedQuestion]:
    """The bank's approved questions for an experiment, for exam mode. No account needed."""
    rows = await db.scalars(
        select(Question)
        .where(Question.experiment_id == experiment_id, Question.state == "approved")
        .order_by(Question.reviewed_at, Question.id)
        .limit(100)
    )
    return [
        ApprovedQuestion(id=r.id, question=r.question, answer=r.answer, marks=r.marks) for r in rows
    ]


# Staff review (the admin portal's Question bank)


async def _review_out(db: Db, row: Question) -> QuestionReview:
    email = await db.scalar(select(User.email).where(User.id == row.submitted_by))
    return QuestionReview(**out(row).model_dump(), submitted_by=email, reviewed_by=row.reviewed_by)


async def _locked(db: Db, question_id: uuid.UUID) -> Question:
    row = await db.scalar(select(Question).where(Question.id == question_id).with_for_update())
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No question with that id.")
    return row


@admin_router.get("")
async def admin_list_questions(
    db: Db,
    staff: CurrentStaff,
    state: Literal["submitted", "approved", "rejected"] = "submitted",
) -> list[QuestionReview]:
    """Questions in one state, newest first (waiting ones by default)."""
    rows = (
        await db.scalars(
            select(Question)
            .where(Question.state == state)
            .order_by(Question.submitted_at.desc())
            .limit(200)
        )
    ).all()
    return [await _review_out(db, r) for r in rows]


@admin_router.post("/{question_id}/approve")
async def admin_approve_question(
    question_id: uuid.UUID, body: Approval, db: Db, staff: CurrentStaff
) -> QuestionReview:
    """Approve a waiting question, as sent or with edits; it joins exam mode for everyone."""
    row = await _locked(db, question_id)
    if row.state != "submitted":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="That question is already reviewed.")
    facts = FACTS.get(row.experiment_id)
    edited = body.question is not None or body.answer is not None or body.marks is not None
    if edited:
        clean = (
            clean_question(
                body.question if body.question is not None else row.question,
                body.answer if body.answer is not None else row.answer,
                body.marks if body.marks is not None else row.marks,
                facts,
            )
            if facts
            else None
        )
        if clean is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=UNUSABLE)
        row.question, row.answer, row.marks = clean["question"], clean["answer"], clean["marks"]
    row.state = "approved"
    row.reviewed_by = staff.email
    row.reviewed_at = datetime.now(UTC)
    row.reason = None
    await record(db, staff, "question.approve", "question", row.id, {"edited": edited})
    return await _review_out(db, row)


@admin_router.post("/{question_id}/reject")
async def admin_reject_question(
    question_id: uuid.UUID, body: Rejection, db: Db, staff: CurrentStaff
) -> QuestionReview:
    """Reject a waiting question, with a reason the teacher sees."""
    row = await _locked(db, question_id)
    if row.state != "submitted":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="That question is already reviewed.")
    row.state = "rejected"
    row.reason = " ".join(body.reason.split())
    row.reviewed_by = staff.email
    row.reviewed_at = datetime.now(UTC)
    # The reason is the reviewer's own words about content, not personal data, but the audit
    # line keeps only that a question was rejected.
    await record(db, staff, "question.reject", "question", row.id, {})
    return await _review_out(db, row)


@admin_router.post("/{question_id}/reopen")
async def admin_reopen_question(
    question_id: uuid.UUID, db: Db, staff: CurrentStaff
) -> QuestionReview:
    """Undo a decision (the portal's undo toast): the question waits for review again."""
    row = await _locked(db, question_id)
    if row.state == "submitted":
        return await _review_out(db, row)
    was = row.state
    row.state, row.reason, row.reviewed_by, row.reviewed_at = "submitted", None, None, None
    await record(db, staff, "question.reopen", "question", row.id, {"was": was})
    return await _review_out(db, row)
