from app.schemas.filters import DashboardFilters
from app.services.ga4_service import GA4Service, _exact_filter


class AcquisitionService:
    def __init__(self, ga4: GA4Service):
        self.ga4 = ga4

    def dashboard(self, filters: DashboardFilters) -> dict:
        install_rows = self.ga4.run_report(
            filters=filters,
            metrics=["eventCount", "totalUsers"],
            extra_filter=_exact_filter("eventName", self.ga4.settings.event_install),
        )
        installs = install_rows[0] if install_rows else {}
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
        return {
            "kpis": {
                "installs": installs.get("eventCount", 0),
                "installing_users": installs.get("totalUsers", 0),
                "uninstalls": None,
            },
            "campaign_performance": campaign_performance,
            "traffic_sources": traffic_sources,
            "countries": countries,
            "devices": devices,
            "notes": {
                "installs": f"GA4 {self.ga4.settings.event_install} event count",
                "uninstalls": "Not available from the GA4 Data API; integrate Google Play/Firebase data separately",
            },
        }

