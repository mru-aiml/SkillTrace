from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings.

    The SQLite defaults allow the complete demo to run without external services.
    PostgreSQL is supported through SQLAlchemy's ``postgresql+psycopg`` driver.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "SkillTrace API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./skilltrace.db"
    jwt_secret: str = "development-only-change-me-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
    )
    upload_dir: Path = Path("uploads")
    max_upload_size: int = 5 * 1024 * 1024
    auto_create_tables: bool = True
    auto_seed_demo: bool = True
    province: str = "Maharashtra"
    sql_echo: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return value
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    @property
    def resolved_upload_dir(self) -> Path:
        if self.upload_dir.is_absolute():
            return self.upload_dir
        return Path(__file__).resolve().parents[2] / self.upload_dir


@lru_cache
def get_settings() -> Settings:
    return Settings()
