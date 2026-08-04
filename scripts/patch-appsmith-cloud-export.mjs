import fs from "node:fs";
import path from "node:path";

const source = path.resolve(process.argv[2] || "C:/Users/harsh/OneDrive/Desktop/Sumlink Dashboard.json");
const target = path.resolve(
  process.argv[3] || "appsmith/Sumlink Dashboard - Validated.appsmith.json",
);

const staleRollingNote =
  "Formula: Rolling Day N+ = users from the same Day 0 cohort active on Day N or any later day / Day 0 users. This GA4 Data API version is a lower-bound estimate from exact Day N cohort counts. Exact unique-user rolling retention needs GA4 BigQuery user-level export.";
const exactRollingNote =
  "Formula: Rolling Day N+ = distinct users from the same Day 0 cohort active on Day N or any later day / Day 0 cohort users. Source: GA4 BigQuery exact user-level export. Only matured cohorts are included; All Users is a weighted aggregate.";

function cleanText(value) {
  let output = value;

  if (output.includes("const bars =")) {
    output = output.replace(/const bars = "[^"]+";/g, 'const bars = "._-:=+*#";');
  }

  return output
    .replaceAll(staleRollingNote, exactRollingNote)
    .replaceAll("Launchâ†’Step", "LaunchToStep")
    .replaceAll("â†’", " to ")
    .replaceAll("â€”", " - ")
    .replaceAll("“—”", '"--"')
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'");
}

function patchChart(widget) {
  if (widget?.type !== "CHART_WIDGET") return;
  if (widget.chartType === "CUSTOM_ECHART") return;

  widget.showDataPointLabel = true;
  if (typeof widget.customEChartConfig !== "string") return;

  widget.customEChartConfig = widget.customEChartConfig
    .replace(/(label:\s*\{\s*show:\s*)false/, "$1true")
    .replace(
      "fontSize: 9,",
      'fontSize: 10,\n        color: "#334155",\n        backgroundColor: "rgba(255,255,255,0.88)",\n        borderRadius: 3,\n        padding: [2, 4],',
    );
}

function visit(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  patchChart(value);
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") {
      value[key] = cleanText(child);
    } else {
      visit(child, seen);
    }
  }
}

const artifact = JSON.parse(fs.readFileSync(source, "utf8"));
visit(artifact);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

console.log(`Patched Appsmith cloud export: ${target}`);
