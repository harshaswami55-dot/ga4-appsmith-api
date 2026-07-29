from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Sumlink Analytics API"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    ga4_property_id: str = "516899630"
    google_application_credentials: Path | None = None
    google_service_account_json: str | None = None
    google_service_account_json_base64: str | None = None

    auth_enabled: bool = True
    api_keys: str = ""
    cors_origins: str = "*"
    cache_ttl_seconds: int = Field(default=300, ge=0, le=3600)

    event_install: str = "first_open"
    event_tutorial_start: str = "tutorial_step"
    event_tutorial_complete: str = "tutorial_completed"
    event_tutorial_fail: str = "tutorial_match_failed"
    event_tutorial_skip: str = "tutorial_skipped"
    event_tutorial_skip_attempt: str = "tutorial_skip_attempt"
    event_level_start: str = "level_start"
    event_level_complete: str = "level_complete"
    event_game_action: str = "game_action"
    event_app_remove: str = "app_remove"
    event_hint_highlighted: str = "hint_button_highlighted"
    event_hint_clicked: str = "hint_button_clicked"
    event_hint_used: str = "hint_used_successfully"

    level_dimension: str = "customEvent:level_number"
    tutorial_step_dimension: str = "customEvent:step_number"
    action_type_dimension: str = "customEvent:action_type"
    action_add_row_value: str = "add_row"
    level_time_metric: str = "averageCustomEvent:time_taken"
    tutorial_time_metric: str = "averageCustomEvent:time_taken"

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @model_validator(mode="after")
    def validate_production_auth(self) -> "Settings":
        if self.environment == "production" and (not self.auth_enabled or not self.api_key_set):
            raise ValueError("Production requires AUTH_ENABLED=true and at least one API key")
        return self

    @property
    def api_key_set(self) -> set[str]:
        return {item.strip() for item in self.api_keys.split(",") if item.strip()}

    @property
    def cors_origin_list(self) -> list[str]:
        values = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        return values or ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
