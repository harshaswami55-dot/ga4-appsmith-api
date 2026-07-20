import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const split = (value = "") => value.split(",").map((item) => item.trim()).filter(Boolean);
const legacyApiKey = split(process.env.API_KEYS)[0] || "";
const configuredOrigins = split(process.env.ALLOWED_ORIGINS || process.env.APPSMITH_ORIGIN);

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  propertyId: process.env.GA4_PROPERTY_ID || "516899630",
  serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "",
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  apiKey: process.env.API_KEY || legacyApiKey,
  allowedOrigins: configuredOrigins.filter((origin) => origin !== "*"),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
};

if (config.nodeEnv === "production" && !config.apiKey) {
  throw new Error("Production requires API_KEY");
}

