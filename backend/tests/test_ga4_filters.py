from app.config.settings import Settings
from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service


class DummyClient:
    pass


def test_global_filters_translate_to_ga4_dimensions() -> None:
    settings = Settings(
        _env_file=None,
        auth_enabled=False,
        level_dimension="customEvent:level_number",
        tutorial_step_dimension="customEvent:tutorial_step",
    )
    service = GA4Service(settings=settings, client=DummyClient())
    expression = service.dimension_filter(
        DashboardFilters(
            country="India",
            platform="Android",
            campaign="summer",
            level_number="4",
        )
    )
    fields = [item["filter"]["field_name"] for item in expression["and_group"]["expressions"]]
    assert fields == ["country", "platform", "sessionCampaignName", "customEvent:level_number"]

