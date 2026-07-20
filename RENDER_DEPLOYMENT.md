# Deploy the API on Render Free

The repository includes `render.yaml`, so Render can create the Python service with the correct build command, production settings, health check, event mapping, and free instance type.

## Before deploying

The code must be in a GitHub, GitLab, or Bitbucket repository accessible to your Render account. Do not add `backend/.env` or the GA4 JSON file to Git; both are already covered by `.gitignore`.

Generate a long random API key locally:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Copy the result temporarily. It will be stored in Render and in the Appsmith datasource header.

## Create the Render service

1. Sign in at <https://dashboard.render.com>.
2. Choose **New → Blueprint**.
3. Connect the repository containing this project.
4. Render detects the root `render.yaml` and proposes `sumlink-analytics-api` on the Free plan.
5. When prompted for `API_KEYS`, paste the random key generated above.
6. Create the Blueprint and wait for the initial deploy.

## Upload the GA4 credential securely

The service will not become ready until this step is complete:

1. Open the Render service.
2. Open **Environment → Secret Files → Add Secret File**.
3. Set the filename to exactly `ga4-service-account.json`.
4. Open the local service-account JSON in a text editor and paste its entire contents into Render's **Contents** field.
5. Save and deploy.

Render exposes that secret only at `/etc/secrets/ga4-service-account.json`. Never commit it or add its JSON content as a normal Blueprint value.

## Verify

After deployment, replace the hostname below with the URL Render assigned:

```text
https://sumlink-analytics-api.onrender.com/health
https://sumlink-analytics-api.onrender.com/ready
https://sumlink-analytics-api.onrender.com/docs
```

`/ready` should return `"connected": true`.

## Connect Appsmith

Update the `SumlinkAPI` datasource:

- Base URL: `https://<your-render-hostname>/api/v1`
- Header name: `X-API-Key`
- Header value: the same random API key stored in Render

Keep the API key in the datasource configuration, not in a JS Object or visible widget.

For each page, disable the API query's automatic page-load execution and call it through `ApiRunner.run(QueryName)` on page load. The retry helper allows up to about one minute for a sleeping free service to wake.

## Free-tier behavior

Render Free sleeps after 15 minutes without incoming traffic. The next dashboard visit wakes it and can take about one minute. It also has 750 workspace-level free instance hours per calendar month and an ephemeral filesystem. This API stores no business data locally, and the GA4 credential is injected as a Render secret file, so restarts and sleep do not lose dashboard data.

For an instant dashboard on every visit, upgrade only the Render service instance; no application changes are required.

