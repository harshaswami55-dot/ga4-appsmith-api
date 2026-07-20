from typing import Annotated

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.services.ga4_service import GA4Service, get_ga4_service


router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("")
def public_settings(
    settings: Annotated[Settings, Depends(get_settings)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    return {
        "property_id": settings.ga4_property_id,
        "environment": settings.environment,
        "authentication_enabled": settings.auth_enabled,
        "cache": ga4.cache.stats(),
        "events": {
            "install": settings.event_install,
            "tutorial_start": settings.event_tutorial_start,
            "tutorial_complete": settings.event_tutorial_complete,
            "tutorial_fail": settings.event_tutorial_fail,
            "tutorial_skip": settings.event_tutorial_skip,
            "level_start": settings.event_level_start,
            "level_complete": settings.event_level_complete,
            "hint_used": settings.event_hint_used,
        },
        "custom_definitions": {
            "level_dimension": settings.level_dimension or None,
            "tutorial_step_dimension": settings.tutorial_step_dimension or None,
            "level_time_metric": settings.level_time_metric or None,
            "tutorial_time_metric": settings.tutorial_time_metric or None,
        },
    }


@router.delete("/cache")
def clear_cache(ga4: Annotated[GA4Service, Depends(get_ga4_service)]) -> dict:
    return {"cleared_entries": ga4.cache.clear()}

