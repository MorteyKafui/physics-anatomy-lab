"""Settings read from the environment (or apps/api/.env, which is git-ignored)."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "preview", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Environment = "local"
    database_url: str = "postgresql+asyncpg://pa_app:change-me@localhost:5432/physics_anatomy_dev"
    # The web app's origin. Sign-in links point here, and only this origin may make changes.
    web_origin: str = "http://localhost:3000"
    # The API's own public origin, used for the Google callback. Locally the web app forwards
    # /api to the API, so the callback goes through the web origin.
    api_public_url: str = "http://localhost:3000/api"

    # The header the proxy in front puts the client's address in: "cf-connecting-ip" behind
    # Cloudflare, or the reverse proxy's on a university server. Required outside local and test,
    # or every visitor would share the proxy's address and one rate limit. Only set it when the
    # API cannot be reached except through that proxy, or the header can be forged.
    client_ip_header: str | None = None

    # Google sign-in is off unless both are set (ADR 0038).
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None

    # "log" writes emails to the log and keeps them in memory (local and tests only).
    # "none" refuses to send. A real provider is chosen by Mortey (ADR 0038).
    email_delivery: Literal["log", "none"] = "log"
    email_from: str = "Physics Anatomy <sign-in@localhost>"

    @model_validator(mode="after")
    def _deployed_settings(self) -> Self:
        if self.environment in ("preview", "staging", "production") and not self.client_ip_header:
            raise ValueError("Set CLIENT_IP_HEADER (cf-connecting-ip behind Cloudflare).")
        return self

    @property
    def secure_cookies(self) -> bool:
        return self.web_origin.startswith("https://")

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
