const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const split = (value = "") => value.split(",").map((item) => item.trim()).filter(Boolean);

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  propertyId: process.env.GA4_PROPERTY_ID || "516899630",
  credentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "",
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  appsmithOrigins: split(process.env.APPSMITH_ORIGIN || "*"),
  authEnabled: String(process.env.AUTH_ENABLED || "false").toLowerCase() === "true",
  apiKeys: split(process.env.API_KEYS),
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 300000),
};

if (config.nodeEnv === "production" && (!config.authEnabled || config.apiKeys.length === 0)) {
  throw new Error("Production requires AUTH_ENABLED=true and at least one API_KEYS value");
}

module.exports = config;

