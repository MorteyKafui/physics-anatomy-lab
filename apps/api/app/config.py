"""Settings read from the environment (or apps/api/.env, which is git-ignored)."""

from functools import lru_cache
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "preview", "staging", "production"]

# Where "local" and "test" may run: this machine only. A server whose ENVIRONMENT was left unset
# would otherwise start as "local", with the test-only sign-in route and every deployed check off.
ON_THIS_MACHINE = frozenset({"localhost", "127.0.0.1", "::1"})


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
    email_delivery: Literal["log", "none", "resend"] = "log"
    # Resend's API key (ADR 0038), only from the secret store. Needed when email_delivery is resend.
    resend_api_key: SecretStr | None = None

    # Cloudflare Turnstile on the sign-in and join forms. Off unless the secret is set; required
    # in preview, staging and production.
    turnstile_secret_key: SecretStr | None = None
    email_from: str = "Physics Anatomy <sign-in@localhost>"

    # The admin portal (ADR 0040). Staff reach it through Cloudflare Access; the API checks the
    # Access token on every admin call. Both values come from the Access application and are
    # never committed: the team domain ("<team>.cloudflareaccess.com") and its audience tag.
    cf_access_team_domain: str | None = None
    cf_access_audience: str | None = None
    # Optional second check behind the Access policy: only these staff emails, if set.
    admin_staff_emails: list[str] = []
    # Local and test only: treat every admin call as this staff member, with no Access token.
    # Refused anywhere else, so it can never open the admin API on a deployed server.
    admin_dev_bypass_email: str | None = None
    # A read-only replica for the admin portal's charts. Unset, they read the primary database,
    # still in read-only transactions with a time limit.
    admin_database_url: str | None = None
    admin_statement_timeout_ms: int = 5000

    # AI (ADR 0043, docs/content/ai-api-brief.md). Off unless switched on, and never without the
    # key, which comes only from the secret store. The model for each feature is a setting.
    ai_enabled: bool = False
    anthropic_api_key: SecretStr | None = None
    # The key for the pseudonyms in the AI request log; required when deployed with AI on.
    ai_log_key: SecretStr | None = None
    ai_model_tutor: str = "claude-haiku-5-5"
    ai_model_what_if: str = "claude-haiku-5-5"
    ai_model_report_review: str = "claude-sonnet-5-5"
    ai_model_question_drafting: str = "claude-sonnet-5-5"
    # Daily quotas per person and feature (docs/content/ai-quotas-brief.md, decision 1). A feature
    # missing from a list is not for that kind of person.
    ai_quota_student: dict[str, int] = {"tutor": 30, "what-if": 15, "report-review": 5}
    ai_quota_teacher: dict[str, int] = {
        "tutor": 60,
        "what-if": 30,
        "report-review": 20,
        "question-drafting": 20,
    }
    # AI requests a day from one network address (decision 2).
    ai_requests_per_address: int = 1500
    # AI replies one person may have under way at once (ASVS review, finding C).
    ai_requests_at_once: int = 2
    # The day's spend at which AI switches itself off until midnight, in US dollars: the monthly
    # ceiling divided by 30. Required when deployed with AI on.
    ai_daily_budget_usd: float | None = None

    @model_validator(mode="after")
    def _deployed_settings(self) -> Self:
        deployed = self.environment in ("preview", "staging", "production")
        host = urlsplit(self.web_origin).hostname or ""
        if not deployed and not (host in ON_THIS_MACHINE or host.endswith(".localhost")):
            raise ValueError(
                f"ENVIRONMENT is {self.environment}, but WEB_ORIGIN is not on this machine. "
                "Set ENVIRONMENT to preview, staging or production."
            )
        if deployed and not self.web_origin.startswith("https://"):
            raise ValueError("WEB_ORIGIN must be https:// when deployed (cookies need Secure).")
        if deployed and self.email_delivery == "log":
            raise ValueError("EMAIL_DELIVERY=log is for this machine only; choose resend or none.")
        if deployed and not self.client_ip_header:
            raise ValueError("Set CLIENT_IP_HEADER (cf-connecting-ip behind Cloudflare).")
        if self.email_delivery == "resend" and not self.resend_api_key:
            raise ValueError("Set RESEND_API_KEY, or choose another EMAIL_DELIVERY.")
        if deployed and not self.turnstile_secret_key:
            raise ValueError("Set TURNSTILE_SECRET_KEY (the sign-in and join forms need it).")
        if self.admin_dev_bypass_email and self.environment not in ("local", "test"):
            raise ValueError("ADMIN_DEV_BYPASS_EMAIL works only in local and test.")
        if bool(self.cf_access_team_domain) != bool(self.cf_access_audience):
            raise ValueError("Set both CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUDIENCE, or neither.")
        if deployed and self.ai_enabled and not self.anthropic_api_key:
            raise ValueError("Set ANTHROPIC_API_KEY, or leave AI_ENABLED off.")
        if deployed and self.ai_enabled and not self.ai_log_key:
            raise ValueError("Set AI_LOG_KEY (it keys the AI log's pseudonyms).")
        if deployed and self.ai_enabled and not self.ai_daily_budget_usd:
            raise ValueError("Set AI_DAILY_BUDGET_USD (the monthly AI ceiling divided by 30).")
        return self

    @property
    def secure_cookies(self) -> bool:
        return self.web_origin.startswith("https://")

    @property
    def admin_access_configured(self) -> bool:
        return bool(self.cf_access_team_domain and self.cf_access_audience)

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
