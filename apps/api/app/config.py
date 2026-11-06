"""Settings read from the environment (or apps/api/.env, which is git-ignored)."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["local", "test", "preview", "staging", "production"] = "local"
    database_url: str = "postgresql+asyncpg://pa_app:change-me@localhost:5432/physics_anatomy_dev"
    web_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
