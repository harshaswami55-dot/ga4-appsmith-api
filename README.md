# Sumlink Analytics Dashboard

Live GA4 analytics dashboard system for Appsmith.

- `backend/`: production FastAPI backend connected to GA4 Data API
- `appsmith/`: Appsmith dashboard export/build files
- `render.yaml`: Render Blueprint for deploying the FastAPI backend
- `node-backend/`: older Node prototype kept as reference

GA4 property: `516899630`.

## Local backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json"
$env:GA4_PROPERTY_ID="516899630"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Local URL:

```text
https://sumlink-analytics-api.onrender.com
```

Useful checks:

```text
/health
/ready
```

## Production flow

Appsmith dashboard → Render FastAPI API → GA4 Data API

Do not put the GA4 service-account JSON inside Appsmith. Appsmith should only call the backend API.

## Render deployment

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
