"""Consent, data export and deletion (ADR 0042)."""

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import legal
from app.auth.email import LogSender
from app.auth.policy import EXPORT_PAGE_ATTEMPTS
from app.models import (
    Attempt,
    ClassMember,
    Consent,
    EmailLinkToken,
    LiveMessage,
    LiveSession,
    RateLimit,
    SchoolClass,
    Session,
    User,
)
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher
from tests.test_sync import attempt, batch, event

TEACHER = "teacher@example.org"
VERSION = legal.current("terms", datetime.now(UTC).date()).version


def by_purpose(body: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {c["purpose"]: c for c in body["consents"]}


async def _student(code: str, name: str = "Kofi_A", attempts: int = 1) -> AsyncClient:
    student = browser()
    await join(student, code, name)
    pushed = await student.post(
        "/sync/push",
        json={"attempts": [batch(f"a-{i}") for i in range(1, attempts + 1)]},
    )
    assert pushed.status_code == 200, pushed.text
    return student


# Consent


async def test_joining_records_the_students_agreement(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    async with browser() as student:
        me = await join(student, made["code"])
        states = by_purpose((await student.get("/consents")).json())
    assert set(states) == {"terms", "privacy"}  # a student is never asked about analytics
    assert states["terms"]["granted"] is True
    assert states["terms"]["version"] == VERSION
    assert states["terms"]["needs_agreement"] is False
    rows = (
        await db.scalars(select(Consent).where(Consent.member_id == uuid.UUID(me["member_id"])))
    ).all()
    assert sorted((r.purpose, r.via) for r in rows) == [("privacy", "join"), ("terms", "join")]


async def test_signing_in_records_the_teachers_agreement_once(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    me = await sign_in_teacher(client, outbox, TEACHER)
    await sign_in_teacher(client, outbox, TEACHER)
    states = by_purpose((await client.get("/consents")).json())
    assert states["terms"]["needs_agreement"] is False
    assert states["analytics"]["granted"] is None  # analytics is off until chosen
    assert states["analytics"]["required"] is False
    count = await db.scalar(select(func.count()).where(Consent.user_id == uuid.UUID(me["id"])))
    assert count == 2  # terms and privacy, not again on the second sign-in


async def test_a_teacher_gives_and_withdraws_analytics_consent(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    given = await client.post(
        "/consents", json={"purpose": "analytics", "version": VERSION, "granted": True}
    )
    assert given.status_code == 200, given.text
    assert by_purpose(given.json())["analytics"]["granted"] is True
    taken = await client.post(
        "/consents", json={"purpose": "analytics", "version": VERSION, "granted": False}
    )
    assert by_purpose(taken.json())["analytics"]["granted"] is False
    exported = (await client.get("/export")).json()
    assert [(c["purpose"], c["granted"]) for c in exported["consents"]][-2:] == [
        ("analytics", True),
        ("analytics", False),
    ]


async def test_consent_choices_that_are_refused(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    stale = await client.post(
        "/consents", json={"purpose": "analytics", "version": "an old one", "granted": True}
    )
    assert stale.status_code == 409
    withdraw = await client.post(
        "/consents", json={"purpose": "terms", "version": VERSION, "granted": False}
    )
    assert withdraw.status_code == 422
    async with browser() as student:
        await join(student, made["code"])
        asked = await student.post(
            "/consents", json={"purpose": "analytics", "version": VERSION, "granted": True}
        )
        assert asked.status_code == 403
    signed_out = await browser().get("/consents")
    assert signed_out.status_code == 401


async def test_the_database_refuses_student_analytics(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    async with browser() as student:
        me = await join(student, made["code"])
    with pytest.raises(IntegrityError):
        async with db.begin_nested():
            db.add(
                Consent(
                    member_id=uuid.UUID(me["member_id"]),
                    purpose="analytics",
                    version=VERSION,
                    granted=True,
                    via="choice",
                )
            )


async def test_a_new_version_gives_notice_then_asks_again(
    client: AsyncClient, outbox: LogSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    today = datetime.now(UTC).date()
    soon = legal.Version("next", today + timedelta(days=legal.NOTICE_DAYS))
    pack = legal.DOCUMENTS["terms"]
    monkeypatch.setitem(
        legal.DOCUMENTS, "terms", legal.Document(pack.title, (*pack.versions, soon))
    )
    terms = by_purpose((await client.get("/consents")).json())["terms"]
    assert terms["upcoming_version"] == "next"
    assert terms["upcoming_from"] == soon.effective_from.isoformat()
    assert terms["needs_agreement"] is False  # the old version holds during the notice

    monkeypatch.setitem(
        legal.DOCUMENTS,
        "terms",
        legal.Document(pack.title, (*pack.versions, legal.Version("next", date(2000, 1, 1)))),
    )
    terms = by_purpose((await client.get("/consents")).json())["terms"]
    assert terms["current_version"] == "next"
    assert terms["needs_agreement"] is True
    agreed = await client.post(
        "/consents", json={"purpose": "terms", "version": "next", "granted": True}
    )
    assert by_purpose(agreed.json())["terms"]["needs_agreement"] is False


# Export


async def test_a_student_exports_their_own_work_as_attempt_files(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    await client.patch("/auth/me", json={"display_name": "Mr Mensah"})
    made = await create_class(client)
    kofi = await _student(made["code"], "Kofi_A", attempts=2)
    ama = await _student(made["code"], "Ama.S", attempts=1)
    summary = (await kofi.get("/export")).json()
    assert summary["format"] == "physics-anatomy/export"
    assert summary["kind"] == "student"
    assert summary["display_name"] == "Kofi_A"
    assert summary["class_name"] == made["name"]
    assert summary["teacher_name"] == "Mr Mensah"
    assert summary["attempts"] == 2
    assert {c["purpose"] for c in summary["consents"]} == {"terms", "privacy"}

    page = (await kofi.get("/export/attempts")).json()
    assert page["more"] is False
    assert [f["attempt"]["id"] for f in page["attempts"]] == ["a-1", "a-2"]
    first = page["attempts"][0]
    # The lab's attempt file, as packages/engine writes and imports it.
    assert first["format"] == "physics-anatomy/attempt"
    assert first["version"] == 1
    assert first["attempt"] == attempt("a-1")
    assert first["events"] == [event(i, "a-1") for i in (1, 2, 3)]

    # Ama's export holds only Ama's attempt.
    theirs = (await ama.get("/export/attempts")).json()
    assert len(theirs["attempts"]) == 1
    await kofi.aclose()
    await ama.aclose()


async def test_a_teachers_export_holds_no_students(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    kofi = await _student(made["code"])
    pushed = await client.post("/sync/push", json={"attempts": [batch("mine")]})
    assert pushed.status_code == 200
    summary = (await client.get("/export")).json()
    assert summary["kind"] == "teacher"
    assert summary["email"] == TEACHER
    assert summary["attempts"] == 1
    assert summary["classes"] == [
        {
            "id": made["id"],
            "name": made["name"],
            "code": made["code"],
            "joining_open": True,
            "ai_enabled": False,
            "school_permission_confirmed_at": summary["classes"][0][
                "school_permission_confirmed_at"
            ],
            "created_at": made["created_at"],
            "students": 1,
        }
    ]
    assert "Kofi_A" not in str(summary)
    page = (await client.get("/export/attempts")).json()
    assert [f["attempt"]["id"] for f in page["attempts"]] == ["mine"]
    await kofi.aclose()


async def test_export_pages_follow_the_cursor(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    total = EXPORT_PAGE_ATTEMPTS + 3
    pushed = await client.post(
        "/sync/push", json={"attempts": [batch(f"t-{i:02}", n=1) for i in range(20)]}
    )
    assert pushed.status_code == 200
    pushed = await client.post(
        "/sync/push", json={"attempts": [batch(f"t-{i:02}", n=1) for i in range(20, total)]}
    )
    assert pushed.status_code == 200
    seen: list[str] = []
    after = ""
    while True:
        page = (await client.get("/export/attempts", params={"after": after})).json()
        seen += [f["attempt"]["id"] for f in page["attempts"]]
        after = page["cursor"]
        if not page["more"]:
            break
    assert sorted(seen) == sorted(f"t-{i:02}" for i in range(total))
    assert len(seen) == len(set(seen))
    bad = await client.get("/export/attempts", params={"after": "nonsense"})
    assert bad.status_code == 422


async def test_a_teacher_exports_one_student_for_a_parent(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    kofi = await _student(made["code"], attempts=2)
    member_id = (await kofi.get("/auth/me")).json()["member_id"]
    base = f"/classes/{made['id']}/members/{member_id}/export"
    summary = (await client.get(base)).json()
    assert summary["display_name"] == "Kofi_A"
    assert summary["attempts"] == 2
    page = (await client.get(f"{base}/attempts")).json()
    assert [f["attempt"]["id"] for f in page["attempts"]] == ["a-1", "a-2"]

    # Another teacher, or the student, cannot.
    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        assert (await other.get(base)).status_code == 404
        assert (await other.get(f"{base}/attempts")).status_code == 404
        theirs = await create_class(other, "Their class")
        wrong_class = f"/classes/{theirs['id']}/members/{member_id}/export"
        assert (await other.get(wrong_class)).status_code == 404
    assert (await kofi.get(base)).status_code == 403
    await kofi.aclose()


# Deletion


async def test_removing_a_student_deletes_their_work_and_signs_them_out(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    me = await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    kofi = await _student(made["code"], "Kofi_A")
    ama = await _student(made["code"], "Ama.S")
    kofi_id = uuid.UUID((await kofi.get("/auth/me")).json()["member_id"])
    ama_id = uuid.UUID((await ama.get("/auth/me")).json()["member_id"])
    live = LiveSession(
        class_id=uuid.UUID(made["id"]),
        started_by=uuid.UUID(me["id"]),
        experiment_id="simple-pendulum",
        lesson_minutes=40,
    )
    db.add(live)
    await db.flush()
    note = LiveMessage(
        session_id=live.id,
        kind="note",
        to_member_ids=[kofi_id],
        data={"text": "Count from zero."},
        sent_by=uuid.UUID(me["id"]),
    )
    hint = LiveMessage(
        session_id=live.id,
        kind="hint",
        to_member_ids=[kofi_id, ama_id],
        data={"rule": "counts-from-one", "key": "pendulum.counts-from-one"},
        sent_by=uuid.UUID(me["id"]),
    )
    db.add_all([note, hint])
    await db.flush()

    removed = await client.delete(f"/classes/{made['id']}/members/{kofi_id}")
    assert removed.status_code == 204
    assert (await kofi.get("/auth/me")).status_code == 401
    assert await db.get(ClassMember, kofi_id) is None
    for table, column in ((Attempt, Attempt.member_id), (Consent, Consent.member_id)):
        assert (
            await db.scalar(select(func.count()).select_from(table).where(column == kofi_id)) == 0
        )
    assert await db.scalar(select(func.count()).where(Session.member_id == kofi_id)) == 0
    assert await db.scalar(select(func.count()).where(LiveMessage.id == note.id)) == 0
    await db.refresh(hint)
    assert hint.to_member_ids == [ama_id]
    # Ama is untouched.
    assert len((await ama.get("/export/attempts")).json()["attempts"]) == 1
    # Removing again, or from someone else's class, finds nothing.
    assert (await client.delete(f"/classes/{made['id']}/members/{kofi_id}")).status_code == 404
    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        assert (await other.delete(f"/classes/{made['id']}/members/{ama_id}")).status_code == 404
    await kofi.aclose()
    await ama.aclose()


async def test_a_teacher_deletes_their_account_and_everything_in_it(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    me = await sign_in_teacher(client, outbox, TEACHER)
    user_id = uuid.UUID(me["id"])
    made = await create_class(client)
    kofi = await _student(made["code"])
    await client.post("/sync/push", json={"attempts": [batch("mine")]})
    # Another browser of the same teacher, and a sign-in link still unused.
    async with browser() as laptop:
        await sign_in_teacher(laptop, outbox, TEACHER)
        await laptop.post("/auth/email-link", json={"email": TEACHER})

        wrong = await client.post("/account/delete", json={"confirm_email": "else@example.org"})
        assert wrong.status_code == 422
        deleted = await client.post(
            "/account/delete", json={"confirm_email": "Teacher@Example.org"}
        )
        assert deleted.status_code == 204, deleted.text
        assert "max-age=0" in deleted.headers["set-cookie"].lower()

        assert (await laptop.get("/auth/me")).status_code == 401
    assert (await client.get("/auth/me")).status_code == 401
    assert (await kofi.get("/auth/me")).status_code == 401
    assert await db.get(User, user_id) is None
    assert await db.scalar(select(func.count()).select_from(SchoolClass)) == 0
    assert await db.scalar(select(func.count()).select_from(ClassMember)) == 0
    assert await db.scalar(select(func.count()).select_from(Attempt)) == 0
    assert await db.scalar(select(func.count()).select_from(Consent)) == 0
    assert await db.scalar(select(func.count()).select_from(Session)) == 0
    assert await db.scalar(select(func.count()).where(EmailLinkToken.email == TEACHER)) == 0
    assert await db.scalar(select(func.count()).where(RateLimit.key.like(f"%{TEACHER}%"))) == 0
    await kofi.aclose()


async def test_deleting_an_account_needs_a_recent_sign_in(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    me = await sign_in_teacher(client, outbox, TEACHER)
    await db.execute(
        update(Session)
        .where(Session.user_id == uuid.UUID(me["id"]))
        .values(created_at=datetime.now(UTC) - timedelta(hours=2))
    )
    refused = await client.post("/account/delete", json={"confirm_email": TEACHER})
    assert refused.status_code == 403
    assert await db.get(User, uuid.UUID(me["id"])) is not None


async def test_students_cannot_delete_accounts_or_remove_classmates(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, TEACHER)
    made = await create_class(client)
    kofi = await _student(made["code"])
    ama = await _student(made["code"], "Ama.S")
    ama_id = (await ama.get("/auth/me")).json()["member_id"]
    assert (await kofi.post("/account/delete", json={"confirm_email": TEACHER})).status_code == 403
    assert (await kofi.delete(f"/classes/{made['id']}/members/{ama_id}")).status_code == 403
    await kofi.aclose()
    await ama.aclose()
