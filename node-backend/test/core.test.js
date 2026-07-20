const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { parseCredentialValue } = require("../ga4Client");
const { TTLCache } = require("../utils/cache");
const { buildCommonFilter, pagination, reportOptions } = require("../utils/filters");
const { runAllPages } = require("../services/analyticsService");
const app = require("../server");

const credential = {
  client_email: "service@example.test",
  private_key: "-----BEGIN PRIVATE KEY-----\\nvalue\\n-----END PRIVATE KEY-----\\n",
};

test("credential parser accepts raw JSON", () => {
  const parsed = parseCredentialValue(JSON.stringify(credential));
  assert.equal(parsed.client_email, credential.client_email);
  assert.match(parsed.private_key, /\nvalue\n/);
});

test("credential parser accepts base64 JSON", () => {
  const encoded = Buffer.from(JSON.stringify(credential)).toString("base64");
  assert.equal(parseCredentialValue(encoded).client_email, credential.client_email);
});

test("cache expires values", () => {
  let now = 10;
  const cache = new TTLCache(5, () => now);
  cache.set("answer", 42);
  assert.equal(cache.get("answer"), 42);
  now = 16;
  assert.equal(cache.get("answer"), undefined);
});

test("common filters map Appsmith query names to GA4 dimensions", () => {
  const filter = buildCommonFilter({ appVersion: "1.2", osVersion: "16", deviceModel: "Pixel", newReturning: "returning" });
  const names = filter.andGroup.expressions.map((item) => item.filter.fieldName);
  assert.deepEqual(names, ["appVersion", "operatingSystemVersion", "mobileDeviceModel", "newVsReturning"]);
});

test("pagination is bounded", () => {
  assert.deepEqual(pagination({ page: "3", pageSize: "500" }), { page: 3, pageSize: 200, offset: 400 });
});

test("invalid date parameters fail early", () => {
  assert.throws(() => reportOptions({ startDate: "last month" }), /Dates must use/);
});

test("GA4 offset pagination retrieves all batches", async () => {
  const calls = [];
  const client = {
    async runReport({ limit, offset }) {
      calls.push({ limit, offset });
      const all = [{ id: 1 }, { id: 2 }, { id: 3 }];
      return { rows: all.slice(offset, offset + limit), rowCount: all.length, cached: false };
    },
  };
  const result = await runAllPages(client, {}, 2);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(calls, [{ limit: 2, offset: 0 }, { limit: 2, offset: 2 }]);
});

test("health endpoint is public", async () => {
  const response = await request(app).get("/health").expect(200);
  assert.equal(response.body.status, "ok");
});

test("unknown endpoint returns JSON 404", async () => {
  const response = await request(app).get("/missing").expect(404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});

