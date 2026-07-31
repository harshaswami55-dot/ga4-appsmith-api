import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://sumlink-analytics-api.onrender.com";
const API_KEY = "UB9c9YFakU4h8+eFZGalibxAJH+c4s2SBu0NJxux0HQ=";

const QUERY_ENDPOINTS = {
  ExecutiveSummary: "/api/executive-health",
  AcquisitionSummary: "/api/acquisition-churn",
  OnboardingSummary: "/api/onboarding-funnel",
  GameplaySummary: "/api/gameplay-balancing",
  RetentionSummary: "/api/retention",
};

const OLD_BASE_PATTERNS = [
  /http:\/\/host\.docker\.internal:8000/g,
  /http:\/\/localhost:8000/g,
  /http:\/\/127\.0\.0\.1:8000/g,
  /https?:\/\/sumlink-analytics-api\.onrender\.com\/health/g,
];

function listFiles(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, ext, out);
    else if (entry.isFile() && full.endsWith(ext)) out.push(full);
  }
  return out;
}

function normalizeHeaders(headers) {
  const clean = Array.isArray(headers)
    ? headers.filter((h) => {
        const key = String(h?.key ?? "").toLowerCase();
        return key && key !== "x-api-key" && key !== "api-key";
      })
    : [];

  return [
    {
      key: "x-api-key",
      value: API_KEY,
    },
    ...clean,
  ];
}

function patchActionObject(obj, endpoint) {
  if (!obj || typeof obj !== "object") return false;
  let changed = false;

  if (!obj.actionConfiguration || typeof obj.actionConfiguration !== "object") {
    obj.actionConfiguration = {};
    changed = true;
  }

  obj.actionConfiguration.httpMethod = "GET";
  obj.actionConfiguration.path = endpoint;
  obj.actionConfiguration.headers = normalizeHeaders(obj.actionConfiguration.headers);

  if (typeof obj.actionConfiguration.url === "string") {
    obj.actionConfiguration.url = `${BASE_URL}${endpoint}`;
  }

  if (!obj.datasourceConfiguration || typeof obj.datasourceConfiguration !== "object") {
    obj.datasourceConfiguration = {};
    changed = true;
  }
  obj.datasourceConfiguration.url = BASE_URL;

  if (obj.datasource && typeof obj.datasource === "object") {
    obj.datasource.datasourceConfiguration = obj.datasource.datasourceConfiguration || {};
    obj.datasource.datasourceConfiguration.url = BASE_URL;
  }

  return true || changed;
}

function inferEndpoint(obj) {
  const name = obj?.name || obj?.actionName || obj?.unpublishedAction?.name || obj?.publishedAction?.name;
  if (QUERY_ENDPOINTS[name]) return QUERY_ENDPOINTS[name];

  const haystack = JSON.stringify({
    name,
    path: obj?.actionConfiguration?.path,
    url: obj?.datasourceConfiguration?.url,
  });

  for (const [queryName, endpoint] of Object.entries(QUERY_ENDPOINTS)) {
    if (haystack.includes(queryName) || haystack.includes(endpoint)) return endpoint;
  }

  return null;
}

function walkAndPatch(obj) {
  if (!obj || typeof obj !== "object") return 0;
  let count = 0;

  const endpoint = inferEndpoint(obj);
  if (endpoint) {
    if (patchActionObject(obj, endpoint)) count += 1;
    if (obj.unpublishedAction) count += patchActionObject(obj.unpublishedAction, endpoint) ? 1 : 0;
    if (obj.publishedAction) count += patchActionObject(obj.publishedAction, endpoint) ? 1 : 0;
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") count += walkAndPatch(value);
  }

  return count;
}

function patchText(text) {
  let next = text;
  for (const pattern of OLD_BASE_PATTERNS) {
    next = next.replace(pattern, BASE_URL);
  }
  return next;
}

const targets = [
  "sumlink-analytics-dashboard.appsmith.json",
  path.join("appsmith", "sumlink-analytics-dashboard.appsmith.json"),
  ...listFiles("appsmith", ".json"),
];

let filesChanged = 0;
let actionsPatched = 0;

for (const file of [...new Set(targets)].filter((f) => fs.existsSync(f))) {
  const original = fs.readFileSync(file, "utf8");
  let text = patchText(original);
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    if (text !== original) {
      fs.writeFileSync(file, text);
      filesChanged += 1;
    }
    continue;
  }

  actionsPatched += walkAndPatch(parsed);
  text = JSON.stringify(parsed, null, 2);

  if (text !== original) {
    fs.writeFileSync(file, `${text}\n`);
    filesChanged += 1;
  }
}

console.log(`Render API patch complete. filesChanged=${filesChanged} actionsPatched=${actionsPatched}`);
console.log(`Base URL: ${BASE_URL}`);
