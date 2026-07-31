import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const renderBase = "https://sumlink-analytics-api.onrender.com";

const roots = [
  path.join(root, "scripts"),
  path.join(root, "appsmith"),
  path.join(root, "sumlink-analytics-dashboard.appsmith.json"),
];

const replacements = new Map([
  ["https://sumlink-analytics-api.onrender.com", renderBase],
  ["https://sumlink-analytics-api.onrender.com", renderBase],
  [
    `${renderBase}/api/executive-health`,
    `${renderBase}/api/v1/executive/summary`,
  ],
  [
    `${renderBase}/api/acquisition-churn`,
    `${renderBase}/api/v1/acquisition/summary`,
  ],
  [
    `${renderBase}/api/onboarding-funnel`,
    `${renderBase}/api/v1/onboarding/summary`,
  ],
  [
    `${renderBase}/api/gameplay-balancing`,
    `${renderBase}/api/v1/gameplay/summary`,
  ],
  [
    `${renderBase}/api/retention`,
    `${renderBase}/api/v1/retention/summary`,
  ],
]);

const allowedExtensions = new Set([".js", ".cjs", ".mjs", ".json"]);
let changedFiles = 0;

function updateFile(filePath) {
  if (!allowedExtensions.has(path.extname(filePath).toLowerCase())) return;

  const original = fs.readFileSync(filePath, "utf8");
  let updated = original;

  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    changedFiles += 1;
  }
}

function walk(target) {
  if (!fs.existsSync(target)) return;

  const stats = fs.statSync(target);
  if (stats.isFile()) {
    updateFile(target);
    return;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".tmp")) continue;
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else updateFile(fullPath);
  }
}

for (const target of roots) walk(target);

const expected = [
  `${renderBase}/api/v1/executive/summary`,
  `${renderBase}/api/v1/acquisition/summary`,
  `${renderBase}/api/v1/onboarding/summary`,
  `${renderBase}/api/v1/gameplay/summary`,
  `${renderBase}/api/v1/retention/summary`,
];

const verificationTargets = roots.filter((target) => fs.existsSync(target));
const combined = [];

function collect(target) {
  const stats = fs.statSync(target);
  if (stats.isFile()) {
    if (allowedExtensions.has(path.extname(target).toLowerCase())) {
      combined.push(fs.readFileSync(target, "utf8"));
    }
    return;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".tmp")) continue;
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (allowedExtensions.has(path.extname(fullPath).toLowerCase())) {
      combined.push(fs.readFileSync(fullPath, "utf8"));
    }
  }
}

for (const target of verificationTargets) collect(target);
const source = combined.join("\n");

const missing = expected.filter((url) => !source.includes(url));
const stale = [
  "https://sumlink-analytics-api.onrender.com",
  "https://sumlink-analytics-api.onrender.com",
].filter((url) => source.includes(url));

if (missing.length || stale.length) {
  throw new Error(
    JSON.stringify({
      error: "Appsmith Render URL verification failed",
      missing,
      stale,
      changedFiles,
    }),
  );
}

process.stdout.write(
  JSON.stringify({
    status: "ok",
    changedFiles,
    verifiedQueries: expected.length,
  }),
);
