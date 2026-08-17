from __future__ import annotations

import json
import os
import sys
from argparse import ArgumentParser
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_BASE = os.getenv("SUMLINK_API_BASE", "https://sumlink-analytics-api.onrender.com").rstrip("/")
API_KEY = os.getenv("SUMLINK_API_KEY") or os.getenv("API_KEY")
REPORT_ROOT = Path("reports")


ENDPOINTS = {
    "Executive Health": "/api/executive-health",
    "Acquisition": "/api/acquisition-churn",
    "Onboarding": "/api/onboarding-funnel",
    "Gameplay": "/api/gameplay-balancing",
    "Retention": "/api/retention",
    "Segments": "/api/v1/segments/summary",
    "Alert Rules": "/api/v1/alerts/rules",
    "Alert Summary": "/api/v1/alerts/summary",
}


def fetch(path: str) -> tuple[int, dict]:
    headers = {"x-api-key": API_KEY} if API_KEY else {}
    request = Request(f"{API_BASE}{path}", headers=headers)
    try:
        with urlopen(request, timeout=60) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        return exc.code, {"error": exc.read().decode("utf-8", errors="replace")}
    except URLError as exc:
        return 0, {"error": str(exc)}


def compact_kpis(payload: dict) -> list[str]:
    data = payload.get("data", {})
    kpis = data.get("kpis", {})
    lines = []
    for key, value in kpis.items():
        if isinstance(value, (int, float, str)):
            lines.append(f"- {key}: {value}")
    return lines[:12]


def parse_args() -> tuple[str, Path]:
    parser = ArgumentParser(description="Generate Sumlink manager analytics report from the live backend.")
    parser.add_argument("--cadence", choices=["weekly", "monthly"], default="weekly")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()
    return args.cadence, args.out_dir or REPORT_ROOT / args.cadence


def main() -> int:
    if not API_KEY:
        print("Set SUMLINK_API_KEY before generating the report.", file=sys.stderr)
        return 2

    cadence, out_dir = parse_args()
    out_dir.mkdir(parents=True, exist_ok=True)
    report_date = date.today().isoformat()
    cadence_title = cadence.capitalize()
    output = out_dir / f"Sumlink_{cadence_title}_Manager_Report_{report_date}.md"

    lines = [
        f"# Sumlink {cadence_title} Analytics Report",
        "",
        f"Generated: {report_date}",
        f"Backend: {API_BASE}",
        "",
        "## Endpoint Status",
        "",
    ]

    results = {}
    health_status, health_payload = fetch("/health")
    lines.append(f"- Health: HTTP {health_status} - {health_payload.get('status', health_payload.get('error', 'unknown'))}")

    for name, path in ENDPOINTS.items():
        status, payload = fetch(path)
        results[name] = payload
        lines.append(f"- {name}: HTTP {status}")

    lines.extend(["", "## KPI Snapshot", ""])
    for name, payload in results.items():
        kpi_lines = compact_kpis(payload)
        if not kpi_lines:
            continue
        lines.extend([f"### {name}", "", *kpi_lines, ""])

    alert_payload = results.get("Alert Summary", {}).get("data", {})
    alerts = alert_payload.get("alerts", [])
    lines.extend(["## Alert Summary", ""])
    if alerts:
        for alert in alerts:
            lines.append(
                f"- {alert.get('severity', 'unknown').upper()}: {alert.get('code')} - {alert.get('message')}"
            )
    else:
        lines.append("- No threshold alerts were triggered for the selected comparison window.")
    lines.append("")

    lines.extend(
        [
            "## Alert Governance",
            "",
            "Configured alert thresholds are maintained in the backend alert rules service.",
            "Current production use is threshold-based with live previous-period comparison; predictive modelling starts after stable baseline history is available.",
            "",
            "## Notes",
            "",
            "- Report excludes API keys, service-account JSON, and other secrets.",
            "- GA4 and BigQuery validation evidence is consolidated in the final manager report.",
        ]
    )

    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
