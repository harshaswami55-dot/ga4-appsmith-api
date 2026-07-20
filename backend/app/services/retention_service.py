import re

from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service, _exact_filter
from app.utils.numbers import percent


class RetentionService:
    TARGET_DAYS = (1, 3, 7, 14, 30)

    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        cohort_rows = self.ga4.run_cohort_report(filters=filters, end_offset=max(self.TARGET_DAYS))
        curve = []
        for row in cohort_rows:
            day = self._day_number(str(row.get("cohortNthDay", "")))
            active = row.get("cohortActiveUsers", 0)
            total = row.get("cohortTotalUsers", 0)
            curve.append(
                {
                    "day": day,
                    "active_users": active,
                    "cohort_users": total,
                    "retention_pct": percent(active, total),
                }
            )
        curve.sort(key=lambda item: item["day"])
        by_day = {item["day"]: item["retention_pct"] for item in curve}

        returning_rows = self.ga4.run_report(
            filters=filters,
            metrics=["activeUsers"],
            extra_filter=_exact_filter("newVsReturning", "returning"),
        )
        returning = returning_rows[0].get("activeUsers", 0) if returning_rows else 0

        return {
            "kpis": {
                **{f"day_{day}_retention_pct": by_day.get(day, 0) for day in self.TARGET_DAYS},
                "returning_users": returning,
            },
            "retention_curve": curve,
            "definitions": {
                "cohort": "Users whose first session occurred in the selected date range",
                "retention": "Cohort active users divided by total cohort users on each nth day",
            },
        }

    @staticmethod
    def _day_number(value: str) -> int:
        match = re.search(r"(\d+)$", value)
        return int(match.group(1)) if match else 0

