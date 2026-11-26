"""Teachers' classes, and students joining with a class code (ADR 0011, ADR 0038)."""

import re

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email import LogSender
from app.models import Session
from tests.conftest import browser
from tests.helpers import create_class, join, preview, sign_in_teacher

CODE = re.compile(r"^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$")


async def test_a_class_needs_the_schools_permission(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    refused = await client.post(
        "/classes", json={"name": "SHS 2", "school_permission_confirmed": False}
    )
    assert refused.status_code == 422


async def test_a_new_class_has_a_readable_code_and_ai_off(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    assert CODE.match(made["code"])
    assert made["ai_enabled"] is False
    assert made["joining_open"] is True
    listed = await client.get("/classes")
    assert [c["id"] for c in listed.json()] == [made["id"]]


async def test_a_teacher_cannot_touch_another_teachers_class(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "owner@example.org")
    made = await create_class(client)
    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        base = f"/classes/{made['id']}"
        assert (await other.get(base)).status_code == 404
        assert (await other.patch(base, json={"ai_enabled": True})).status_code == 404
        assert (await other.post(f"{base}/code")).status_code == 404
        assert (await other.get(f"{base}/members")).status_code == 404
        assert (await other.get("/classes")).json() == []


async def test_a_student_joins_with_a_code_and_a_display_name(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    await client.patch("/auth/me", json={"display_name": "Mr Mensah"})
    made = await create_class(client)

    async with browser() as phone:
        shown = await phone.post("/join/preview", json={"code": made["code"]})
        assert shown.json() == {
            "class_name": "SHS 2 Science A",
            "teacher_name": "Mr Mensah",
            "ai_enabled": False,
        }
        joined = await join(phone, made["code"])
        assert joined["kind"] == "student"
        assert joined["display_name"] == "Kofi_A"
        assert joined["school_class"]["name"] == "SHS 2 Science A"
        me = await phone.get("/auth/me")
        assert me.json()["member_id"] == joined["member_id"]
        # A student is not a teacher.
        refused = await phone.post(
            "/classes", json={"name": "Mine", "school_permission_confirmed": True}
        )
        assert refused.status_code == 403

    members = await client.get(f"/classes/{made['id']}/members")
    assert [m["display_name"] for m in members.json()] == ["Kofi_A"]


async def test_codes_can_be_typed_loosely(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    code = (await create_class(client))["code"]
    async with browser() as phone:
        loose = f" {code.lower().replace('-', ' ')} "
        assert (await preview(phone, loose)) == 200


@pytest.mark.parametrize(
    ("name", "why"),
    [
        ("kofi@example.org", "email"),
        ("0244 123 456", "phone"),
        ("K", "2 to 24"),
        ("Kofi <script>", "letters"),
    ],
)
async def test_display_names_that_could_identify_a_child_are_refused(
    client: AsyncClient, outbox: LogSender, name: str, why: str
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    code = (await create_class(client))["code"]
    async with browser() as phone:
        refused = await phone.post(
            "/join", json={"code": code, "display_name": name, "agreed_to_terms": True}
        )
        assert refused.status_code == 422
        assert why in refused.text


async def test_joining_asks_for_nothing_else(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    code = (await create_class(client))["code"]
    async with browser() as phone:
        refused = await phone.post(
            "/join",
            json={"code": code, "display_name": "Kofi", "agreed_to_terms": True, "age": 14},
        )
        assert refused.status_code == 422
        unagreed = await phone.post(
            "/join", json={"code": code, "display_name": "Kofi", "agreed_to_terms": False}
        )
        assert unagreed.status_code == 422


async def test_display_names_are_unique_in_a_class_whatever_the_case(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    code = (await create_class(client))["code"]
    async with browser() as first, browser() as second:
        await join(first, code, "Kofi_A")
        taken = await second.post(
            "/join", json={"code": code, "display_name": "kofi_a", "agreed_to_terms": True}
        )
        assert taken.status_code == 409


async def test_wrong_codes_are_limited_per_network_address(client: AsyncClient) -> None:
    for _ in range(20):
        assert (await preview(client, "AAA-AAA")) == 404
    assert (await preview(client, "AAA-AAA")) == 429


async def test_rotating_the_code_keeps_students_in(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    async with browser() as phone:
        await join(phone, made["code"])
        rotated = (await client.post(f"/classes/{made['id']}/code")).json()
        assert rotated["code"] != made["code"]
        assert (await phone.get("/auth/me")).status_code == 200
        async with browser() as late:
            assert (
                await late.post("/join/preview", json={"code": made["code"]})
            ).status_code == 404
            assert (
                await late.post("/join/preview", json={"code": rotated["code"]})
            ).status_code == 200


async def test_closed_joining_refuses_new_students(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    closed = await client.patch(f"/classes/{made['id']}", json={"joining_open": False})
    assert closed.json()["joining_open"] is False
    async with browser() as phone:
        assert (await preview(phone, made["code"])) == 409


async def test_a_teacher_turns_ai_on_for_a_class(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    on = await client.patch(f"/classes/{made['id']}", json={"ai_enabled": True})
    assert on.json()["ai_enabled"] is True


async def test_a_rejoin_code_moves_a_student_to_a_new_device_once(
    client: AsyncClient, outbox: LogSender, db: AsyncSession
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    async with browser() as lost_phone:
        student = await join(lost_phone, made["code"])
        issued = await client.post(
            f"/classes/{made['id']}/members/{student['member_id']}/rejoin-code"
        )
        assert issued.status_code == 201
        code = issued.json()["code"]
        assert re.match(r"^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$", code)

        async with browser() as new_phone:
            back = await new_phone.post("/join/rejoin", json={"code": code})
            assert back.status_code == 200
            assert back.json()["member_id"] == student["member_id"]
            assert (await new_phone.get("/auth/me")).status_code == 200
        # The lost device is signed out.
        assert (await lost_phone.get("/auth/me")).status_code == 401

    async with browser() as third:
        assert (await third.post("/join/rejoin", json={"code": code})).status_code == 404
    signed_in = select(func.count()).select_from(Session).where(Session.member_id.is_not(None))
    assert await db.scalar(signed_in) == 1


async def test_only_the_classes_teacher_issues_rejoin_codes(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    made = await create_class(client)
    async with browser() as phone:
        student = await join(phone, made["code"])
    async with browser() as other:
        await sign_in_teacher(other, outbox, "other@example.org")
        other_class = await create_class(other, "Other class")
        path = f"/members/{student['member_id']}/rejoin-code"
        assert (await other.post(f"/classes/{made['id']}{path}")).status_code == 404
        assert (await other.post(f"/classes/{other_class['id']}{path}")).status_code == 404
