"""Event sync (ADR 0039): idempotent pushes, cursor pulls, and each owner sees only their own."""

from typing import Any

from httpx import AsyncClient

from app.auth.email import LogSender
from tests.conftest import browser
from tests.helpers import create_class, join, sign_in_teacher


def attempt(attempt_id: str = "a-1", **changes: Any) -> dict[str, Any]:
    header: dict[str, Any] = {
        "id": attempt_id,
        "experimentId": "simple-pendulum",
        "mode": "guided",
        "seed": 11,
        "createdAt": 1_763_000_000_000,
        "updatedAt": 1_763_000_000_500,
        "formatVersion": 1,
    }
    header.update(changes)
    return header


def event(n: int, attempt_id: str = "a-1", **changes: Any) -> dict[str, Any]:
    e: dict[str, Any] = {
        "id": f"{attempt_id}-e{n}",
        "attemptId": attempt_id,
        "seq": n,
        "device": "device-1",
        "at": 1_763_000_000_000 + n,
        "kind": "set-length",
        "data": {"length": 0.8, "unit": "m", "parts": [1, None, True]},
    }
    e.update(changes)
    return e


def batch(attempt_id: str = "a-1", n: int = 3) -> dict[str, Any]:
    return {
        "attempt": attempt(attempt_id),
        "events": [event(i, attempt_id) for i in range(1, n + 1)],
    }


async def test_sync_needs_a_signed_in_owner(client: AsyncClient) -> None:
    assert (await client.post("/sync/push", json={"attempts": []})).status_code == 401
    assert (await client.get("/sync/pull")).status_code == 401


async def test_a_push_then_a_pull_gives_the_events_back_exactly(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    pushed = await client.post("/sync/push", json={"attempts": [batch()]})
    assert pushed.status_code == 200, pushed.text
    assert pushed.json() == {"attempts": [{"id": "a-1", "newEvents": 3}]}

    pulled = (await client.get("/sync/pull")).json()
    assert pulled["attempts"] == [attempt()]
    assert pulled["events"] == [event(1), event(2), event(3)]
    assert pulled["more"] is False

    # Nothing new after the cursor.
    again = (await client.get("/sync/pull", params={"after": pulled["cursor"]})).json()
    assert again["events"] == [] and again["cursor"] == pulled["cursor"]


async def test_pushing_the_same_events_twice_changes_nothing(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    await client.post("/sync/push", json={"attempts": [batch(n=2)]})
    second = await client.post("/sync/push", json={"attempts": [batch(n=3)]})
    assert second.json()["attempts"] == [{"id": "a-1", "newEvents": 1}]
    assert len((await client.get("/sync/pull")).json()["events"]) == 3


async def test_two_devices_merge_without_conflict(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    # Both devices recorded seq 4 offline; both events are kept.
    phone = [event(4, device="phone", id="p4")]
    laptop = [event(4, device="laptop", id="l4")]
    await client.post("/sync/push", json={"attempts": [{"attempt": attempt(), "events": phone}]})
    await client.post("/sync/push", json={"attempts": [{"attempt": attempt(), "events": laptop}]})
    ids = [e["id"] for e in (await client.get("/sync/pull")).json()["events"]]
    assert sorted(ids) == ["l4", "p4"]


async def test_a_changed_header_is_refused(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    await client.post("/sync/push", json={"attempts": [batch()]})
    changed: dict[str, Any] = {"attempt": attempt(seed=12), "events": []}
    refused = await client.post("/sync/push", json={"attempts": [changed]})
    assert refused.status_code == 409


async def test_a_later_update_time_is_kept(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    later = {"attempt": attempt(updatedAt=1_763_000_009_999), "events": [event(1)]}
    earlier = {"attempt": attempt(), "events": [event(2)]}
    await client.post("/sync/push", json={"attempts": [later]})
    await client.post("/sync/push", json={"attempts": [earlier]})
    pulled = (await client.get("/sync/pull")).json()
    assert pulled["attempts"][0]["updatedAt"] == 1_763_000_009_999


async def test_pull_pages_with_its_cursor(client: AsyncClient, outbox: LogSender) -> None:
    import app.routes.sync as sync_routes

    await sign_in_teacher(client, outbox, "t@example.org")
    await client.post("/sync/push", json={"attempts": [batch("a-1", 3), batch("a-2", 2)]})
    page_size = sync_routes.SYNC_PULL_PAGE
    sync_routes.SYNC_PULL_PAGE = 2
    try:
        seen: list[str] = []
        cursor = None
        for _ in range(5):
            params = {"after": cursor} if cursor else {}
            page = (await client.get("/sync/pull", params=params)).json()
            seen += [e["id"] for e in page["events"]]
            assert {a["id"] for a in page["attempts"]} == {e["attemptId"] for e in page["events"]}
            cursor = page["cursor"]
            if not page["more"]:
                break
    finally:
        sync_routes.SYNC_PULL_PAGE = page_size
    assert len(seen) == 5 and len(set(seen)) == 5


async def test_owners_never_see_each_others_attempts(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    code = (await create_class(client))["code"]
    await client.post("/sync/push", json={"attempts": [batch("shared-id")]})

    async with browser() as kofi, browser() as ama:
        await join(kofi, code, "Kofi")
        await join(ama, code, "Ama")
        # Kofi imported the teacher's attempt file: same attempt id, his own copy.
        mine = {"attempt": attempt("shared-id"), "events": [event(9, "shared-id")]}
        assert (await kofi.post("/sync/push", json={"attempts": [mine]})).status_code == 200
        kofi_events = (await kofi.get("/sync/pull")).json()["events"]
        assert [e["id"] for e in kofi_events] == ["shared-id-e9"]
        assert (await ama.get("/sync/pull")).json()["events"] == []
    teacher_events = (await client.get("/sync/pull")).json()["events"]
    assert len(teacher_events) == 3


async def test_limits_are_checked(client: AsyncClient, outbox: LogSender) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    big = {"attempt": attempt(), "events": [event(1, data={"x": "a" * 17_000})]}
    assert (await client.post("/sync/push", json={"attempts": [big]})).status_code == 422
    stray = {"attempt": attempt("a-1"), "events": [event(1, "a-2")]}
    assert (await client.post("/sync/push", json={"attempts": [stray]})).status_code == 422
    twice = {"attempts": [batch("a-1"), batch("a-1")]}
    assert (await client.post("/sync/push", json=twice)).status_code == 422
    many = {"attempts": [batch(f"a-{i}", 101) for i in range(20)]}
    assert (await client.post("/sync/push", json=many)).status_code == 422
    unknown: dict[str, Any] = {"attempt": attempt(formatVersion=2), "events": []}
    assert (await client.post("/sync/push", json={"attempts": [unknown]})).status_code == 422
    assert (await client.get("/sync/pull", params={"after": "-1"})).status_code == 422
