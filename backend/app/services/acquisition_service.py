from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service, _exact_filter
from app.utils.numbers import percent


class AcquisitionService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        settings = self.ga4.settings
        install_rows = self.ga4.run_report(
            filters=filters,
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", settings.event_install),
        )
        installs = install_rows[0] if install_rows else {}
        uninstall_rows = self.ga4.run_report(
            filters=filters,
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", settings.event_app_remove),
        )
        uninstalls = uninstall_rows[0] if uninstall_rows else {}
        daily_installs = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", settings.event_install),
            limit=500,
        )
        daily_uninstalls = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", settings.event_app_remove),
            limit=500,
        )
        daily_level_starts = self.ga4.run_report(
            filters=filters,
            dimensions=["date"],
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", settings.event_level_start),
            limit=500,
        )
        daily_growth_churn = self._merge_daily_growth_churn(daily_installs, daily_uninstalls, daily_level_starts)
        installed_but_not_played_users = sum(
            row.get("never_played_proxy_users", 0) for row in daily_growth_churn
        )
        not_played_not_removed_users = sum(
            row.get("not_played_not_removed_proxy_users", 0) for row in daily_growth_churn
        )
        daily_source_users = self.ga4.run_report(
            filters=filters,
            dimensions=["date", "firstUserSource"],
            metrics=["newUsers", "activeUsers"],
            order_bys=[{"dimension": {"dimension_name": "date"}}],
            limit=1000,
        )
        campaign_performance = self.ga4.run_report(
            filters=filters,
            dimensions=["firstUserSource", "firstUserCampaignName"],
            metrics=["newUsers", "activeUsers", "sessions", "keyEvents"],
            order_bys=[{"metric": {"metric_name": "newUsers"}, "desc": True}],
            limit=250,
        )
        traffic_sources = self.ga4.run_report(
            filters=filters,
            dimensions=["firstUserSource", "firstUserMedium"],
            metrics=["newUsers", "activeUsers", "sessions"],
            order_bys=[{"metric": {"metric_name": "newUsers"}, "desc": True}],
            limit=100,
        )
        countries = self.ga4.run_report(
            filters=filters,
            dimensions=["country"],
            metrics=["newUsers", "activeUsers"],
            order_bys=[{"metric": {"metric_name": "newUsers"}, "desc": True}],
            limit=250,
        )
        devices = self.ga4.run_report(
            filters=filters,
            dimensions=["platform", "deviceCategory", "mobileDeviceModel"],
            metrics=["newUsers", "activeUsers"],
            order_bys=[{"metric": {"metric_name": "activeUsers"}, "desc": True}],
            limit=250,
        )
        acquisition_totals_rows = self.ga4.run_report(
            filters=filters,
            metrics=["newUsers", "activeUsers", "sessions"],
        )
        acquisition_totals = acquisition_totals_rows[0] if acquisition_totals_rows else {}
        return {
            "kpis": {
                "installs": installs.get("eventCount", 0),
                "installing_users": installs.get("totalUsers", 0),
                "new_users": acquisition_totals.get("newUsers", 0),
                "active_users": acquisition_totals.get("activeUsers", 0),
                "sessions": acquisition_totals.get("sessions", 0),
                "uninstalls": uninstalls.get("eventCount", 0),
                "observed_android_churn_pct": percent(uninstalls.get("totalUsers", 0), installs.get("totalUsers", 0)),
                "installed_but_not_played_users": installed_but_not_played_users,
                "installed_but_not_played_pct": percent(
                    installed_but_not_played_users,
                    sum(row.get("installing_users", 0) for row in daily_growth_churn),
                ),
                "not_played_not_removed_proxy_users": not_played_not_removed_users,
                "not_played_not_removed_proxy_pct": percent(
                    not_played_not_removed_users,
                    sum(row.get("installing_users", 0) for row in daily_growth_churn),
                ),
            },
            "daily_growth_churn": daily_growth_churn,
            "daily_source_users": daily_source_users,
            "campaign_performance": campaign_performance,
            "traffic_sources": traffic_sources,
            "countries": countries,
            "devices": devices,
            "notes": {
                "installs": f"GA4 {settings.event_install} event count",
                "uninstalls": f"Observed GA4 {settings.event_app_remove} event count; this is a proxy, not guaranteed true churn",
                "observed_android_churn_pct": f"{settings.event_app_remove} users divided by {settings.event_install} users in the selected window",
                "never_played_proxy": f"{settings.event_install} users minus {settings.event_level_start} users by day; exact user-level exclusion requires BigQuery export",
                "not_played_not_removed_proxy": f"{settings.event_install} users minus {settings.event_level_start} users minus {settings.event_app_remove} users by day; exact user-level audience requires BigQuery export",
            },
        }

    @staticmethod
    def _merge_daily_growth_churn(daily_installs: list[dict], daily_uninstalls: list[dict], daily_level_starts: list[dict]) -> list[dict]:
        by_date: dict[str, dict] = {}
        for row in daily_installs:
            date = str(row.get("date", ""))
            by_date.setdefault(
                date,
                {
                    "date": date,
                    "installs": 0,
                    "installing_users": 0,
                    "uninstalls": 0,
                    "uninstalling_users": 0,
                    "played_users": 0,
                    "never_played_proxy_users": 0,
                    "never_played_proxy_pct": 0,
                    "not_played_not_removed_proxy_users": 0,
                    "not_played_not_removed_proxy_pct": 0,
                },
            )
            by_date[date]["installs"] = row.get("eventCount", 0)
            by_date[date]["installing_users"] = row.get("totalUsers", 0)
        for row in daily_uninstalls:
            date = str(row.get("date", ""))
            by_date.setdefault(
                date,
                {
                    "date": date,
                    "installs": 0,
                    "installing_users": 0,
                    "uninstalls": 0,
                    "uninstalling_users": 0,
                    "played_users": 0,
                    "never_played_proxy_users": 0,
                    "never_played_proxy_pct": 0,
                    "not_played_not_removed_proxy_users": 0,
                    "not_played_not_removed_proxy_pct": 0,
                },
            )
            by_date[date]["uninstalls"] = row.get("eventCount", 0)
            by_date[date]["uninstalling_users"] = row.get("totalUsers", 0)
        for row in daily_level_starts:
            date = str(row.get("date", ""))
            by_date.setdefault(
                date,
                {
                    "date": date,
                    "installs": 0,
                    "installing_users": 0,
                    "uninstalls": 0,
                    "uninstalling_users": 0,
                    "played_users": 0,
                    "never_played_proxy_users": 0,
                    "never_played_proxy_pct": 0,
                    "not_played_not_removed_proxy_users": 0,
                    "not_played_not_removed_proxy_pct": 0,
                },
            )
            by_date[date]["played_users"] = row.get("totalUsers", 0)
        for item in by_date.values():
            item["never_played_proxy_users"] = max(item["installing_users"] - item["played_users"], 0)
            item["never_played_proxy_pct"] = percent(item["never_played_proxy_users"], item["installing_users"])
            item["not_played_not_removed_proxy_users"] = max(
                item["installing_users"] - item["played_users"] - item["uninstalling_users"],
                0,
            )
            item["not_played_not_removed_proxy_pct"] = percent(
                item["not_played_not_removed_proxy_users"],
                item["installing_users"],
            )
        return [by_date[date] for date in sorted(by_date)]
