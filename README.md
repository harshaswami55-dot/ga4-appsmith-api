# Sumlink GA4 Dashboard

FastAPI is the secure analytics layer between Appsmith and GA4 property `516899630`. It owns credentials, shared filters, formulas, caching, cohort calculations, and report exports. Appsmith only renders API results.

## Included

- Executive Health, Acquisition, Onboarding, Gameplay, and Retention APIs
- A shared 13-filter query contract across every dashboard
- Service-account authentication to GA4
- Optional `X-API-Key` protection for Appsmith
- Five-minute in-memory response cache
- CSV and JSON exports
- Swagger/OpenAPI documentation
- Unit/API tests, Docker support, and Appsmith binding templates

## Start locally

The local configuration in `backend/.env` points at the service-account key you placed in `C:\Users\harsh\credentials`. That file is excluded from this repository.

```powershell
.\scripts\setup-backend.ps1
.\scripts\start-backend.ps1
```

Open:

- Swagger: <http://127.0.0.1:8000/docs>
- Health: <http://127.0.0.1:8000/health>
- GA4 readiness: <http://127.0.0.1:8000/ready>

## Dashboard endpoints

| Page | Endpoint |
|---|---|
| Executive Health | `GET /api/v1/executive/summary` |
| Acquisition | `GET /api/v1/acquisition/summary` |
| Onboarding | `GET /api/v1/onboarding/summary` |
| Gameplay | `GET /api/v1/gameplay/summary` |
| Retention | `GET /api/v1/retention/summary` |
| Settings | `GET /api/v1/settings` |
| Export | `GET /api/v1/export/{dashboard}?format=csv` |

All dashboard and export endpoints accept:

`start_date`, `end_date`, `country`, `platform`, `device_category`, `device_model`, `os_version`, `app_version`, `traffic_source`, `campaign`, `user_type`, `level_number`, and `tutorial_step`.

Dates accept `YYYY-MM-DD`, `today`, `yesterday`, or `NdaysAgo`.

## Authentication

Local development has `AUTH_ENABLED=false`. Before exposing the API, set:

```env
ENVIRONMENT=production
AUTH_ENABLED=true
API_KEYS=a-long-random-secret
CORS_ORIGINS=https://your-appsmith-host.example
```

Then configure the Appsmith datasource header `X-API-Key`. The application refuses to start in production without authentication.

## GA4 event contract

Event names are configurable in `backend/.env`. Defaults are:

- `first_open`
- `tutorial_step`, `tutorial_completed`, `tutorial_match_failed`, `tutorial_skipped`
- `level_start`, `level_complete`, `hint_used_successfully`

The property metadata exposes `customEvent:level_number` for gameplay, `customEvent:step_number` for tutorial steps, and `averageCustomEvent:time_taken` for average duration. The checked-in local configuration matches those registered API names.

If the GA4 custom definitions change, update `TUTORIAL_STEP_DIMENSION`, `LEVEL_TIME_METRIC`, and `TUTORIAL_TIME_METRIC` in `.env`.

GA4 does not directly expose uninstall counts. The Acquisition response deliberately returns `null`; add Google Play or Firebase data for that metric. Exact “installed but never played” user exclusion requires BigQuery export, so the onboarding endpoint labels its GA4-only calculation as a proxy.

## Docker

Set the host credential path, then start Compose:

```powershell
$env:GA4_CREDENTIALS_HOST_PATH="C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json"
docker compose up --build
```

Never copy the service-account JSON into an image or repository.

## Render deployment

The root `render.yaml` defines a free production web service. Follow [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) to connect the Git repository, upload the GA4 JSON as a Render secret file, set the Appsmith API key, and verify the public URL.
