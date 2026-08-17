# Report Automation

The weekly manager report can be generated from the deployed Render backend without exposing credentials in the repository.

## Command

```powershell
$env:SUMLINK_API_BASE = "https://sumlink-analytics-api.onrender.com"
$env:SUMLINK_API_KEY = "<Render API_KEYS value>"
python scripts/generate_weekly_manager_report.py
```

The script writes a dated Markdown report under `reports/weekly/`.

## Scope

- Checks backend health.
- Pulls Executive, Acquisition, Onboarding, Gameplay, Retention, Segment, and Alert endpoints.
- Summarizes KPI values for manager review.
- Keeps API keys and service-account data out of files.

## Operating Notes

- Render free instances can take 30-60 seconds to wake up.
- If a section returns `401`, update the API key.
- If a section returns `404`, confirm the endpoint path.
- If GA4 or BigQuery access changes, rerun backend validation tests before sharing the report.
