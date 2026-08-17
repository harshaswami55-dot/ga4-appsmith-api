# Sumlink Analytics Dashboard

Live GA4 analytics dashboard system for Appsmith.

- `backend/`: production FastAPI backend connected to GA4 Data API and BigQuery
- `appsmith/`: single Appsmith dashboard export plus page notes
- `render.yaml`: Render Blueprint for deploying the FastAPI backend
- `node-backend/`: older Node prototype kept as reference

GA4 property: `516899630`.

## Local Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\ga4-service-account.json"
$env:GA4_PROPERTY_ID="516899630"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Local URL:

```text
http://localhost:8000
```

Useful checks:

```text
/health
/ready
/api/v1/segments/summary
/api/v1/alerts/rules
/api/v1/alerts/summary
```

## Production Flow

Appsmith dashboard -> Render FastAPI API -> GA4 Data API and BigQuery

Do not put the GA4 service-account JSON inside Appsmith. Appsmith should only call the backend API.

## Appsmith File

Use this dashboard export for the Appsmith workflow:

- `appsmith/Sumlink Dashboard.json`: default production copy for sharing/import.

The file contains the five dashboard pages and the five protected Render API queries. Keep duplicate exports out of the repo unless they are intentionally archived.

Refresh local self-hosted Appsmith from the export with the Docker-side apply helper:

```powershell
docker cp "appsmith/Sumlink Dashboard.json" <appsmith-container>:/tmp/sumlink-analytics-dashboard.appsmith.json
docker cp scripts/apply-appsmith-import-local.cjs <appsmith-container>:/tmp/apply-appsmith-import-local.cjs
docker exec <appsmith-container> node /tmp/apply-appsmith-import-local.cjs
```

## Render Deployment

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md).

Render needs:

- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
- `API_KEYS`
- `CORS_ORIGINS`

## Validation

```powershell
cd backend
.\.venv\Scripts\pytest.exe
```

The backend has been validated against the live GA4 property using the local service-account credential.

## Analytics Roadmap Implementation

- `reports/Sumlink_Analytics_1_Year_Roadmap.md`: manager-facing 1-year roadmap.
- `docs/analytics/ROADMAP_IMPLEMENTATION_TRACKER.md`: quarter-by-quarter execution tracker.
- `docs/analytics/KPI_DICTIONARY.md`: KPI formulas, sources, and validation rules.
- `docs/analytics/Q1_SPRINT_BACKLOG.md`: practical sprint backlog for the first quarter.
- `docs/analytics/VALIDATION_AND_REPORTING_CADENCE.md`: weekly validation and reporting checklist.
- `docs/analytics/ALERT_RULES.md`: first alert definitions for Q3 monitoring.
- `docs/analytics/REPORT_AUTOMATION.md`: Q4 weekly manager report automation.

Implemented roadmap API additions:

- `GET /api/v1/segments/summary`: Q2 country, version, OS, device, source/channel, user-type, and level segmentation.
- `GET /api/v1/alerts/rules`: Q3 alert threshold catalog.
- `POST /api/v1/alerts/evaluate`: Q3 threshold-based alert evaluation.
- `GET /api/v1/alerts/summary`: Q3 live current-period vs previous-period alert evaluation.
- `scripts/generate_weekly_manager_report.py`: Q4 live weekly manager report generator.
- `scripts/generate_monthly_manager_report.py`: Q4 live monthly manager report generator.
