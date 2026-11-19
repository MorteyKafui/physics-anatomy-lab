"""Who is calling the admin API: a staff member signed in through Cloudflare Access (ADR 0040).

Cloudflare Access sits in front of the admin portal. After a staff member signs in (with two-step
verification), Access adds a signed token to every request in the `Cf-Access-Jwt-Assertion`
header; the admin portal's server passes it on to this API. Every admin call checks it here:

- the signature, against the team's public keys at https://<team>/cdn-cgi/access/certs;
- the issuer (https://<team>), the audience (the admin application's tag), and the expiry;
- that it names a person by email. Service tokens carry no email and are refused, so every
  audit entry names who did it.

Fails closed: with Access not configured, the admin API answers 503 to everyone. Locally (and in
tests) a dev bypass can stand in for Access; settings refuse it on any deployed server.
"""

import time
from dataclasses import dataclass
from typing import Annotated, Any, Literal

import httpx
from fastapi import Depends, HTTPException, Request
from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet

from app.config import get_settings

HEADER = "cf-access-jwt-assertion"
KEYS_KEPT_FOR = 3600.0
# An unknown key id makes us fetch the keys again (Access rotates them), but at most this often,
# so a stream of forged tokens cannot turn into a stream of requests to Cloudflare.
REFETCH_AT_MOST_EVERY = 60.0
LEEWAY_SECONDS = 30

Via = Literal["access", "dev-bypass"]


@dataclass(frozen=True)
class Staff:
    email: str
    via: Via


class AccessError(Exception):
    pass


class AccessVerifier:
    """Checks Access tokens for one team and one application."""

    def __init__(
        self,
        team_domain: str | None,
        audience: str | None,
        staff_emails: list[str] | None = None,
        dev_bypass_email: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        domain = (team_domain or "").removeprefix("https://").rstrip("/")
        self._issuer = f"https://{domain}" if domain else None
        self._audience = audience
        self._allowed = {e.strip().lower() for e in staff_emails or [] if e.strip()}
        self._bypass = dev_bypass_email
        self._transport = transport  # tests pass a fake Cloudflare here
        self._keys: KeySet | None = None
        self._keys_at = 0.0

    @property
    def configured(self) -> bool:
        return bool(self._issuer and self._audience) or bool(self._bypass)

    async def _key_set(self, *, refresh: bool = False) -> KeySet:
        now = time.monotonic()
        stale = self._keys is None or now - self._keys_at > KEYS_KEPT_FOR
        may_refresh = refresh and now - self._keys_at > REFETCH_AT_MOST_EVERY
        if stale or may_refresh:
            async with httpx.AsyncClient(timeout=10.0, transport=self._transport) as http:
                response = await http.get(f"{self._issuer}/cdn-cgi/access/certs")
                response.raise_for_status()
                self._keys = KeySet.import_key_set(response.json())
                self._keys_at = now
        assert self._keys is not None
        return self._keys

    async def _decode(self, token: str) -> dict[str, Any]:
        try:
            return jwt.decode(token, await self._key_set(), algorithms=["RS256"]).claims
        except JoseError:
            # Perhaps signed with a key Access has just rotated in: fetch the keys again, once.
            return jwt.decode(token, await self._key_set(refresh=True), algorithms=["RS256"]).claims

    async def staff(self, token: str | None) -> Staff:
        if token is None:
            if self._bypass:
                return Staff(email=self._bypass, via="dev-bypass")
            raise AccessError("Sign in through Cloudflare Access.")
        if not (self._issuer and self._audience):
            raise AccessError("Cloudflare Access is not set up for this API.")
        try:
            claims = await self._decode(token)
            jwt.JWTClaimsRegistry(
                leeway=LEEWAY_SECONDS,
                iss={"essential": True, "value": self._issuer},
                aud={"essential": True, "value": self._audience},
                exp={"essential": True},
                email={"essential": True},
            ).validate(claims)
        except (httpx.HTTPError, JoseError, ValueError) as error:
            raise AccessError("That Cloudflare Access token is not valid.") from error
        email = claims["email"]
        if not isinstance(email, str) or "@" not in email:
            raise AccessError("That Cloudflare Access token names no person.")
        if self._allowed and email.lower() not in self._allowed:
            raise PermissionError(email)
        return Staff(email=email.lower(), via="access")


_verifier: AccessVerifier | None = None


def get_access_verifier() -> AccessVerifier:
    global _verifier
    if _verifier is None:
        s = get_settings()
        _verifier = AccessVerifier(
            s.cf_access_team_domain,
            s.cf_access_audience,
            s.admin_staff_emails,
            s.admin_dev_bypass_email,
        )
    return _verifier


async def require_staff(
    request: Request, verifier: Annotated[AccessVerifier, Depends(get_access_verifier)]
) -> Staff:
    """The staff member making an admin call, or a refusal. Every admin route depends on this."""
    if not verifier.configured:
        raise HTTPException(503, "The admin API is not set up on this server.")
    try:
        return await verifier.staff(request.headers.get(HEADER))
    except AccessError as error:
        raise HTTPException(401, str(error)) from error
    except PermissionError as error:
        raise HTTPException(403, "This account is not on the staff list.") from error


CurrentStaff = Annotated[Staff, Depends(require_staff)]
