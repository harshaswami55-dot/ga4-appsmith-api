# Deploy the FastAPI GA4 backend on Render

`render.yaml` now deploys the `backend/` FastAPI service as a Render Docker Web Service. This is the API that Appsmith calls to fetch live GA4 data from property `516899630`.

## Flow

Appsmith dashboard → Render FastAPI API → GA4 Data API

Render hosts the backend API only. Appsmith itself still needs to run separately, either through the current local/self-hosted Appsmith setup or another Appsmith host.

## Render environment variables

Render will ask for these secrets:

- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
- `API_KEYS`
- `CORS_ORIGINS`

These are already set in `render.yaml`:

- `ENVIRONMENT=production`
- `GA4_PROPERTY_ID=516899630`
- `AUTH_ENABLED=true`
- `CACHE_TTL_SECONDS=300`

## Create the GA4 credential secret

Run this in PowerShell. It copies the base64 service-account JSON to your clipboard without printing the key:

```powershell
$credentialPath = "C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json"
[Convert]::ToBase64String([IO.File]::ReadAllBytes($credentialPath)) | Set-Clipboard
```

Paste that value into Render as:

```text
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
```

## Create the API key secret

Run this in PowerShell. It copies a random API key to your clipboard:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
[Convert]::ToBase64String($bytes) | Set-Clipboard
```

Paste that value into Render as:

```text
API_KEYS
```

For local Appsmith testing you can temporarily set:

```text
CORS_ORIGINS=*
```

For production, lock it to the final Appsmith URL.

## Deploy from GitHub

1. Push this repository to GitHub.
2. Open Render.
3. Choose **New → Blueprint**.
4. Select `harshaswami55-dot/ga4-appsmith-api`.
5. Enter the three secret env vars above.
6. Apply the Blueprint and wait for the service to become live.

Check:

```text
https://<your-render-service>.onrender.com/health
```

Then check readiness with the API key:

```powershell
curl.exe -H "x-api-key: YOUR_API_KEY" https://<your-render-service>.onrender.com/ready
```

`/ready` should show GA4 connected.

## Connect Appsmith to Render

After Render is live, update the Appsmith REST datasource/base URL:

```text
https://<your-render-service>.onrender.com
```

Add this header to Appsmith API calls:

```text
x-api-key: YOUR_API_KEY
```

Render Free can sleep when idle, so the first request after inactivity may take extra time.
