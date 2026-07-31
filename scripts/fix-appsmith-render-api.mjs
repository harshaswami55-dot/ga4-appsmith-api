import fs from "fs";
import path from "path";

const root = process.cwd();

const BASE_URL = "https://sumlink-analytics-api.onrender.com";
const API_KEY = "UB9c9YFakU4h8+eFZGalibxAJH+c4s2SBu0NJxux0HQ=";

const QUERY_ENDPOINTS = {
  ExecutiveSummary: "/api/executive-health",
  AcquisitionSummary: "/api/acquisition-churn",
  OnboardingSummary: "/api/onboarding-funnel",
  GameplaySummary: "/api/gameplay-balancing",
  RetentionSummary: "/api/retention",
};

const OLD_BASES = [
  "https://sumlink-analytics-api.onrender.com",
  "https://sumlink-analytics-api.onrender.com",
  "https://sumlink-analytics-api.onrender.com",
  "https://localhost:8000",
];

const report = [];

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function writeText(rel, text) {
  fs.writeFileSync(path.join(root, rel), text, "utf8");
}

function ensureHeaderArray(headers) {
  if (!Array.isArray(headers)) return [{ key: "x-api-key", value: API_KEY }];
  const filtered = headers.filter((h) => {
    const key = String(h?.key ?? h?.name ?? "").toLowerCase();
    return key !== "x-api-key";
  });
  filtered.push({ key: "x-api-key", value: API_KEY });
  return filtered;
}

function patchUrlString(value, queryName) {
  if (typeof value !== "string") return value;
  let next = value;
  for (const oldBase of OLD_BASES) next = next.split(oldBase).join(BASE_URL);

  if (queryName && QUERY_ENDPOINTS[queryName]) {
    const endpoint = QUERY_ENDPOINTS[queryName];
    if (next === "/health" || next.endsWith("/health")) return `${BASE_URL}${endpoint}`;
    for (const known of Object.values(QUERY_ENDPOINTS)) {
      if (next.endsWith(known)) return `${BASE_URL}${endpoint}`;
    }
    if (next.startsWith(BASE_URL) && !next.includes(endpoint) && !next.includes("{{")) {
      return `${BASE_URL}${endpoint}`;
    }
  }
  return next;
}

function looksLikeApiAction(obj) {
  return !!(
    obj &&
    typeof obj === "object" &&
    (
      obj.actionConfiguration ||
      obj.datasourceConfiguration ||
      obj.pluginType === "API" ||
      obj.pluginId ||
      obj.actionId ||
      obj.executeOnLoad !== undefined
    )
  );
}

function patchActionObject(obj, queryName) {
  const endpoint = QUERY_ENDPOINTS[queryName];
  if (!endpoint) return;

  if (!obj.actionConfiguration) obj.actionConfiguration = {};
  obj.actionConfiguration.httpMethod = "GET";

  if ("path" in obj.actionConfiguration || !("url" in obj.actionConfiguration)) {
    obj.actionConfiguration.path = endpoint;
  }
  obj.actionConfiguration.url = `${BASE_URL}${endpoint}`;
  obj.actionConfiguration.headers = ensureHeaderArray(obj.actionConfiguration.headers);

  if (obj.datasourceConfiguration) {
    obj.datasourceConfiguration.url = BASE_URL;
    if (Array.isArray(obj.datasourceConfiguration.headers)) {
      obj.datasourceConfiguration.headers = ensureHeaderArray(obj.datasourceConfiguration.headers);
    }
  }

  if (obj.datasource?.datasourceConfiguration) {
    obj.datasource.datasourceConfiguration.url = BASE_URL;
    if (Array.isArray(obj.datasource.datasourceConfiguration.headers)) {
      obj.datasource.datasourceConfiguration.headers = ensureHeaderArray(obj.datasource.datasourceConfiguration.headers);
    }
  }

  if (Array.isArray(obj.headers)) obj.headers = ensureHeaderArray(obj.headers);
}

function inferQueryName(obj, inheritedName) {
  if (!obj || typeof obj !== "object") return inheritedName;
  const candidates = [
    obj.name,
    obj.actionName,
    obj.title,
    obj.displayName,
    obj.id,
    obj?.unpublishedAction?.name,
    obj?.publishedAction?.name,
  ].filter(Boolean).map(String);
  for (const candidate of candidates) {
    for (const name of Object.keys(QUERY_ENDPOINTS)) {
      if (candidate === name || candidate.includes(name)) return name;
    }
  }
  return inheritedName;
}

function walkJson(node, inheritedQueryName) {
  const queryName = inferQueryName(node, inheritedQueryName);

  if (Array.isArray(node)) {
    for (const item of node) walkJson(item, queryName);
    return;
  }

  if (!node || typeof node !== "object") return;

  if (queryName && looksLikeApiAction(node)) patchActionObject(node, queryName);

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string") {
      node[key] = patchUrlString(value, queryName);
    } else {
      walkJson(value, queryName);
    }
  }
}

function patchJsonFile(rel) {
  if (!fileExists(rel)) return;
  const before = readText(rel);
  let data;
  try {
    data = JSON.parse(before);
  } catch {
    return;
  }
  walkJson(data, undefined);
  const after = JSON.stringify(data, null, 2);
  if (after !== before) {
    writeText(rel, `${after}\n`);
    report.push(`Patched JSON: ${rel}`);
  }
}

function patchTextFile(rel) {
  if (!fileExists(rel)) return;
  const before = readText(rel);
  let after = before;
  for (const oldBase of OLD_BASES) after = after.split(oldBase).join(BASE_URL);

  for (const [name, endpoint] of Object.entries(QUERY_ENDPOINTS)) {
    const full = `${BASE_URL}${endpoint}`;
    const re = new RegExp(`(${name}[\\s\\S]{0,500}?)(https?:\\/\\/[^"'\\\`\\s]+|\\/health|\\/api\\/[a-z0-9\\-\\/]+)`, "g");
    after = after.replace(re, (m, prefix) => `${prefix}${full}`);
  }

  after = after.replace(/x-api-key/gi, "x-api-key");

  if (after !== before) {
    writeText(rel, after);
    report.push(`Patched text: ${rel}`);
  }
}

for (const rel of [
  "appsmith/sumlink-analytics-dashboard.appsmith.json",
  "sumlink-analytics-dashboard.appsmith.json",
  "appsmith/query-manifest.json",
]) {
  patchJsonFile(rel);
}

for (const rel of [
  "scripts/generate-appsmith-import.mjs",
  "appsmith/JSObjects/ApiRunner.js",
  "appsmith/JSObjects/GlobalFilters.js",
]) {
  patchTextFile(rel);
}

const lines = [
  "# Appsmith Render API Fix Report",
  "",
  `Render base URL: ${BASE_URL}`,
  "",
  "Configured query endpoints:",
  ...Object.entries(QUERY_ENDPOINTS).map(([name, endpoint]) => `- ${name}: ${BASE_URL}${endpoint}`),
  "",
  "Configured header:",
  "- x-api-key: configured from Render API_KEYS value",
  "",
  "Files changed:",
  ...(report.length ? report.map((line) => `- ${line}`) : ["- No local file changes were required"]),
  "",
];

writeText("APP_SMITH_RENDER_FIX_REPORT.md", `${lines.join("\n")}\n`);
