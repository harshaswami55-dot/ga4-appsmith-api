import pytest
from pydantic import ValidationError

from app.schemas.filters import DashboardFilters


def test_accepts_all_global_filters() -> None:
    filters = DashboardFilters(
        start_date="2026-07-01",
        end_date="2026-07-19",
        country="India",
        platform="Android",
        device_category="mobile",
        device_model="Pixel 9",
        os_version="16",
        app_version="2.1.0",
        traffic_source="google",
        campaign="launch",
        user_type="returning",
        level_number="12",
        tutorial_step="movement",
    )
    assert filters.country == "India"
    assert filters.level_number == "12"


def test_rejects_reversed_date_range() -> None:
    with pytest.raises(ValidationError, match="start_date must not be after end_date"):
        DashboardFilters(start_date="2026-07-20", end_date="2026-07-01")


def test_rejects_invalid_date() -> None:
    with pytest.raises(ValidationError, match="Use YYYY-MM-DD"):
        DashboardFilters(start_date="last month")

