import fs from "node:fs";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { config } from "./config";
import { andFilters } from "./utils/filters";

export function parseCredentialValue(value: string): Record<string, string> | null {
  if (!value) return null;
  const candidates = [value];
  try { candidates.unshift(Buffer.from(value, "base64").toString("utf8")); } catch { /* raw JSON fallback */ }
  for (const candidate of candidates) {
    try {
      const credential = JSON.parse(candidate);
      if (!credential.client_email || !credential.private_key) continue;
      credential.private_key = credential.private_key.replace(/\\n/g, "\n");
      return credential;
    } catch { /* try next representation */ }
  }
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid base64 service-account JSON");
}

function loadCredentials() {
  const inline = parseCredentialValue(config.serviceAccountJson);
  if (inline) return inline;
  if (config.credentialsPath) return parseCredentialValue(fs.readFileSync(config.credentialsPath, "utf8"));
  return null;
}

const number = (value: string) => Number.isFinite(Number(value)) ? Number(value) : value;

export function normalize(response: any) {
  const dimensions = (response.dimensionHeaders || []).map((header: any) => header.name);
  const metrics = (response.metricHeaders || []).map((header: any) => header.name);
  const rows = (response.rows || []).map((row: any) => {
    const item: Record<string, any> = {};
    dimensions.forEach((name: string, index: number) => { item[name] = row.dimensionValues[index]?.value || ""; });
    metrics.forEach((name: string, index: number) => { item[name] = number(row.metricValues[index]?.value || "0"); });
    return item;
  });
  return { rows, rowCount: Number(response.rowCount || rows.length) };
}

export class GA4Client {
  client: BetaAnalyticsDataClient;
  propertyId: string;

  constructor(options: { client?: BetaAnalyticsDataClient; propertyId?: string } = {}) {
    const credentials = loadCredentials();
    this.client = options.client || new BetaAnalyticsDataClient(credentials ? { credentials } : undefined);
    this.propertyId = options.propertyId || config.propertyId;
  }

  async runReport({ startDate, endDate, dimensions = [], metrics, commonFilter, dimensionFilter, limit = 1000, offset = 0, orderBys = [] }: any) {
    const request: any = {
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map((name: string) => ({ name })),
      metrics: metrics.map((name: string) => ({ name })),
      dimensionFilter: andFilters(commonFilter, dimensionFilter),
      orderBys, limit, offset, keepEmptyRows: true,
    };
    const [response] = await this.client.runReport(request);
    return normalize(response);
  }

  async runRealtimeReport({ dimensions = [], metrics, commonFilter, dimensionFilter, limit = 100 }: any) {
    const request: any = {
      property: `properties/${this.propertyId}`,
      dimensions: dimensions.map((name: string) => ({ name })),
      metrics: metrics.map((name: string) => ({ name })),
      dimensionFilter: andFilters(commonFilter, dimensionFilter), limit,
    };
    const [response] = await this.client.runRealtimeReport(request);
    return normalize(response);
  }
}

let singleton: GA4Client;
export const getGA4Client = () => singleton ||= new GA4Client();

