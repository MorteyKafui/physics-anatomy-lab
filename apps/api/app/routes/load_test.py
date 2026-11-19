"""Test-only help for the load test (loadtest/, docs/ops/load-testing.md).

The load test signs teachers in the way a person does, by email link, but has no inbox to read
the link from. Locally and in tests the links are kept in memory (app/auth/email.py), so this
route hands the latest one back. It is mounted only when ENVIRONMENT is local or test, is left
out of the OpenAPI file, and answers 404 everywhere else even if it were mounted by mistake.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.email import EmailSender, LogSender, get_email_sender
from app.config import get_settings

TEST_ENVIRONMENTS = frozenset({"local", "test"})

router = APIRouter(prefix="/test-only", include_in_schema=False)


class SignInLink(BaseModel):
    token: str


@router.get("/sign-in-link")
async def latest_sign_in_link(
    email: Annotated[str, Query(min_length=3, max_length=320)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
) -> SignInLink:
    """The token from the latest sign-in email sent to `email` by this API process."""
    if get_settings().environment not in TEST_ENVIRONMENTS or not isinstance(sender, LogSender):
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    wanted = email.strip().lower()
    for sent in reversed(sender.outbox):
        if sent.to.lower() == wanted and "#token=" in sent.text:
            return SignInLink(token=sent.text.split("#token=", 1)[1].split()[0])
    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No sign-in email for that address.")
