# Deploy the Node API on Render Free

`render.yaml` deploys `node-backend` as a free Node Web Service in Singapore. It runs `npm install`, starts with `npm start`, and checks `/health`.

## Blueprint values

When Render imports the repository Blueprint, it prompts for three secret values:

- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: the service-account JSON as one raw JSON value or as base64.
- `API_KEYS`: a long random API key used by the Appsmith datasource.
- `APPSMITH_ORIGIN`: the Appsmith origin, such as `https://app.appsmith.com`; use `*` only during initial testing.

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
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$apiKey = [Convert]::ToBase64String($bytes)
$apiKey | Set-Clipboard
```

Never commit either value.

## Deploy

1. In Render, choose **New → Blueprint**.
2. Connect `harshaswami55-dot/ga4-appsmith-api`.
3. Enter the three prompted environment values.
4. Apply the Blueprint and wait for deployment.
5. Verify `https://<host>/health` and `https://<host>/ready`.

`/ready` must return `"connected": true`. Configure Appsmith with base URL `https://<host>/api` and header `X-API-Key` using the same `API_KEYS` value.

Render Free sleeps after 15 minutes idle. `appsmith/JSObjects/ApiRunner.js` retries for approximately one minute during wake-up.

