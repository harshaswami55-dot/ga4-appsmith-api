from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service, _exact_filter, in_list_filter
from app.utils.numbers import percent


class OnboardingService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        settings = self.ga4.settings
        events = [
            settings.event_tutorial_start,
            settings.event_tutorial_complete,
            settings.event_tutorial_fail,
            settings.event_tutorial_skip,
        ]
        event_rows = self.ga4.run_report(
            filters=filters,
            dimensions=["eventName"],
            metrics=["eventCount", "totalUsers"],
            extra_filter=in_list_filter("eventName", events),
        )
        event_map = {row["eventName"]: row for row in event_rows}

        started_row = event_map.get(settings.event_tutorial_start, {})
        completed_row = event_map.get(settings.event_tutorial_complete, {})
        failed_row = event_map.get(settings.event_tutorial_fail, {})
        skipped_row = event_map.get(settings.event_tutorial_skip, {})
        started = started_row.get("totalUsers", 0)
        completed = completed_row.get("totalUsers", 0)
        failed = failed_row.get("totalUsers", 0)
        skipped = skipped_row.get("totalUsers", 0)

        step_rows: list[dict] = []
        if settings.tutorial_step_dimension:
            step_rows = self.ga4.run_report(
                filters=filters,
                dimensions=[settings.tutorial_step_dimension, "eventName"],
                metrics=["eventCount", "totalUsers"],
                extra_filter=in_list_filter("eventName", events),
                limit=500,
            )

        average_time = None
        if settings.tutorial_time_metric:
            duration_rows = self.ga4.run_report(
                filters=filters,
                metrics=[settings.tutorial_time_metric],
                extra_filter=_exact_filter("eventName", settings.event_tutorial_complete),
            )
            average_time = duration_rows[0].get(settings.tutorial_time_metric, 0) if duration_rows else 0

        installed = self._event_users(filters, settings.event_install)
        played = self._event_users(filters, settings.event_level_start)
        never_played_proxy = max(installed - played, 0)

        return {
            "kpis": {
                "tutorial_started": started,
                "tutorial_completed": completed,
                "completion_pct": percent(completed, started),
                "failure_pct": percent(failed, started),
                "skip_pct": percent(skipped, started),
                "average_tutorial_time": average_time,
                "installed_but_never_played_proxy": never_played_proxy,
            },
            "funnel": [
                {"stage": "started", "users": started, "events": started_row.get("eventCount", 0)},
                {"stage": "completed", "users": completed, "events": completed_row.get("eventCount", 0)},
                {"stage": "failed", "users": failed, "events": failed_row.get("eventCount", 0)},
                {"stage": "skipped", "users": skipped, "events": skipped_row.get("eventCount", 0)},
            ],
            "steps": step_rows,
            "notes": {
                "tutorial_rates": "Distinct users at each outcome divided by distinct users who emitted tutorial_step",
                "installed_but_never_played_proxy": "Installing users minus level-starting users; exact user-level exclusion requires BigQuery export",
                "average_tutorial_time": "Set TUTORIAL_TIME_METRIC to a registered GA4 custom metric to populate this value",
            },
        }

    def _event_users(self, filters: DashboardFilters, event_name: str) -> int | float:
        rows = self.ga4.run_report(
            filters=filters,
            metrics=["totalUsers"],
            extra_filter=_exact_filter("eventName", event_name),
        )
        return rows[0].get("totalUsers", 0) if rows else 0
