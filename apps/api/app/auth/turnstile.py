"""Cloudflare Turnstile on the sign-in and join forms (master plan, "Security, privacy and minors").

The page gets a token from Turnstile's widget and sends it with the form; the API asks Cloudflare
whether it is good. Off when no secret key is set (local and tests); preview, staging and
production refuse to start without one.
"""

from typing import Annotated, Protocol

import httpx
import structlog
from fastapi import Depends, HTTPException, Request, status

from app.auth.rate_limit import client_address
from app.config import get_settings

log = structlog.get_logger()
VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class HumanCheck(Protocol):
    async def passed(self, token: str | None, remote_ip: str) -> bool: ...


class Turnstile:
    def __init__(self, secret: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._secret = secret
        self._transport = transport

    async def passed(self, token: str | None, remote_ip: str) -> bool:
        if not token:
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0, transport=self._transport) as http:
                response = await http.post(
                    VERIFY_URL,
                    data={"secret": self._secret, "response": token, "remoteip": remote_ip},
                )
                response.raise_for_status()
                outcome: object = response.json()
        except (httpx.HTTPError, ValueError) as error:
            log.error("turnstile.unreachable", reason=type(error).__name__)
            return False
        return isinstance(outcome, dict) and outcome.get("success") is True  # pyright: ignore[reportUnknownMemberType]


class Off:
    async def passed(self, token: str | None, remote_ip: str) -> bool:
        return True


def get_human_check() -> HumanCheck:
    secret = get_settings().turnstile_secret_key
    return Turnstile(secret.get_secret_value()) if secret is not None else Off()


HumanCheckDep = Annotated[HumanCheck, Depends(get_human_check)]


async def require_human(check: HumanCheck, token: str | None, request: Request) -> None:
    if not await check.passed(token, client_address(request)):
        log.info("turnstile.refused")
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="We couldn't check this browser. Reload the page and try again.",
        )
