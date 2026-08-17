from typing import Annotated, Literal

from fastapi import Query
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic import ValidationError

from app.utils.dates import resolve_ga4_date, validate_ga4_date


class DashboardFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_date: str = "30daysAgo"
    end_date: str = "yesterday"
    country: str | None = None
    platform: Literal["Android", "iOS", "Web"] | None = None
    device_category: str | None = None
    device_model: str | None = None
    os_version: str | None = None
    app_version: str | None = None
    traffic_source: str | None = None
    campaign: str | None = None
    channel: str | None = None
    first_user_source: str | None = None
    first_user_medium: str | None = None
    user_type: Literal["new", "returning"] | None = None
    level_number: str | None = None
    tutorial_step: str | None = None

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_dates(cls, value: str) -> str:
        return validate_ga4_date(value)

    @field_validator(
        "country",
        "device_category",
        "device_model",
        "os_version",
        "app_version",
        "traffic_source",
        "campaign",
        "channel",
        "first_user_source",
        "first_user_medium",
        "level_number",
        "tutorial_step",
    )
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def check_range(self) -> "DashboardFilters":
        if resolve_ga4_date(self.start_date) > resolve_ga4_date(self.end_date):
            raise ValueError("start_date must not be after end_date")
        return self


def get_dashboard_filters(
    start_date: Annotated[str, Query(description="YYYY-MM-DD, today, yesterday, or NdaysAgo")] = "30daysAgo",
    end_date: Annotated[str, Query(description="YYYY-MM-DD, today, yesterday, or NdaysAgo")] = "yesterday",
    country: str | None = None,
    platform: Literal["Android", "iOS", "Web"] | None = None,
    device_category: str | None = None,
    device_model: str | None = None,
    os_version: str | None = None,
    app_version: str | None = None,
    traffic_source: str | None = None,
    campaign: str | None = None,
    channel: str | None = None,
    first_user_source: str | None = None,
    first_user_medium: str | None = None,
    user_type: Literal["new", "returning"] | None = None,
    level_number: str | None = None,
    tutorial_step: str | None = None,
) -> DashboardFilters:
    try:
        return DashboardFilters(
            start_date=start_date,
            end_date=end_date,
            country=country,
            platform=platform,
            device_category=device_category,
            device_model=device_model,
            os_version=os_version,
            app_version=app_version,
            traffic_source=traffic_source,
            campaign=campaign,
            channel=channel,
            first_user_source=first_user_source,
            first_user_medium=first_user_medium,
            user_type=user_type,
            level_number=level_number,
            tutorial_step=tutorial_step,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc
