# Sumlink Analytics Dashboard

Full-stack GA4 analytics system for Appsmith and Render:

- `node-backend/`: the production TypeScript/Express API required by the dashboard specification
- `appsmith/`: query, JS Object, filter, widget, chart, and page-build instructions
- `backend/`: the earlier FastAPI implementation retained as a tested reference
- `render.yaml`: Render Free Blueprint for the Node service

GA4 property: `516899630`.

## Production backend

```powershell
cd node-backend
npm install
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json"
$env:GA4_PROPERTY_ID="516899630"
npm start
```

Local URL: `http://127.0.0.1:8000`. Health and GA4 readiness are available at `/health` and `/ready`.

The API includes ten dashboard endpoints, common Appsmith filters, GA4 offset pagination, five-minute endpoint caching, strict CORS, rate limiting, Helmet, Pino logging, Zod validation, API-key protection, and base64 service-account credentials for Render.

See:

- [Node backend and GA4 setup](node-backend/README.md)
- [Render deployment](RENDER_DEPLOYMENT.md)
- [Appsmith dashboard build](appsmith/README.md)

## Security

The service-account JSON and local `.env` files are ignored by Git. Render receives the key through the secret `GOOGLE_SERVICE_ACCOUNT_JSON` environment value. Appsmith receives only the public Render URL and an `x-api-key`; it never receives GA4 credentials.

## Validation

Run:

```powershell
cd node-backend
npm test
```

All endpoints have also been exercised directly against the live GA4 property.
