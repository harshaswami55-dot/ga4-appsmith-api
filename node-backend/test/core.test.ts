import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.API_KEY = "test-api-key";
process.env.ALLOWED_ORIGINS = "https://app.example.com";

const { parseCredentialValue } = require("../src/ga4Client");
const { analyticsQuerySchema, buildCommonFilter, pagination } = require("../src/utils/filters");
const { runAllPages } = require("../src/services/analyticsService");
const { createApp } = require("../src/app");

const app = createApp();
const credential = {
  client_email: "service@example.test",
  private_key: "-----BEGIN PRIVATE KEY-----\\nvalue\\n-----END PRIVATE KEY-----\\n",
};

test("credential parser accepts base64 JSON without disk writes", () => {
  const encoded = Buffer.from(JSON.stringify(credential)).toString("base64");
  const parsed = parseCredentialValue(encoded);
  assert.equal(parsed.client_email, credential.client_email);
  assert.match(parsed.private_key, /\nvalue\n/);
});

test("Zod parser applies defaults and validates filters", () => {
  const query = analyticsQuerySchema.parse({ appVersion: "1.2", newReturning: "returning" });
  assert.equal(query.startDate, "30daysAgo");
  assert.equal(query.pageSize, 20);
  const fields = buildCommonFilter(query).andGroup.expressions.map((item: any) => item.filter.fieldName);
  assert.deepEqual(fields, ["appVersion", "newVsReturning"]);
});

test("Zod parser rejects invalid values", () => {
  assert.equal(analyticsQuerySchema.safeParse({ startDate: "last month" }).success, false);
  assert.equal(analyticsQuerySchema.safeParse({ newReturning: "sometimes" }).success, false);
  assert.equal(analyticsQuerySchema.safeParse({ startDate: "2026-07-20", endDate: "2026-07-01" }).success, false);
});

test("pagination uses validated page values", () => {
  const query = analyticsQuerySchema.parse({ page: "3", pageSize: "50" });
  assert.deepEqual(pagination(query), { page: 3, pageSize: 50, offset: 100 });
});

test("GA4 offset pagination retrieves all batches", async () => {
  const calls: unknown[] = [];
  const client = {
    async runReport({ limit, offset }: any) {
      calls.push({ limit, offset });
      const all = [{ id: 1 }, { id: 2 }, { id: 3 }];
      return { rows: all.slice(offset, offset + limit), rowCount: all.length };
    },
  };
  const result = await runAllPages(client, {}, 2);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(calls, [{ limit: 2, offset: 0 }, { limit: 2, offset: 2 }]);
});

test("health is public and minimal", async () => {
  const response = await request(app).get("/health").expect(200);
  assert.deepEqual(response.body, { status: "ok" });
  assert.ok(response.headers["x-content-type-options"]);
});

test("API routes require x-api-key", async () => {
  const response = await request(app).get("/api/executive-health").expect(401);
  assert.deepEqual(response.body, { error: "Missing or invalid x-api-key" });
});

test("validation errors use consistent JSON", async () => {
  const response = await request(app)
    .get("/api/executive-health?startDate=bad")
    .set("x-api-key", "test-api-key")
    .expect(400);
  assert.equal(typeof response.body.error, "string");
});

test("CORS permits configured origin", async () => {
  const response = await request(app).get("/health").set("Origin", "https://app.example.com").expect(200);
  assert.equal(response.headers["access-control-allow-origin"], "https://app.example.com");
});
