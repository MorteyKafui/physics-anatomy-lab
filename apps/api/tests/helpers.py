"""Steps many tests share: a teacher signed in by email link, a class, a student joined."""

from typing import Any

from httpx import AsyncClient

from app.auth.email import LogSender


def token_from(outbox: LogSender) -> str:
    text = outbox.outbox[-1].text
    return text.split("#token=", 1)[1].split()[0]


async def sign_in_teacher(client: AsyncClient, outbox: LogSender, email: str) -> dict[str, Any]:
    sent = await client.post("/auth/email-link", json={"email": email})
    assert sent.status_code == 202, sent.text
    verified = await client.post("/auth/email-link/verify", json={"token": token_from(outbox)})
    assert verified.status_code == 200, verified.text
    return verified.json()


async def create_class(client: AsyncClient, name: str = "SHS 2 Science A") -> dict[str, Any]:
    made = await client.post("/classes", json={"name": name, "school_permission_confirmed": True})
    assert made.status_code == 201, made.text
    return made.json()


async def join(client: AsyncClient, code: str, name: str = "Kofi_A") -> dict[str, Any]:
    joined = await client.post(
        "/join", json={"code": code, "display_name": name, "agreed_to_terms": True}
    )
    assert joined.status_code == 201, joined.text
    return joined.json()


async def preview(client: AsyncClient, code: str) -> int:
    """The status of a join preview for this code (the code goes in the body, never the path)."""
    return (await client.post("/join/preview", json={"code": code})).status_code
