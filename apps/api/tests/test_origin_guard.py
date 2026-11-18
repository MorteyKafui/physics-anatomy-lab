"""Changes must come from the web app (ADR 0038)."""

from httpx import ASGITransport, AsyncClient

from app.auth.email import LogSender
from app.main import app
from tests.conftest import BASE_URL
from tests.helpers import sign_in_teacher


async def test_a_change_from_another_site_is_refused(client: AsyncClient) -> None:
    refused = await client.post(
        "/auth/email-link",
        json={"email": "a@example.org"},
        headers={"Origin": "https://evil.example"},
    )
    assert refused.status_code == 403


async def test_a_signed_in_change_without_an_origin_is_refused(
    client: AsyncClient, outbox: LogSender
) -> None:
    await sign_in_teacher(client, outbox, "t@example.org")
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url=BASE_URL, cookies=client.cookies
    ) as no_origin:
        refused = await no_origin.post(
            "/classes", json={"name": "A", "school_permission_confirmed": True}
        )
        assert refused.status_code == 403
        # Reading is still fine.
        assert (await no_origin.get("/auth/me")).status_code == 200
