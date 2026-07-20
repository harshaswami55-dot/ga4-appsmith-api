const fs = require("node:fs");
const crypto = require("node:crypto");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const config = require("./config");
const { TTLCache } = require("./utils/cache");
const { andFilters } = require("./utils/filters");

function parseCredentialValue(value) {
  if (!value) return null;
  const candidates = [value];
  try {
    candidates.push(Buffer.from(value, "base64").toString("utf8"));
  } catch (_) {
    // The raw JSON candidate is still attempted below.
  }
  for (const candidate of candidates) {
    try {
      const credentials = JSON.parse(candidate);
      if (!credentials.client_email || !credentials.private_key) continue;
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      return credentials;
    } catch (_) {
      // Try the next representation.
    }
  }
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is neither raw nor base64 service-account JSON");
}

function loadCredentials() {
  const inline = parseCredentialValue(config.credentialsJson);
  if (inline) return inline;
  if (config.credentialsPath) {
    return parseCredentialValue(fs.readFileSync(config.credentialsPath, "utf8"));
  }
  return null;
}

function number(value) {
  if (value === "" || value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalize(response) {
  const dimensions = (response.dimensionHeaders || []).map((header) => header.name);
  const metrics = (response.metricHeaders || []).map((header) => header.name);
  const rows = (response.rows || []).map((row) => {
    const item = {};
    dimensions.forEach((name, index) => { item[name] = row.dimensionValues[index]?.value || ""; });
    metrics.forEach((name, index) => { item[name] = number(row.metricValues[index]?.value); });
    return item;
  });
  return { rows, rowCount: Number(response.rowCount || rows.length) };
}

class GA4Client {
  constructor({ client, propertyId = config.propertyId, cache } = {}) {
    const credentials = loadCredentials();
    this.client = client || new BetaAnalyticsDataClient(credentials ? { credentials } : undefined);
    this.propertyId = propertyId;
    this.cache = cache || new TTLCache(config.cacheTtlMs);
  }

  async runReport({ startDate, endDate, dimensions = [], metrics, commonFilter, dimensionFilter, limit = 1000, offset = 0, orderBys = [] }) {
    const request = {
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      dimensionFilter: andFilters(commonFilter, dimensionFilter),
      orderBys,
      limit,
      offset,
      keepEmptyRows: true,
    };
    return this.execute("report", request, () => this.client.runReport(request));
  }

  async runRealtimeReport({ dimensions = [], metrics, commonFilter, dimensionFilter, limit = 100 }) {
    const request = {
      property: `properties/${this.propertyId}`,
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      dimensionFilter: andFilters(commonFilter, dimensionFilter),
      limit,
    };
    return this.execute("realtime", request, () => this.client.runRealtimeReport(request));
  }

  async execute(type, request, operation) {
    const key = crypto.createHash("sha256").update(type + JSON.stringify(request)).digest("hex");
    const cached = this.cache.get(key);
    if (cached !== undefined) return { ...cached, cached: true };
    const [response] = await operation();
    const result = normalize(response);
    this.cache.set(key, result);
    return { ...result, cached: false };
  }
}

let singleton;
function getGA4Client() {
  if (!singleton) singleton = new GA4Client();
  return singleton;
}

module.exports = { GA4Client, getGA4Client, parseCredentialValue, normalize };

