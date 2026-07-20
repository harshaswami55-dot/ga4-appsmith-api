import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import { config } from "./config";
import analyticsRouter from "./routes/analytics";
import { requireApiKey } from "./middleware/auth";
import { cacheResponse } from "./middleware/cache";
import { validateAnalyticsQuery } from "./middleware/validation";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { getGA4Client } from "./ga4Client";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(pinoHttp({ autoLogging: config.nodeEnv !== "test", quietReqLogger: config.nodeEnv === "test" }));
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"));
    },
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
  }));
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", requireApiKey, async (_req, res, next) => {
    try {
      const report = await getGA4Client().runReport({ startDate: "yesterday", endDate: "yesterday", metrics: ["activeUsers"] });
      res.json({ status: "ready", ga4: { connected: true, activeUsersYesterday: report.rows[0]?.activeUsers || 0 } });
    } catch (error) { next(error); }
  });

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Rate limit exceeded. Try again in one minute." },
  });
  app.use("/api", apiLimiter, requireApiKey, validateAnalyticsQuery, cacheResponse, analyticsRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
