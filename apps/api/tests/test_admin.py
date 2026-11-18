"""The admin API (ADR 0040): Cloudflare Access checked, counts right, every change audited."""

import time
import uuid
from collections.abc import AsyncGenerator, AsyncIterator, Iterator
from typing import Any

import httpx
import pytest
from httpx import AsyncClient
from joserfc import jwt
from joserfc.jwk import Key, KeySet, RSAKey
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.access import AccessVerifier, get_access_verifier
from app.admin.db import get_admin_read_db
from app.admin.queries import now_ms
from app.auth.email import LogSender
from app.config import Settings
from app.main import app
from app.models import AdminAudit, ClassMember, SchoolClass
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher

TEAM = "physics-anatomy-test.cloudflareaccess.com"
AUD = "aud-tag-for-the-admin-app"
STAFF = "staff@example.org"
KEY = RSAKey.generate_key(2048, parameters={"kid": "key-1"})
OTHER_KEY = RSAKey.generate_key(2048, parameters={"kid": "key-1"})


def fake_cloudflare(*keys: RSAKey) -> httpx.MockTransport:
    served: list[Key] = list(keys)

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == f"https://{TEAM}/cdn-cgi/access/certs"
        return httpx.Response(200, json=KeySet(served).as_dict(private=False))

    return httpx.MockTransport(handler)


def token(key: RSAKey = KEY, **changes: Any) -> str:
    now = int(time.time())
    claims: dict[str, Any] = {
        "iss": f"https://{TEAM}",
        "aud": [AUD],
        "email": STAFF,
        "sub": "staff-sub",
        "iat": now,
        "nbf": now,
        "exp": now + 600,
    }
    claims.update(changes)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode({"alg": "RS256", "kid": key.kid}, claims, key)


@pytest.fixture
def access() -> Iterator[None]:
    verifier = AccessVerifier(TEAM, AUD, transport=fake_cloudflare(KEY))
    app.dependency_overrides[get_access_verifier] = lambda: verifier
    yield
    app.dependency_overrides.pop(get_access_verifier, None)


@pytest.fixture
async def staff(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    """The admin portal's server, as a staff member in local development (the dev bypass)."""
    verifier = AccessVerifier(None, None, dev_bypass_email=STAFF)
    app.dependency_overrides[get_access_verifier] = lambda: verifier
    app.dependency_overrides[get_admin_read_db] = lambda: db
    async with AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        yield c
    app.dependency_overrides.pop(get_access_verifier, None)
    app.dependency_overrides.pop(get_admin_read_db, None)


async def me(headers: dict[str, str] | None = None) -> httpx.Response:
    async with AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        return await c.get("/admin/me", headers=headers or {})


def assertion(value: str) -> dict[str, str]:
    return {"Cf-Access-Jwt-Assertion": value}


# --- Who may call ---------------------------------------------------------------------------


async def test_the_admin_api_is_closed_until_access_is_set_up() -> None:
    app.dependency_overrides[get_access_verifier] = lambda: AccessVerifier(None, None)
    try:
        assert (await me()).status_code == 503
        assert (await me(assertion(token()))).status_code == 503
    finally:
        app.dependency_overrides.pop(get_access_verifier, None)


async def test_a_valid_access_token_names_the_staff_member(access: None) -> None:
    response = await me(assertion(token()))
    assert response.status_code == 200, response.text
    assert response.json() == {"email": STAFF, "via": "access", "environment": "test"}


async def test_an_audience_given_as_a_plain_string_also_works(access: None) -> None:
    assert (await me(assertion(token(aud=AUD)))).status_code == 200


@pytest.mark.parametrize(
    "bad",
    [
        pytest.param({}, id="no token"),
        pytest.param({"aud": ["another-app"]}, id="another application"),
        pytest.param({"iss": "https://someone-else.cloudflareaccess.com"}, id="another team"),
        pytest.param({"exp": int(time.time()) - 120}, id="expired"),
        pytest.param({"nbf": int(time.time()) + 600}, id="not yet valid"),
        pytest.param({"email": None, "common_name": "ci-bot"}, id="service token"),
        pytest.param({"key": OTHER_KEY}, id="signed by another key"),
        pytest.param({"raw": "not-a-token"}, id="not a token"),
    ],
)
async def test_anything_but_a_valid_staff_token_is_refused(
    access: None, bad: dict[str, Any]
) -> None:
    if not bad:
        headers: dict[str, str] = {}
    elif "raw" in bad:
        headers = assertion(bad["raw"])
    elif "key" in bad:
        headers = assertion(token(key=bad["key"]))
    else:
        headers = assertion(token(**bad))
    assert (await me(headers)).status_code == 401


async def test_the_staff_list_is_a_second_check() -> None:
    verifier = AccessVerifier(
        TEAM, AUD, staff_emails=["someone@example.org"], transport=fake_cloudflare(KEY)
    )
    app.dependency_overrides[get_access_verifier] = lambda: verifier
    try:
        assert (await me(assertion(token()))).status_code == 403
        assert (await me(assertion(token(email="Someone@Example.org")))).status_code == 200
    finally:
        app.dependency_overrides.pop(get_access_verifier, None)


async def test_a_rotated_key_is_fetched_again() -> None:
    new_key = RSAKey.generate_key(2048, parameters={"kid": "key-2"})
    served: list[Key] = [KEY]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=KeySet(served).as_dict(private=False))

    verifier = AccessVerifier(TEAM, AUD, transport=httpx.MockTransport(handler))
    app.dependency_overrides[get_access_verifier] = lambda: verifier
    try:
        assert (await me(assertion(token()))).status_code == 200
        served.append(new_key)
        verifier._keys_at -= 120  # pyright: ignore[reportPrivateUsage]  (past the refetch pause)
        assert (await me(assertion(token(key=new_key)))).status_code == 200
    finally:
        app.dependency_overrides.pop(get_access_verifier, None)


async def test_the_web_apps_student_and_teacher_sessions_open_nothing_here(
    client: AsyncClient, outbox: LogSender, access: None
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    assert (await client.get("/admin/me")).status_code == 401


def test_the_dev_bypass_is_refused_on_deployed_servers() -> None:
    for environment in ("preview", "staging", "production"):
        with pytest.raises(ValidationError, match="ADMIN_DEV_BYPASS_EMAIL"):
            Settings(
                environment=environment,  # pyright: ignore[reportArgumentType]
                client_ip_header="cf-connecting-ip",
                admin_dev_bypass_email=STAFF,
            )
    with pytest.raises(ValidationError, match="CF_ACCESS"):
        Settings(cf_access_team_domain=TEAM)


# --- What staff see ---------------------------------------------------------------------------


def _attempt(attempt_id: str, created: int, experiment: str = "simple-pendulum") -> dict[str, Any]:
    return {
        "id": attempt_id,
        "experimentId": experiment,
        "mode": "guided",
        "seed": 1,
        "createdAt": created,
        "updatedAt": created + 10_000,
        "formatVersion": 1,
    }


def _events(attempt_id: str, created: int, steps: int, hints: int = 0) -> list[dict[str, Any]]:
    from app.admin.queries import STEPS

    out: list[dict[str, Any]] = []
    n = 0
    for i in range(steps):
        n += 1
        out.append(
            {
                "id": f"{attempt_id}-s{i}",
                "attemptId": attempt_id,
                "seq": n,
                "device": "device-1",
                "at": created + n * 60_000,
                "kind": "step.complete",
                "data": {"step": STEPS[i]},
            }
        )
    for i in range(hints):
        n += 1
        out.append(
            {
                "id": f"{attempt_id}-h{i}",
                "attemptId": attempt_id,
                "seq": n,
                "device": "device-1",
                "at": created + n * 60_000,
                "kind": "coach.hint",
                "data": {
                    "hint": "findings.pendulum.countFromOne",
                    "rule": "pendulum-count-from-one",
                    "skill": "measurement",
                    "level": "hint",
                },
            }
        )
    return out


async def _a_class_with_work(outbox: LogSender) -> dict[str, Any]:
    """A teacher, a class with two students: one reached the report, one stopped at Tabulate."""
    created = now_ms() - 3_600_000
    async with browser() as teacher:
        await sign_in_teacher(teacher, outbox, "t@example.org")
        made = await create_class(teacher)
    for name, steps, hints in (("Kofi_A", 10, 2), ("Ama_B", 5, 1)):
        async with browser() as student:
            await join(student, made["code"], name)
            pushed = await student.post(
                "/sync/push",
                json={
                    "attempts": [
                        {
                            "attempt": _attempt(f"a-{name}", created),
                            "events": _events(f"a-{name}", created, steps, hints),
                        }
                    ]
                },
            )
            assert pushed.status_code == 200, pushed.text
    return made


async def test_the_overview_counts_real_work(staff: AsyncClient, outbox: LogSender) -> None:
    await _a_class_with_work(outbox)
    response = await staff.get("/admin/overview", params={"range": "24h"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["students"] == {"members": 2, "active_30_days": 2, "teachers": 1}
    assert body["classes"] == {"total": 1, "ai_on": 0, "joining_open": 1}
    assert sum(body["reports"]) == 1 and len(body["reports"]) == 24
    reached = {s["step"]: s["attempts"] for s in body["stages"]}
    assert reached["question"] == 2 and reached["tabulate"] == 2 and reached["plot"] == 1
    assert reached["report"] == 1
    [mistake] = body["mistakes"]
    assert (mistake["students"], mistake["hints"]) == (2, 3)
    assert body["experiments"][0]["reports"] == 1
    assert body["database_bytes"] > 0


async def test_usage_learning_content_and_system_answer(
    staff: AsyncClient, outbox: LogSender
) -> None:
    await _a_class_with_work(outbox)
    usage = (await staff.get("/admin/usage", params={"range": "7d"})).json()
    question = next(t for t in usage["step_minutes"] if t["step"] == "question")
    assert question["minutes"] == pytest.approx(1.0)
    learning = (await staff.get("/admin/learning", params={"experiment": "simple-pendulum"})).json()
    measurement = next(s for s in learning["skills"] if s["skill"] == "measurement")
    assert sum(measurement["hints"]) == 3
    content = (await staff.get("/admin/content")).json()
    assert content[0]["experiment_id"] == "simple-pendulum" and content[0]["students"] == 2
    system = (await staff.get("/admin/system")).json()
    assert system["migration"] and sum(system["attempts_synced_per_day"]) == 2
    assert (await staff.get("/admin/overview", params={"range": "1y"})).status_code == 422


async def test_people_lists_show_display_names_and_never_student_contacts(
    staff: AsyncClient, outbox: LogSender
) -> None:
    made = await _a_class_with_work(outbox)
    [row] = (await staff.get("/admin/people/classes")).json()
    assert row["code"] == made["code"] and row["members"] == 2
    members = (await staff.get(f"/admin/people/classes/{made['id']}/members")).json()
    assert {m["display_name"] for m in members} == {"Kofi_A", "Ama_B"}
    assert set(members[0]) == {"id", "display_name", "created_at", "attempts"}


# --- What staff change, and the audit ---------------------------------------------------------


async def _audit(db: AsyncSession) -> list[AdminAudit]:
    return list((await db.scalars(select(AdminAudit).order_by(AdminAudit.at))).all())


async def test_turning_ai_off_for_a_class_is_audited(
    staff: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _a_class_with_work(outbox)
    on = await staff.post(f"/admin/classes/{made['id']}/ai", json={"enabled": True})
    assert on.status_code == 200, on.text
    assert on.json()["ai_enabled"] is True
    off = await staff.post(
        f"/admin/classes/{made['id']}/ai", json={"enabled": False, "reason": "Undo"}
    )
    assert off.json()["ai_enabled"] is False
    assert (await db.get(SchoolClass, uuid.UUID(made["id"]))).ai_enabled is False  # type: ignore[union-attr]
    entries = await _audit(db)
    assert [(e.action, e.detail["enabled"], e.detail["was"]) for e in entries] == [
        ("class.ai.set", True, False),
        ("class.ai.set", False, True),
    ]
    assert all(e.actor_email == STAFF and e.actor_via == "dev-bypass" for e in entries)
    page = (await staff.get("/admin/audit", params={"limit": 1})).json()
    assert len(page["entries"]) == 1 and page["entries"][0]["detail"]["reason"] == "Undo"
    older = (await staff.get("/admin/audit", params={"before": page["next_before"]})).json()
    assert [e["detail"]["enabled"] for e in older["entries"]] == [True]
    assert older["next_before"] is None


async def test_replacing_a_flagged_name_keeps_no_copy_of_it(
    staff: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _a_class_with_work(outbox)
    async with browser() as student:
        await join(student, made["code"], "Esi 024 55")
    flagged = (await staff.get("/admin/overview")).json()["flagged_names"]
    assert [f["display_name"] for f in flagged] == ["Esi 024 55"]

    taken = await staff.post(
        f"/admin/members/{flagged[0]['member_id']}/display-name",
        json={"display_name": "Kofi_A"},
    )
    assert taken.status_code == 409
    assert await _audit(db) == []

    replaced = await staff.post(
        f"/admin/members/{flagged[0]['member_id']}/display-name",
        json={"display_name": "Student 3", "reason": "Looked like a phone number"},
    )
    assert replaced.status_code == 200, replaced.text
    assert replaced.json()["display_name"] == "Student 3"
    [entry] = await _audit(db)
    assert entry.action == "member.display-name.replace"
    assert "Esi" not in str(entry.detail) and "Student 3" not in str(entry.detail)
    names = (await db.scalars(select(ClassMember.display_name))).all()
    assert "Esi 024 55" not in names
    assert (await staff.get("/admin/overview")).json()["flagged_names"] == []


async def test_an_export_is_a_csv_and_is_audited(
    staff: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await _a_class_with_work(outbox)
    response = await staff.post("/admin/exports", json={"report": "stages", "range": "24h"})
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    lines = response.text.splitlines()
    assert lines[0] == "experiment,step,attempts,students" and len(lines) == 11
    classes = await staff.post("/admin/exports", json={"report": "classes"})
    assert "Kofi_A" not in classes.text
    assert [(e.action, e.detail["report"]) for e in await _audit(db)] == [
        ("export.create", "stages"),
        ("export.create", "classes"),
    ]


async def test_the_audit_log_cannot_be_changed_or_cut_short(
    staff: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    made = await _a_class_with_work(outbox)
    await staff.post(f"/admin/classes/{made['id']}/ai", json={"enabled": True})
    for statement in ("UPDATE admin_audit SET action = 'x.y.z'", "DELETE FROM admin_audit"):
        with pytest.raises(DBAPIError, match="admin_audit"):
            async with db.begin_nested():
                await db.execute(text(statement))
    assert len(await _audit(db)) == 1


async def test_admin_reads_cannot_write() -> None:
    reads: AsyncGenerator[AsyncSession] = get_admin_read_db()  # pyright: ignore[reportAssignmentType]
    session = await anext(reads)
    try:
        with pytest.raises(DBAPIError, match="read-only"):
            await session.execute(text("CREATE TABLE nope (x int)"))
    finally:
        await reads.aclose()
