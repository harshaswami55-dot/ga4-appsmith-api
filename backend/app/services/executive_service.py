from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service
from app.utils.dates import thirty_day_window_ending
from app.utils.numbers import percent


class ExecutiveService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        summary_rows = self.ga4.run_report(
            filters=filters,
            metrics=["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate"],
        )
        summary = summary_rows[0] if summary_rows else {}
        trend = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate"],
            order_bys=[{"dimension": {"dimension_name": "date"}}],
        )
        dau = trend[-1].get("activeUsers", 0) if trend else 0
        mau_start, mau_end = thirty_day_window_ending(filters.end_date)
        mau_filters = filters.model_copy(update={"start_date": mau_start, "end_date": mau_end})
        mau_rows = self.ga4.run_report(filters=mau_filters, metrics=["activeUsers"])
        mau = mau_rows[0].get("activeUsers", 0) if mau_rows else 0
        for row in trend:
            row["stickiness_pct"] = percent(row.get("activeUsers", 0), mau)
            row["engagement_rate_pct"] = round(float(row.get("engagementRate", 0)) * 100, 2)

        return {
            "kpis": {
                "active_users": summary.get("activeUsers", 0),
                "new_users": summary.get("newUsers", 0),
                "dau": dau,
                "mau": mau,
                "stickiness_pct": percent(dau, mau),
                "engagement_rate_pct": round(float(summary.get("engagementRate", 0)) * 100, 2),
                "sessions": summary.get("sessions", 0),
                "screen_views": summary.get("screenPageViews", 0),
            },
            "daily_trend": trend,
            "definitions": {
                "dau": "Active users on the final selected day",
                "mau": "Active users in the 30-day window ending on the selected end date",
                "stickiness_pct": "DAU divided by MAU, expressed as a percentage",
            },
        }
