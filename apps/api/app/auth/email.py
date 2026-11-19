"""Sending email to adults (teachers). Students have no email (ADR 0011).

The provider is not chosen yet (ADR 0038). "log" writes each message to the log and keeps it in
`outbox`, for local development and tests; "none" refuses to send.
"""

from dataclasses import dataclass
from typing import Protocol

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()


@dataclass(frozen=True)
class Email:
    to: str
    subject: str
    text: str


class EmailNotSentError(Exception):
    """No provider is configured, or it refused the message."""


class EmailSender(Protocol):
    async def send(self, email: Email) -> None: ...


class LogSender:
    def __init__(self) -> None:
        self.outbox: list[Email] = []

    async def send(self, email: Email) -> None:
        self.outbox.append(email)
        # The link is a secret: only ever logged locally and in tests.
        log.info("email.logged", subject=email.subject, text=email.text)


class ResendSender:
    """Sends through Resend's HTTP API (ADR 0038). The key comes from the secret store."""

    URL = "https://api.resend.com/emails"

    def __init__(
        self, api_key: str, sender: str, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._api_key = api_key
        self._sender = sender
        self._transport = transport

    async def send(self, email: Email) -> None:
        try:
            async with httpx.AsyncClient(timeout=10.0, transport=self._transport) as http:
                response = await http.post(
                    self.URL,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json={
                        "from": self._sender,
                        "to": [email.to],
                        "subject": email.subject,
                        "text": email.text,
                    },
                )
        except httpx.HTTPError as error:
            raise EmailNotSentError("Resend could not be reached.") from error
        if response.status_code >= 300:
            # Never log the body: it can echo the address.
            raise EmailNotSentError(f"Resend refused the message ({response.status_code}).")


class NoSender:
    async def send(self, email: Email) -> None:
        raise EmailNotSentError("No email provider is configured.")


_log_sender = LogSender()


def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.email_delivery == "log" and settings.environment in ("local", "test"):
        return _log_sender
    if settings.email_delivery == "resend" and settings.resend_api_key is not None:
        return ResendSender(settings.resend_api_key.get_secret_value(), settings.email_from)
    return NoSender()


def sign_in_email(to: str, link: str) -> Email:
    return Email(
        to=to,
        subject="Your Physics Anatomy sign-in link",
        text=(
            "Use this link to sign in to Physics Anatomy. It works once, for 15 minutes.\n\n"
            f"{link}\n\n"
            "If you didn't ask for it, you can ignore this email. Nobody can sign in without it."
        ),
    )
