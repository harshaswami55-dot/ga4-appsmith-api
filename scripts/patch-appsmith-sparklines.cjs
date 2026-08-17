const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "appsmith", "Sumlink Dashboard.json");

const pageConfigs = {
  "Executive Health": {
    query: "ExecutiveSummary",
    store: "ExecutiveSummary_lastData_v2",
    widgets: {
      ActiveUsersSparkline: { collection: "daily_trend", field: "activeUsers", color: "#16A34A" },
      NewUsersSparkline: { collection: "daily_trend", field: "newUsers", color: "#16A34A" },
      DAUSparkline: { collection: "daily_trend", field: "activeUsers", color: "#4F46E5" },
      MAUSparkline: { collection: "daily_trend", field: "activeUsers", color: "#4F46E5" },
      DAUMAUStickinessSparkline: { collection: "daily_trend", field: "stickiness_pct", color: "#8B5CF6" },
      EngagementRateSparkline: { collection: "daily_trend", field: "engagement_rate_pct", color: "#8B5CF6" },
      SessionsSparkline: { collection: "daily_trend", field: "sessions", color: "#0EA5E9" },
      ScreenViewsSparkline: { collection: "daily_trend", field: "screenPageViews", color: "#0EA5E9" },
    },
  },
  Acquisition: {
    query: "AcquisitionSummary",
    store: "AcquisitionSummary_lastData_v2",
    widgets: {
      InstallsSparkline: { collection: "daily_growth_churn", field: "installs", color: "#16A34A" },
      InstallingUsersSparkline: { collection: "daily_growth_churn", field: "installing_users", color: "#16A34A" },
      NewUsersSparkline: { collection: "daily_source_users", field: "newUsers", color: "#16A34A", aggregate: "sum" },
      ActiveUsersSparkline: { collection: "daily_source_users", field: "activeUsers", color: "#16A34A", aggregate: "sum" },
      SessionsSparkline: { blank: true, color: "#0EA5E9" },
      UninstallsSparkline: { collection: "daily_growth_churn", field: "uninstalls", color: "#EF4444" },
    },
  },
  Onboarding: {
    query: "OnboardingSummary",
    store: "OnboardingSummary_lastData_v2",
    widgets: {
      TutorialStartedSparkline: { collection: "daily_frustration_trend", field: "tutorial_started", color: "#2563EB" },
      TutorialCompletedSparkline: { blank: true, color: "#2563EB" },
      FrustratedUsersSparkline: { collection: "daily_frustration_trend", field: "frustrated_users", color: "#EF4444" },
      FrustrationRateSparkline: { collection: "daily_frustration_trend", field: "frustration_rate_pct", color: "#EF4444" },
      TutorialCompletionPctSparkline: { collection: "daily_step_completion", field: "completion_pct", color: "#2563EB", aggregate: "avg" },
      TutorialFailurePctSparkline: { collection: "daily_step_completion", field: "failure_pct", color: "#EF4444", aggregate: "avg" },
      TutorialSkipPctSparkline: { collection: "daily_step_completion", field: "skip_pct", color: "#2563EB", aggregate: "avg" },
      AvgTutorialTimeSecSparkline: { blank: true, color: "#2563EB" },
      LaunchToStep1PctSparkline: { blank: true, color: "#2563EB" },
      "Step1Drop-offUsersSparkline": { collection: "daily_step_completion", field: "failed_users", color: "#EF4444", aggregate: "sum" },
      WorstTutorialStepSparkline: { blank: true, color: "#2563EB" },
    },
  },
  Gameplay: {
    query: "GameplaySummary",
    store: "GameplaySummary_lastData_v2",
    widgets: {
      LevelStartedSparkline: { collection: "difficulty_curve", field: "started", color: "#2563EB" },
      LevelCompletedSparkline: { collection: "difficulty_curve", field: "completed", color: "#2563EB" },
      HintUsageSparkline: { collection: "difficulty_curve", field: "hints", color: "#4F46E5" },
      "LevelDrop-offPctSparkline": { collection: "difficulty_curve", field: "drop_off_pct", color: "#EF4444" },
    },
  },
};

function walk(widget, visit) {
  if (!widget || typeof widget !== "object") return;
  visit(widget);
  for (const child of widget.children || []) walk(child, visit);
}

function rgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function dataRoot(query, store) {
  return `((typeof ${query} !== "undefined" ? ${query}.data?.data : null) || appsmith.store["${store}"] || {})`;
}

function seriesExpression(pageConfig, spec) {
  if (spec.blank) return "{{[]}}";

  const root = dataRoot(pageConfig.query, pageConfig.store);
  if (spec.aggregate) {
    return `{{(() => {
  const rows = (${root}.${spec.collection} || []);
  const byKey = {};
  rows.forEach((r) => {
    const key = String(r.date || r.level || r.level_number || r.step || "");
    const value = Number(r.${spec.field} || 0);
    if (!key || !Number.isFinite(value)) return;
    if (!byKey[key]) byKey[key] = { total: 0, count: 0 };
    byKey[key].total += value;
    byKey[key].count += 1;
  });
  return Object.keys(byKey).sort().slice(-14).map((key) => ({
    x: key,
    y: ${spec.aggregate === "avg" ? "Number((byKey[key].total / Math.max(byKey[key].count, 1)).toFixed(2))" : "byKey[key].total"}
  }));
})()}}`;
  }

  return `{{(${root}.${spec.collection} || []).slice(-14).map((r) => ({
  x: String(r.date || r.level || r.level_number || r.step || ""),
  y: Number(r.${spec.field} || 0)
})).filter((p) => p.x && Number.isFinite(p.y))}}`;
}

function echartsConfig(color) {
  return `{{{
  backgroundColor: "transparent",
  grid: { left: 0, right: 0, top: 4, bottom: 0, containLabel: false },
  tooltip: { show: false },
  xAxis: { show: false, type: "category", boundaryGap: false },
  yAxis: { show: false, type: "value", scale: true },
  series: [{
    type: "line",
    smooth: true,
    symbol: "none",
    showSymbol: false,
    lineStyle: { width: 2.5, color: "${color}" },
    itemStyle: { color: "${color}" },
    areaStyle: { color: "${rgba(color, 0.12)}" },
    label: { show: false },
    emphasis: { disabled: true }
  }]
}}}`;
}

function patchSparkline(widget, pageConfig, spec) {
  const data = seriesExpression(pageConfig, spec);
  const color = spec.color || "#2563EB";
  const seriesKey = `${widget.widgetName}Series`;

  for (const key of [
    "text",
    "textAlign",
    "textColor",
    "fontSize",
    "fontStyle",
    "shouldScrollContents",
    "shouldTruncate",
    "disableLink",
    "lineHeight",
  ]) {
    delete widget[key];
  }

  Object.assign(widget, {
    type: "CHART_WIDGET",
    displayName: "Chart",
    iconSVG: "/static/media/icon.6adbe31d.svg",
    chartType: "LINE_CHART",
    chartName: "",
    xAxisName: "",
    yAxisName: "",
    chartData: {
      [seriesKey]: {
        seriesName: "Trend",
        data,
      },
    },
    sourceData: data,
    customEChartConfig: echartsConfig(color),
    showDataPointLabel: false,
    allowScroll: false,
    setAdaptiveYMin: true,
    animateLoading: false,
    boxShadow: "none",
    borderRadius: "0px",
    backgroundColor: "transparent",
    dynamicPropertyPathList: [
      { key: `chartData.${seriesKey}.data` },
      { key: "sourceData" },
      { key: "customEChartConfig" },
    ],
    dynamicBindingPathList: [
      { key: `chartData.${seriesKey}.data` },
      { key: "sourceData" },
      { key: "customEChartConfig" },
    ],
  });

  widget.topRow = Math.max(Number(widget.topRow || 10), 11);
  widget.bottomRow = Math.max(Number(widget.bottomRow || 15), widget.topRow + 4);
  widget.leftColumn = Math.max(Number(widget.leftColumn || 3), 3);
  widget.rightColumn = Math.min(Number(widget.rightColumn || 62), 62);
}

function patchKpiText(widget) {
  if (!widget.widgetName || !widget.widgetName.endsWith("Value")) return;
  if (!/WorstTutorialStep/.test(widget.widgetName)) return;
  widget.fontSize = "1.15rem";
  widget.lineHeight = "1.35";
  widget.textAlign = "LEFT";
  widget.leftColumn = Math.min(Number(widget.leftColumn || 3), 3);
  widget.rightColumn = Math.max(Number(widget.rightColumn || 62), 62);
  widget.bottomRow = Math.max(Number(widget.bottomRow || 10), 11);
}

function patchFilters(widget) {
  const name = widget.widgetName || "";
  const topRow = {
    DateRangeFilter: [2, 12],
    AppVersionFilter: [13, 23],
    OSVersionFilter: [24, 34],
    DeviceModelFilter: [35, 45],
    CountryFilter: [46, 53],
    LevelNumberFilter: [54, 62],
  };
  const secondRow = {
    CustomStartDateFilter: [2, 12],
    CustomEndDateFilter: [13, 23],
    RefreshButton: [24, 35],
    ChannelFilter: [36, 49],
  };

  for (const [suffix, [left, right]] of Object.entries(topRow)) {
    if (name.endsWith(suffix)) {
      widget.leftColumn = left;
      widget.rightColumn = right;
      widget.topRow = 15;
      widget.bottomRow = 22;
      return;
    }
  }

  for (const [suffix, [left, right]] of Object.entries(secondRow)) {
    if (name.endsWith(suffix)) {
      widget.leftColumn = left;
      widget.rightColumn = right;
      widget.topRow = suffix === "RefreshButton" || suffix === "ChannelFilter" ? 24 : 23;
      widget.bottomRow = suffix === "ChannelFilter" ? 30 : 30;
      return;
    }
  }
}

function patchLayout(pageName, layout) {
  if (!layout?.dsl) return { sparklines: 0, text: 0 };
  const pageConfig = pageConfigs[pageName];

  const result = { sparklines: 0, text: 0 };
  walk(layout.dsl, (widget) => {
    patchFilters(widget);
    patchKpiText(widget);
    if (!pageConfig) return;
    if (!widget.widgetName) return;
    const spec = pageConfig.widgets[widget.widgetName];
    if (!spec) return;
    patchSparkline(widget, pageConfig, spec);
    result.sparklines += 1;
  });
  return result;
}

const app = JSON.parse(fs.readFileSync(appPath, "utf8"));
const totals = {};

for (const page of app.pageList || []) {
  const pageName = page.unpublishedPage?.name || page.publishedPage?.name || page.name;
  totals[pageName] = { sparklines: 0, text: 0 };
  for (const pageState of [page.unpublishedPage, page.publishedPage]) {
    for (const layout of pageState?.layouts || []) {
      const patched = patchLayout(pageName, layout);
      totals[pageName].sparklines += patched.sparklines;
      totals[pageName].text += patched.text;
    }
  }
}

fs.writeFileSync(appPath, JSON.stringify(app));
console.log(JSON.stringify(totals, null, 2));
