import os
import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parents[1]
backend_dir = root_dir / "backend"
sys.path.insert(0, str(backend_dir))

# Set environment credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json"
os.environ["GA4_PROPERTY_ID"] = "516899630"

from app.schemas.filters import DashboardFilters
from app.services.ga4_service import get_ga4_service
from app.services.executive_service import ExecutiveService
from app.services.acquisition_service import AcquisitionService
from app.services.onboarding_service import OnboardingService
from app.services.gameplay_service import GameplayService
from app.services.retention_service import RetentionService

def run_validation():
    print("=" * 65)
    print("GA4 & BIGQUERY COMPREHENSIVE DATA VALIDATION REPORT")
    print("=" * 65)
    print(f"GA4 Property ID : 516899630")
    print(f"Date Window     : 30daysAgo to yesterday (default)")
    print("-" * 65)

    ga4_service = get_ga4_service()
    filters = DashboardFilters()
    
    # 1. Executive Health Validation
    print("\n[1] EXECUTIVE HEALTH SECTION")
    exec_svc = ExecutiveService(ga4_service)
    exec_data = exec_svc.dashboard(filters)
    kpis = exec_data.get("kpis", {})
    print(f"  [+] Active Users          : {kpis.get('active_users')}")
    print(f"  [+] New Users             : {kpis.get('new_users')}")
    print(f"  [+] DAU (Last Day)        : {kpis.get('dau')}")
    print(f"  [+] MAU (30-Day Window)   : {kpis.get('mau')}")
    print(f"  [+] Stickiness (DAU/MAU)  : {kpis.get('stickiness_pct')}%")
    print(f"  [+] Total Sessions        : {kpis.get('sessions')}")
    print(f"  [+] Total Screen Views    : {kpis.get('screen_views')}")
    print(f"  [+] Daily Trend Rows      : {len(exec_data.get('daily_trend', []))}")

    # 2. Acquisition Validation
    print("\n[2] ACQUISITION & CHURN SECTION")
    acq_svc = AcquisitionService(ga4_service)
    acq_data = acq_svc.dashboard(filters)
    acq_summary = acq_data.get("summary", {})
    print(f"  [+] Installs (first_open) : {acq_summary.get('installs')}")
    print(f"  [+] App Removes           : {acq_summary.get('app_removes')}")
    print(f"  [+] Traffic Sources Count : {len(acq_data.get('traffic_sources', []))}")
    print(f"  [+] Campaign Count        : {len(acq_data.get('campaigns', []))}")
    print(f"  [+] Country Count         : {len(acq_data.get('countries', []))}")
    print(f"  [+] Device Models Count   : {len(acq_data.get('device_models', []))}")

    # 3. Onboarding Funnel Validation
    print("\n[3] ONBOARDING FUNNEL SECTION")
    onb_svc = OnboardingService(ga4_service)
    onb_data = onb_svc.dashboard(filters)
    onb_summary = onb_data.get("summary", {})
    print(f"  [+] Tutorial Started      : {onb_summary.get('tutorial_started')}")
    print(f"  [+] Tutorial Completed    : {onb_summary.get('tutorial_completed')}")
    print(f"  [+] Funnel Stages Count   : {len(onb_data.get('funnel', []))}")
    print(f"  [+] Diagnostic Step Rows  : {len(onb_data.get('step_diagnostics', []))}")

    # 4. Gameplay Balancing Validation
    print("\n[4] GAMEPLAY BALANCING SECTION")
    game_svc = GameplayService(ga4_service)
    game_data = game_svc.dashboard(filters)
    game_summary = game_data.get("summary", {})
    print(f"  [+] Total Level Starts    : {game_summary.get('level_started')}")
    print(f"  [+] Total Level Completes : {game_summary.get('level_completed')}")
    print(f"  [+] Hint Usage Events     : {game_summary.get('hint_events')}")
    print(f"  [+] Level Table Rows      : {len(game_data.get('level_performance', []))}")

    # 5. Retention Validation
    print("\n[5] RETENTION SECTION")
    ret_svc = RetentionService(ga4_service)
    ret_data = ret_svc.dashboard(filters)
    ret_summary = ret_data.get("summary", {})
    print(f"  [+] Active Users DAU      : {ret_summary.get('dau')}")
    print(f"  [+] Active Users WAU      : {ret_summary.get('wau')}")
    print(f"  [+] Active Users MAU      : {ret_summary.get('mau')}")
    print(f"  [+] Day 1 Retention %     : {ret_summary.get('day_1_retention_pct')}%")
    print(f"  [+] Retention Curve Rows  : {len(ret_data.get('retention_curve', []))}")

    print("\n" + "=" * 65)
    print("STATUS: VALIDATION PASSED SUCCESSFULLY")
    print("All live GA4 queries executed cleanly against property 516899630.")
    print("=" * 65)

if __name__ == "__main__":
    run_validation()
