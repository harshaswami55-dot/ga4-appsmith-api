# Deploy the Node API on Render Free

`render.yaml` deploys `node-backend` as a free Node Web Service in Singapore. It runs `npm install && npm run build`, starts compiled TypeScript with `npm start`, and checks `/health`.

## Blueprint values

When Render imports the repository Blueprint, it prompts for four environment values:

- `GOOGLE_SERVICE_ACCOUNT_JSON`: the service-account JSON encoded as base64.
- `GA4_PROPERTY_ID`: `516899630`.
- `API_KEY`: a long random API key used by the Appsmith datasource.
- `ALLOWED_ORIGINS`: comma-separated Appsmith origins such as `https://app.appsmith.com`. Wildcards are not accepted.

Create the credential value in PowerShell without printing it:

```powershell
$credentialPath = "C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json"
$credentialBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($credentialPath))
```

Copy `$credentialBase64` to the Render environment value using the clipboard:

```powershell
$credentialBase64 | Set-Clipboard
```

Generate and copy an API key:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$apiKey = [Convert]::ToBase64String($bytes)
$apiKey | Set-Clipboard
```

Never commit either value.

## Deploy

1. In Render, choose **New → Blueprint**.
2. Connect `harshaswami55-dot/ga4-appsmith-api`.
3. Enter the four prompted environment values.
4. Apply the Blueprint and wait for deployment.
5. Verify `https://<host>/health` and `https://<host>/ready`.

`/ready` must return `"connected": true` when called with the `x-api-key` header. Configure Appsmith with base URL `https://<host>/api` and the same `API_KEY` value.

Render Free sleeps after 15 minutes idle. `appsmith/JSObjects/ApiRunner.js` retries for approximately one minute during wake-up.
