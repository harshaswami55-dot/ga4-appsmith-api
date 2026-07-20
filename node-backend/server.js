const crypto = require("node:crypto");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const analyticsRouter = require("./routes/analytics");
const { getGA4Client } = require("./ga4Client");

const app = express();
const origins = config.appsmithOrigins;
app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes("*") || origins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not permitted by APPSMITH_ORIGIN");
    error.statusCode = 403;
    return callback(error);
  },
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-API-Key"],
}));
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "Sumlink Analytics Dashboard", version: "1.0.0" }));

app.use((req, res, next) => {
  if (!config.authEnabled) return next();
  const provided = req.get("X-API-Key") || "";
  const valid = config.apiKeys.some((key) => key.length === provided.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(provided)));
  if (!valid) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "A valid X-API-Key header is required" } });
  return next();
});

app.get("/ready", async (_req, res, next) => {
  try {
    const ga4 = getGA4Client();
    const report = await ga4.runReport({ startDate: "yesterday", endDate: "yesterday", metrics: ["activeUsers"] });
    res.json({ status: "ready", ga4: { connected: true, activeUsersYesterday: report.rows[0]?.activeUsers || 0 } });
  } catch (error) {
    next(error);
  }
});
app.use("/api", analyticsRouter);

app.use((req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } }));
app.use((error, _req, res, _next) => {
  const status = error.statusCode || 502;
  const message = config.nodeEnv === "production" && status >= 500
    ? "Analytics query failed. Check the Render logs for details."
    : error.message;
  if (status >= 500) console.error(error.message);
  res.status(status).json({ error: { code: status >= 500 ? "GA4_QUERY_FAILED" : "BAD_REQUEST", message } });
});

if (require.main === module) {
  app.listen(config.port, "0.0.0.0", () => console.log(`Sumlink Analytics API listening on port ${config.port}`));
}

module.exports = app;

