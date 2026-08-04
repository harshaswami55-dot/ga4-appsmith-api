import fs from "node:fs";
import path from "node:path";

const outFile = path.resolve("appsmith/sumlink-analytics-dashboard.appsmith.json");

const appName = "Sumlink Analytics Dashboard";
const baseUrl = "https://sumlink-analytics-api.onrender.com";
const restApiPluginId = "restapi-plugin";
const endpointByQueryName = {
  ExecutiveSummary: "/api/v1/executive/summary",
  AcquisitionSummary: "/api/v1/acquisition/summary",
  OnboardingSummary: "/api/v1/onboarding/summary",
  GameplaySummary: "/api/v1/gameplay/summary",
  RetentionSummary: "/api/v1/retention/summary",
};
const shortSourceLabelJs = `(source, medium) => {
  const clean = (value) => {
    const raw = String(value || "").trim();
    if (!raw || raw === "(not set)" || raw === "(none)" || raw === "Unknown") return "Unknown";
    if (raw === "(direct)") return "Direct";
    return raw.replace(/^apps\\./, "").replace(/\\.com$/, "").replace(/[-_]/g, " ").replace(/\\b\\w/g, c => c.toUpperCase());
  };
  const sourceLabel = clean(source);
  const mediumLabel = clean(medium);
  if (!mediumLabel || mediumLabel === "Unknown") return sourceLabel;
  return sourceLabel + " / " + mediumLabel;
}`;

let idCounter = 1000;
function id(prefix) {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(4, "0");
  return `64a5df3c2bc8e5f3b81f${hex}`;
}

function textWidget(name, text, left, top, right, bottom, opts = {}) {
  return {
    widgetName: name,
    widgetId: id("w"),
    type: "TEXT_WIDGET",
    version: 1,
    parentId: opts.parentId ?? "0",
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    text,
    fontSize: opts.fontSize ?? "1rem",
    fontStyle: opts.fontStyle ?? "BOLD",
    textAlign: opts.textAlign ?? "LEFT",
    textColor: opts.textColor ?? "#111827",
    backgroundColor: opts.backgroundColor,
    borderRadius: opts.borderRadius ?? "8px",
    boxShadow: opts.boxShadow,
    borderWidth: opts.borderWidth,
    borderColor: opts.borderColor,
    dynamicBindingPathList: text.includes("{{") ? [{ key: "text" }] : [],
    dynamicTriggerPathList: [],
    disableLink: true,
    shouldTruncate: false,
    animateLoading: false,
  };
}

function canvasTextWidget(name, text, parentId, left, top, right, bottom, opts = {}) {
  return textWidget(name, text, left, top, right, bottom, {
    ...opts,
    parentId,
    boxShadow: opts.boxShadow ?? "none",
  });
}

function kpiIcon(label) {
  const lower = label.toLowerCase();
  if (lower.includes("active") || lower.includes("user")) return "U";
  if (lower.includes("new") || lower.includes("install")) return "N";
  if (lower.includes("session")) return "S";
  if (lower.includes("screen")) return "V";
  if (lower.includes("retention") || lower.includes("return")) return "R";
  if (lower.includes("tutorial") || lower.includes("step")) return "T";
  if (lower.includes("level")) return "L";
  if (lower.includes("time") || lower.includes("duration")) return "T";
  if (lower.includes("rate") || lower.includes("%") || lower.includes("stickiness")) return "%";
  return "K";
}

function kpiSparklineData(pageQuery, key) {
  const data = safeQueryData(pageQuery);
  const custom = {
    AcquisitionSummary: {
      new_users: `{{(() => { const rows = ${data}?.daily_source_users || []; const byDate = {}; rows.forEach(r => { const date = String(r.date || ""); byDate[date] = (byDate[date] || 0) + Number(r.newUsers || 0); }); return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([x, y]) => ({ x, y })); })()}}`,
      active_users: `{{(() => { const rows = ${data}?.daily_source_users || []; const byDate = {}; rows.forEach(r => { const date = String(r.date || ""); byDate[date] = (byDate[date] || 0) + Number(r.activeUsers || 0); }); return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([x, y]) => ({ x, y })); })()}}`,
      sessions: `{{(${data}?.campaign_performance || []).slice(0, 14).reverse().map(r => ({ x: String(r.firstUserCampaignName || r.firstUserSource || "Campaign"), y: Number(r.sessions || 0) })).filter(p => Number.isFinite(p.y))}}`,
    },
    OnboardingSummary: {
      tutorial_completed: `{{(() => { const rows = ${data}?.daily_step_completion || []; const byDate = {}; rows.forEach(r => { const date = String(r.date || ""); byDate[date] = (byDate[date] || 0) + Number(r.match_made_users || 0); }); return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([x, y]) => ({ x, y })); })()}}`,
      completion_pct: `{{(() => { const rows = ${data}?.daily_step_completion || []; const byDate = {}; rows.forEach(r => { const date = String(r.date || ""); const item = byDate[date] || { total: 0, count: 0 }; item.total += Number(r.completion_pct || 0); item.count += 1; byDate[date] = item; }); return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([x, v]) => ({ x, y: v.count ? Number((v.total / v.count).toFixed(2)) : 0 })); })()}}`,
      failure_pct: `{{(() => { const rows = ${data}?.daily_step_completion || []; const byDate = {}; rows.forEach(r => { const date = String(r.date || ""); const item = byDate[date] || { total: 0, count: 0 }; item.total += Number(r.failure_pct || 0); item.count += 1; byDate[date] = item; }); return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([x, v]) => ({ x, y: v.count ? Number((v.total / v.count).toFixed(2)) : 0 })); })()}}`,
      skip_pct: `{{(() => { const rows = ${data}?.daily_step_completion || []; const byDate = {}; rows.forEach(r => { const date = String(r.date || ""); const item = byDate[date] || { total: 0, count: 0 }; item.total += Number(r.skip_pct || 0); item.count += 1; byDate[date] = item; }); return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([x, v]) => ({ x, y: v.count ? Number((v.total / v.count).toFixed(2)) : 0 })); })()}}`,
      average_tutorial_time: `{{(${data}?.average_time_by_step || []).slice(0, 14).map(r => ({ x: String(r.step || "Step"), y: Number(r.average_time_sec || 0) })).filter(p => Number.isFinite(p.y))}}`,
      launch_to_first_step_pct: `{{(${data}?.detailed_funnel || []).slice(0, 14).map(r => ({ x: String(r.stage || r.event || "Stage"), y: Number(r.conversion_from_previous_pct || 0) })).filter(p => Number.isFinite(p.y))}}`,
      first_step_drop_off_users: `{{(${data}?.step_analysis || []).slice(0, 14).map(r => ({ x: String(r.step || "Step"), y: Number(r.drop_off_users || 0) })).filter(p => Number.isFinite(p.y))}}`,
      worst_tutorial_step: `{{(${data}?.step_analysis || []).slice(0, 14).map(r => ({ x: String(r.step || "Step"), y: Number(r.drop_off_pct || 0) })).filter(p => Number.isFinite(p.y))}}`,
    },
  };
  if (custom[pageQuery]?.[key]) return custom[pageQuery][key];
  const byPage = {
    ExecutiveSummary: {
      active_users: ["daily_trend", "activeUsers"],
      new_users: ["daily_trend", "newUsers"],
      dau: ["daily_trend", "activeUsers"],
      mau: ["daily_trend", "activeUsers"],
      sessions: ["daily_trend", "sessions"],
      screen_views: ["daily_trend", "screenPageViews"],
      stickiness_pct: ["daily_trend", "stickiness_pct"],
      engagement_rate_pct: ["daily_trend", "engagement_rate_pct"],
    },
    AcquisitionSummary: {
      installs: ["daily_growth_churn", "installs"],
      installing_users: ["daily_growth_churn", "installing_users"],
      uninstalls: ["daily_growth_churn", "uninstalls"],
    },
    OnboardingSummary: {
      tutorial_started: ["daily_frustration_trend", "tutorial_started"],
      frustrated_users: ["daily_frustration_trend", "frustrated_users"],
      user_frustration_rate_pct: ["daily_frustration_trend", "frustration_rate_pct"],
      completion_pct: ["daily_step_completion", "completion_pct"],
      failure_pct: ["daily_step_completion", "failure_pct"],
      skip_pct: ["daily_step_completion", "skip_pct"],
      first_step_drop_off_users: ["daily_step_completion", "failed_users"],
    },
    GameplaySummary: {
      level_started: ["difficulty_curve", "started"],
      level_completed: ["difficulty_curve", "completed"],
      hint_usage: ["difficulty_curve", "hints"],
      drop_off_pct: ["difficulty_curve", "drop_off_pct"],
    },
    RetentionSummary: {
      dau: ["daily_activity", "dau"],
      wau: ["daily_activity", "wau"],
      mau: ["daily_activity", "mau"],
      stickiness_pct: ["daily_activity", "stickiness_pct"],
      active_users_selected_range: ["daily_activity", "activeUsers"],
      sessions: ["daily_activity", "sessions"],
      engaged_sessions: ["daily_activity", "engagedSessions"],
      average_session_length_seconds: ["daily_activity", "userEngagementDuration"],
      returning_users: ["daily_activity", "activeUsers"],
      day_1_retention_pct: ["retention_curve", "retention_pct"],
      day_1_retention_users: ["retention_curve", "active_users"],
      day_3_retention_pct: ["retention_curve", "retention_pct"],
      day_3_retention_users: ["retention_curve", "active_users"],
      day_7_retention_pct: ["retention_curve", "retention_pct"],
      day_7_retention_users: ["retention_curve", "active_users"],
      day_14_retention_pct: ["retention_curve", "retention_pct"],
      day_30_retention_pct: ["retention_curve", "retention_pct"],
    },
  };
  const mapping = byPage[pageQuery]?.[key];
  if (!mapping) return "{{[]}}";
  const [arrayKey, valueKey] = mapping;
  const xKey = arrayKey === "difficulty_curve" ? "level" : arrayKey === "retention_curve" ? "day" : "date";
  return `{{(${data}?.${arrayKey} || []).slice(-14).map(r => ({ x: String(r.${xKey} ?? ""), y: Number(r.${valueKey} || 0) })).filter(p => Number.isFinite(p.y))}}`;
}


function sparklineWidget(name, parentId, data, color, left, top, right, bottom) {
  const seriesId = `${name}Series1`;
  const dataExpr = data.startsWith("{{") && data.endsWith("}}") ? data.slice(2, -2) : data;
  const config = `{{(() => {
    const raw = ((${dataExpr}) || []);
    const points = raw
      .map((item, index) => ({
        x: String(item?.x ?? index + 1),
        y: Number(item?.y ?? 0)
      }))
      .filter(item => Number.isFinite(item.y));
    const values = points.map(item => item.y);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const pad = Math.max((max - min) * 0.12, 1);
    return {
      animation: true,
      animationDuration: 500,
      grid: { left: 0, right: 0, top: 4, bottom: 0, containLabel: false },
      legend: { show: false },
      tooltip: {
        show: true,
        trigger: "axis",
        axisPointer: { type: "none" },
        backgroundColor: "#0F172A",
        borderWidth: 0,
        textStyle: { color: "#FFFFFF", fontSize: 11 },
        formatter: params => {
          const point = params?.[0];
          const value = Number(point?.value?.[1] ?? point?.value ?? 0);
          return String(point?.axisValueLabel || "") + "<br/><b>" + (Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-") + "</b>";
        }
      },
      xAxis: {
        type: "category",
        show: false,
        boundaryGap: false,
        data: points.map(item => item.x),
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      yAxis: {
        type: "value",
        show: false,
        min: min - pad,
        max: max + pad,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      series: [{
        type: "line",
        data: points.map(item => [item.x, item.y]),
        smooth: true,
        showSymbol: false,
        symbol: "none",
        symbolSize: 0,
        hoverAnimation: false,
        lineStyle: { width: 2.6, color: "${color}", cap: "round", join: "round" },
        itemStyle: { color: "${color}" },
        areaStyle: { color: "${color}", opacity: 0.10 },
        emphasis: { disabled: true },
        label: { show: false }
      }]
    };
  })()}}`;
  return {
    widgetName: name,
    widgetId: id("sparkline"),
    type: "CHART_WIDGET",
    displayName: "Chart",
    version: 1,
    key: id("sparkline_key"),
    parentId,
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    animateLoading: false,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 1,
    parentColumnSpace: 1,
    dynamicHeight: "FIXED",
    responsiveBehavior: "fill",
    minWidth: 120,
    chartType: "CUSTOM_ECHART",
    chartName: "",
    chartData: {
      [seriesId]: { seriesName: "Trend", data, color },
    },
    sourceData: data,
    customEChartConfig: config,
    customFusionChartConfig: {},
    xAxisName: "",
    yAxisName: "",
    labelOrientation: "auto",
    allowScroll: false,
    showDataPointLabel: false,
    setAdaptiveYMin: true,
    borderRadius: "0px",
    boxShadow: "none",
    dynamicBindingPathList: [
      { key: `chartData.${seriesId}.data` },
      { key: "sourceData" },
      { key: "customEChartConfig" },
    ],
    dynamicPropertyPathList: [
      { key: `chartData.${seriesId}.data` },
      { key: "sourceData" },
      { key: "customEChartConfig" },
    ],
    dynamicTriggerPathList: [],
  };
}

function sparklineTrendText(data) {
  const dataExpr = data.startsWith("{{") && data.endsWith("}}") ? data.slice(2, -2) : data;
  return `{{(() => {
    const values = ((${dataExpr}) || []).map(r => Number(r.y || 0)).filter(Number.isFinite);
    if (values.length < 2) return "Trend unavailable";
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return last === 0 ? "No change" : "Latest " + last.toLocaleString(undefined, { maximumFractionDigits: 1 });
    const delta = ((last - first) / Math.abs(first)) * 100;
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return "Stable vs start";
    return (delta > 0 ? "+" : "") + delta.toFixed(1) + "% vs start";
  })()}}`;
}

function kpiCardTitle(label) {
  return label
    .replace("DAU / MAU Stickiness", "Stickiness")
    .replace("Avg Session Length Sec", "Avg Session")
    .replace("Active Users in Range", "Active Users")
    .replace("Tutorial Completion %", "Completion %")
    .replace("Tutorial Failure %", "Failure %")
    .replace("Tutorial Skip %", "Skip %")
    .replace("Step 1 Drop-off Users", "Step 1 Drop-off")
    .replace("Observed App Remove %", "App Remove %");
}

function containerKpiCard(pageQuery, key, label, left, top, suffix = "") {
  const safeName = label.replaceAll(" ", "").replaceAll("/", "").replaceAll("%", "Pct");
  const visual = kpiVisualClean(label);
  const displayLabel = kpiCardTitle(label);
  const displayIcon = kpiIcon(displayLabel);
  const containerId = id("kpiContainer");
  const canvasId = id("kpiCanvas");
  const sparkData = kpiSparklineData(pageQuery, key);
  const valueText = `{{(() => { const v = ${safeQueryData(pageQuery)}?.kpis?.${key}; if (v === null || v === undefined || v === "") return "N/A"; const n = Number(v); if (!Number.isFinite(n)) return String(v).replaceAll("_", " "); const cleanLabel = "${label}".toLowerCase(); const needsDecimal = "${suffix}" === "%" || cleanLabel.includes("%") || cleanLabel.includes("rate") || cleanLabel.includes("ratio") || cleanLabel.includes("stickiness") || cleanLabel.includes("length") || cleanLabel.includes("time") || cleanLabel.includes("/user"); return (needsDecimal ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString()) + "${suffix}"; })()}}`;
  const valueFontSize = key === "worst_tutorial_step" ? "1.28rem" : "2rem";
  const isNegativeMetric = label.toLowerCase().includes("drop") || label.toLowerCase().includes("fail") || label.toLowerCase().includes("churn") || label.toLowerCase().includes("uninstall");
  const pillColor = isNegativeMetric ? "#EF4444" : "#10B981";
  const card = {
    widgetName: `${safeName}KpiCard`,
    widgetId: containerId,
    type: "CONTAINER_WIDGET",
    version: 1,
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    leftColumn: left,
    rightColumn: left + 14,
    topRow: top,
    bottomRow: top + 16,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: "1",
    borderRadius: "16px",
    boxShadow: "0px 10px 25px rgba(15, 23, 42, 0.06)",
    shouldScrollContents: false,
    dynamicBindingPathList: [],
    dynamicTriggerPathList: [],
    children: [
      {
        widgetName: `${safeName}KpiCanvas`,
        widgetId: canvasId,
        type: "CANVAS_WIDGET",
        version: 1,
        parentId: containerId,
        renderMode: "CANVAS",
        isVisible: true,
        isLoading: false,
        leftColumn: 0,
        rightColumn: 64,
        topRow: 0,
        bottomRow: 16,
        parentRowSpace: 1,
        parentColumnSpace: 1,
        canExtend: false,
        detachFromLayout: true,
        children: [
          canvasTextWidget(`${safeName}AccentBar`, "", canvasId, 0, 0, 1, 16, {
            backgroundColor: visual.color,
            borderColor: visual.color,
            borderWidth: "1",
            borderRadius: "16px 0px 0px 16px",
          }),
          canvasTextWidget(`${safeName}Icon`, displayIcon, canvasId, 3, 1, 11, 5, {
            fontSize: "1.15rem",
            fontStyle: "BOLD",
            textAlign: "CENTER",
            textColor: visual.color,
            backgroundColor: visual.tint,
            borderColor: visual.tint,
            borderWidth: "1",
            borderRadius: "12px",
          }),
          canvasTextWidget(`${safeName}Title`, displayLabel, canvasId, 13, 1, 52, 5, {
            fontSize: "0.95rem",
            fontStyle: "BOLD",
            textColor: visual.color,
          }),
          canvasTextWidget(`${safeName}Badge`, "i", canvasId, 54, 1, 61, 5, {
            fontSize: "0.88rem",
            fontStyle: "BOLD",
            textAlign: "RIGHT",
            textColor: "#94A3B8",
            backgroundColor: "transparent",
            borderColor: "transparent",
            borderWidth: "0",
          }),
          canvasTextWidget(`${safeName}Value`, valueText, canvasId, 6, 5, 61, 10, {
            fontSize: valueFontSize,
            fontStyle: "BOLD",
            textColor: "#111827",
          }),
          canvasTextWidget(`${safeName}Footnote`, sparklineTrendText(sparkData), canvasId, 6, 14, 61, 16, {
            fontSize: "0.72rem",
            fontStyle: "BOLD",
            textColor: pillColor,
            textAlign: "RIGHT",
          }),
          sparklineWidget(`${safeName}Sparkline`, canvasId, sparkData, visual.color, 8, 10, 61, 14),
        ],
      },
    ],
  };
  return [card];
}

function tableColumn(idValue, alias, columnType = "text", index = 0, width = 140) {
  return {
    index,
    width,
    id: idValue,
    originalId: idValue,
    alias,
    columnType,
    computedValue: `{{currentRow["${idValue}"]}}`,
    isVisible: true,
    isCellVisible: true,
    isDerived: false,
    label: alias,
  };
}

function tableWidget(name, tableData, left, top, right, bottom, opts = {}) {
  const primaryColumns = opts.columns
    ? Object.fromEntries(opts.columns.map((column, index) => [
        column.id,
        tableColumn(column.id, column.label, column.type || "text", index, column.width || 140),
      ]))
    : {};
  const columnOrder = opts.columns ? opts.columns.map((column) => column.id) : [];
  const columnBindingPaths = opts.columns
    ? opts.columns.map((column) => ({ key: `primaryColumns.${column.id}.computedValue` }))
    : [];
  return {
    widgetName: name,
    widgetId: id("w"),
    type: "TABLE_WIDGET_V2",
    version: 1,
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    tableData,
    dynamicBindingPathList: [{ key: "tableData" }, ...columnBindingPaths],
    dynamicPropertyPathList: [{ key: "tableData" }, ...columnBindingPaths],
    dynamicTriggerPathList: [],
    primaryColumns,
    searchKey: "",
    defaultPageSize: 10,
    columnOrder,
    enableClientSideSearch: true,
    delimiter: ",",
  };
}

function retentionCohortTableWidgets(name, label, queryName, left, top) {
  const dataRoot = `(() => { const live = (typeof ${queryName} !== "undefined" ? ${queryName}.data?.data : null); const stored = appsmith.store["${queryName}_lastData_v2"]; if (live?.cohort_grid?.[0] && Object.prototype.hasOwnProperty.call(live.cohort_grid[0], "day_2")) return live; return stored || live || {}; })()`;
  const cell = (rowIndex, field, formatter = "percent") => {
    const rowExpr = `(((${dataRoot}).cohort_grid || [])[${rowIndex}] || {})`;
    if (formatter === "text") {
      return `{{(() => { const r = ${rowExpr}; return r.${field} || ""; })()}}`;
    }
    if (formatter === "number") {
      return `{{(() => { const r = ${rowExpr}; const n = Number(r.${field} || 0); return n ? n.toLocaleString() : ""; })()}}`;
    }
    return `{{(() => { const r = ${rowExpr}; const v = r.${field}; if (v === null || v === undefined || v === "") return "—"; const n = Number(v || 0); return Number.isFinite(n) ? n.toFixed(1) + "%" : "—"; })()}}`;
  };
  const headers = [
    ["Cohort", 8],
    ["Users", 5],
    ["Day 0", 4],
    ["Day 1", 4],
    ["Day 2", 4],
    ["Day 3", 4],
    ["Day 4", 4],
    ["Day 5", 4],
    ["Day 6", 4],
    ["Day 7", 4],
    ["Day 8", 4],
    ["Day 9", 4],
    ["Day 10", 4],
  ];
  const rowCount = 11;
  const tableWidth = headers.reduce((sum, [, width]) => sum + width, 0);
  const titleTop = top + 1;
  const tableTop = top + 11;
  const formulaTop = tableTop + 4 + rowCount * 4;
  const widgets = [
    textWidget(`${name}SmallTitle`, label, left, top - 4, left + tableWidth, top, {
      fontSize: "1rem",
      fontStyle: "BOLD",
      textColor: "#111827",
      backgroundColor: "transparent",
      boxShadow: "none",
    }),
    textWidget(`${name}MainTitle`, "Cohort Analysis", left, titleTop, left + tableWidth, titleTop + 5, {
      fontSize: "2rem",
      fontStyle: "BOLD",
      textColor: "#111827",
      textAlign: "CENTER",
      backgroundColor: "transparent",
      boxShadow: "none",
    }),
    textWidget(
      `${name}FormulaNote`,
      'Formula: Day N retention = users from that cohort active exactly on Day N / Day 0 cohort users. All Users = weighted summary of cohorts where that day exists. "--" means that day has not matured yet or GA4 returned no cohort row.',
      left,
      formulaTop + 1,
      left + tableWidth,
      formulaTop + 6,
      {
        fontSize: "0.82rem",
        fontStyle: "NORMAL",
        textColor: "#1E3A8A",
        backgroundColor: "#EFF6FF",
        borderColor: "#93C5FD",
        borderWidth: "1",
        borderRadius: "0px",
      },
    ),
  ];
  let cursor = left;
  headers.forEach(([text, width], index) => {
    widgets.push(textWidget(`${name}Header${index}`, text.toUpperCase(), cursor, tableTop, cursor + width, tableTop + 4, {
      fontSize: "0.82rem",
      fontStyle: "BOLD",
      textColor: "#FFFFFF",
      backgroundColor: "#FF6D0A",
      borderColor: "#FCD34D",
      borderWidth: "1",
      borderRadius: "0px",
      textAlign: "CENTER",
    }));
    cursor += width;
  });
  const fields = [
    ["cohort", "text"],
    ["users", "number"],
    ["day_0", "percent"],
    ["day_1", "percent"],
    ["day_2", "percent"],
    ["day_3", "percent"],
    ["day_4", "percent"],
    ["day_5", "percent"],
    ["day_6", "percent"],
    ["day_7", "percent"],
    ["day_8", "percent"],
    ["day_9", "percent"],
    ["day_10", "percent"],
  ];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    cursor = left;
    fields.forEach(([field, formatter], index) => {
      const width = headers[index][1];
      widgets.push(textWidget(`${name}Row${rowIndex}Cell${index}`, cell(rowIndex, field, formatter), cursor, tableTop + 4 + rowIndex * 4, cursor + width, tableTop + 8 + rowIndex * 4, {
        fontSize: "0.78rem",
        fontStyle: rowIndex === rowCount - 1 || index !== 0 ? "BOLD" : "NORMAL",
        textColor: "#111827",
        backgroundColor: rowIndex === rowCount - 1 ? "#FDE68A" : index <= 2 ? "#FCE7F3" : rowIndex % 2 === 0 ? "#FFFFFF" : "#FFF7ED",
        borderColor: "#FCD34D",
        borderWidth: "1",
        borderRadius: "0px",
        textAlign: index === 0 ? "LEFT" : "CENTER",
      }));
      cursor += width;
    });
  }
  return widgets;
}

function rollingRetentionTableWidgets(name, label, queryName, left, top) {
  const dataRoot = `(() => { const live = (typeof ${queryName} !== "undefined" ? ${queryName}.data?.data : null); const stored = appsmith.store["${queryName}_lastData_v2"]; if (live?.rolling_retention_table?.[0]) return live; return stored || live || {}; })()`;
  const cell = (rowIndex, field, formatter = "percent") => {
    const rowExpr = `(((${dataRoot}).rolling_retention_table || [])[${rowIndex}] || {})`;
    if (formatter === "text") {
      return `{{(() => { const r = ${rowExpr}; return r.${field} || ""; })()}}`;
    }
    if (formatter === "number") {
      return `{{(() => { const r = ${rowExpr}; const v = r.${field}; if (v === null || v === undefined || v === "") return "—"; const n = Number(v || 0); return Number.isFinite(n) ? n.toLocaleString() : "—"; })()}}`;
    }
    return `{{(() => { const r = ${rowExpr}; const v = r.${field}; if (v === null || v === undefined || v === "") return "—"; const n = Number(v || 0); return Number.isFinite(n) ? n.toFixed(1) + "%" : "—"; })()}}`;
  };
  const headers = [
    ["Cohort", 8],
    ["Users", 5],
    ["Day 1+ Users", 6],
    ["Day 1+", 5],
    ["Day 3+ Users", 6],
    ["Day 3+", 5],
    ["Day 7+ Users", 6],
    ["Day 7+", 5],
    ["Day 15+ Users", 6],
    ["Day 15+", 5],
  ];
  const fields = [
    ["cohort", "text"],
    ["users", "number"],
    ["rolling_day_1_users", "number"],
    ["rolling_day_1_pct", "percent"],
    ["rolling_day_3_users", "number"],
    ["rolling_day_3_pct", "percent"],
    ["rolling_day_7_users", "number"],
    ["rolling_day_7_pct", "percent"],
    ["rolling_day_15_users", "number"],
    ["rolling_day_15_pct", "percent"],
  ];
  const rowCount = 11;
  const tableWidth = headers.reduce((sum, [, width]) => sum + width, 0);
  const tableTop = top + 8;
  const formulaTop = tableTop + 4 + rowCount * 4;
  const widgets = [
    textWidget(`${name}SmallTitle`, label, left, top, left + tableWidth, top + 4, {
      fontSize: "1rem",
      fontStyle: "BOLD",
      textColor: "#111827",
      backgroundColor: "transparent",
      boxShadow: "none",
    }),
    textWidget(`${name}MainTitle`, "Rolling Retention", left, top + 4, left + tableWidth, top + 8, {
      fontSize: "1.65rem",
      fontStyle: "BOLD",
      textColor: "#111827",
      textAlign: "CENTER",
      backgroundColor: "transparent",
      boxShadow: "none",
    }),
    textWidget(
      `${name}FormulaNote`,
      "Formula: Rolling Day N+ = distinct users from the same Day 0 cohort active on Day N or any later day / Day 0 cohort users. Source: GA4 BigQuery exact user-level export. Only matured cohorts are included; All Users is a weighted aggregate.",
      left,
      formulaTop + 1,
      left + tableWidth,
      formulaTop + 7,
      {
        fontSize: "0.82rem",
        fontStyle: "NORMAL",
        textColor: "#6B7280",
        backgroundColor: "#FFFBEB",
        borderColor: "#FDBA74",
        borderWidth: "1",
        borderRadius: "0px",
      },
    ),
  ];
  let cursor = left;
  headers.forEach(([text, width], index) => {
    widgets.push(textWidget(`${name}Header${index}`, text.toUpperCase(), cursor, tableTop, cursor + width, tableTop + 4, {
      fontSize: "0.78rem",
      fontStyle: "BOLD",
      textColor: "#FFFFFF",
      backgroundColor: "#2563EB",
      borderColor: "#93C5FD",
      borderWidth: "1",
      borderRadius: "0px",
      textAlign: "CENTER",
    }));
    cursor += width;
  });
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    cursor = left;
    fields.forEach(([field, formatter], index) => {
      const width = headers[index][1];
      widgets.push(textWidget(`${name}Row${rowIndex}Cell${index}`, cell(rowIndex, field, formatter), cursor, tableTop + 4 + rowIndex * 4, cursor + width, tableTop + 8 + rowIndex * 4, {
        fontSize: "0.78rem",
        fontStyle: rowIndex === rowCount - 1 || index !== 0 ? "BOLD" : "NORMAL",
        textColor: "#111827",
        backgroundColor: rowIndex === rowCount - 1 ? "#DBEAFE" : index <= 1 ? "#EEF2FF" : rowIndex % 2 === 0 ? "#FFFFFF" : "#EFF6FF",
        borderColor: "#93C5FD",
        borderWidth: "1",
        borderRadius: "0px",
        textAlign: index === 0 ? "LEFT" : "CENTER",
      }));
      cursor += width;
    });
  }
  return widgets;
}

function selectWidget(name, label, options, defaultOptionValue, left, top, right, bottom, onOptionChange = "") {
  const sourceData = options.map((option) => ({ name: option.label, code: option.value }));
  const dynamicBindingPathList = [];
  if (typeof defaultOptionValue === "string" && defaultOptionValue.includes("{{")) {
    dynamicBindingPathList.push({ key: "defaultOptionValue" });
  }
  return {
    widgetName: name,
    widgetId: id("w"),
    type: "SELECT_WIDGET",
    displayName: "Select",
    version: 1,
    key: id("select_key"),
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    animateLoading: true,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    dynamicHeight: "FIXED",
    responsiveBehavior: "fill",
    minWidth: 120,
    label,
    labelPosition: "Top",
    labelTextSize: "0.8rem",
    labelTextColor: "#374151",
    sourceData: JSON.stringify(sourceData, null, 2),
    optionLabel: "name",
    optionValue: "code",
    defaultOptionValue,
    placeholderText: "Select",
    isFilterable: true,
    serverSideFiltering: false,
    isDisabled: false,
    isRequired: false,
    borderRadius: "2px",
    boxShadow: "none",
    accentColor: "#FFFFFF",
    onOptionChange,
    dynamicBindingPathList,
    dynamicPropertyPathList: [{ key: "sourceData" }],
    dynamicTriggerPathList: onOptionChange ? [{ key: "onOptionChange" }] : [],
  };
}

function inputWidget(name, label, defaultText, left, top, right, bottom, visible = true) {
  return {
    widgetName: name,
    widgetId: id("w"),
    type: "INPUT_WIDGET_V2",
    displayName: "Input",
    version: 2,
    key: id("input_key"),
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: visible,
    isLoading: false,
    animateLoading: true,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    dynamicHeight: "FIXED",
    responsiveBehavior: "fill",
    minWidth: 120,
    label,
    labelPosition: "Top",
    labelTextSize: "0.8rem",
    labelTextColor: "#374151",
    inputType: "TEXT",
    defaultText,
    placeholderText: "YYYY-MM-DD",
    isDisabled: false,
    isRequired: false,
    resetOnSubmit: false,
    borderRadius: "2px",
    boxShadow: "none",
    dynamicBindingPathList: [
      ...(typeof visible === "string" && visible.includes("{{") ? [{ key: "isVisible" }] : []),
      ...(typeof defaultDate === "string" && defaultDate.includes("{{") ? [{ key: "defaultDate" }] : []),
    ],
    dynamicTriggerPathList: [],
  };
}

function datePickerWidget(name, label, defaultDate, left, top, right, bottom, visible = true, onDateSelected = "") {
  return {
    widgetName: name,
    widgetId: id("w"),
    type: "DATE_PICKER_WIDGET2",
    displayName: "DatePicker",
    version: 2,
    key: id("date_key"),
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: visible,
    isLoading: false,
    animateLoading: true,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    dynamicHeight: "FIXED",
    responsiveBehavior: "fill",
    minWidth: 120,
    label,
    labelPosition: "Top",
    labelTextSize: "0.8rem",
    labelTextColor: "#374151",
    dateFormat: "YYYY-MM-DD",
    defaultDate,
    minDate: "2020-01-01",
    maxDate: "2121-12-31",
    shortcuts: false,
    timePrecision: "None",
    isDisabled: false,
    isRequired: false,
    borderRadius: "2px",
    boxShadow: "none",
    onDateSelected,
    dynamicBindingPathList: typeof visible === "string" && visible.includes("{{") ? [{ key: "isVisible" }] : [],
    dynamicTriggerPathList: onDateSelected ? [{ key: "onDateSelected" }] : [],
  };
}

function buttonWidget(name, text, onClick, left, top, right, bottom) {
  return {
    widgetName: name,
    widgetId: id("w"),
    type: "BUTTON_WIDGET",
    displayName: "Button",
    version: 1,
    key: id("button_key"),
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    animateLoading: true,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    dynamicHeight: "FIXED",
    responsiveBehavior: "hug",
    minWidth: 120,
    text,
    buttonColor: "#1A73E8",
    buttonStyle: "PRIMARY_BUTTON",
    borderRadius: "2px",
    boxShadow: "none",
    onClick,
    dynamicBindingPathList: [],
    dynamicTriggerPathList: [{ key: "onClick" }],
  };
}

function filterStoreExpression(queryName, filterNames) {
  const dateRange = `(typeof ${filterNames.dateRange} !== "undefined" ? (${filterNames.dateRange}.selectedOptionValue || "30daysAgo|yesterday") : "30daysAgo|yesterday")`;
  const customStart = `(typeof ${filterNames.customStartDate} !== "undefined" ? (${filterNames.customStartDate}.selectedDate || "") : "")`;
  const customEnd = `(typeof ${filterNames.customEndDate} !== "undefined" ? (${filterNames.customEndDate}.selectedDate || "") : "")`;
  const startDate = `${dateRange} === "custom|custom" ? (${customStart} ? moment(${customStart}).format("YYYY-MM-DD") : "30daysAgo") : String(${dateRange}).split("|")[0]`;
  const endDate = `${dateRange} === "custom|custom" ? (${customEnd} ? moment(${customEnd}).format("YYYY-MM-DD") : "yesterday") : (String(${dateRange}).split("|")[1] || "yesterday")`;
  const params = `{` +
    `start_date: ${startDate},` +
    `end_date: ${endDate},` +
    `date_range: ${dateRange},` +
    `app_version: (typeof ${filterNames.appVersion} !== "undefined" ? (${filterNames.appVersion}.selectedOptionValue || "") : ""),` +
    `os_version: (typeof ${filterNames.osVersion} !== "undefined" ? (${filterNames.osVersion}.selectedOptionValue || "") : ""),` +
    `device_model: (typeof ${filterNames.deviceModel} !== "undefined" ? (${filterNames.deviceModel}.selectedOptionValue || "") : ""),` +
    `country: (typeof ${filterNames.country} !== "undefined" ? (${filterNames.country}.selectedOptionValue || "") : ""),` +
    `level_number: (typeof ${filterNames.levelNumber} !== "undefined" ? (${filterNames.levelNumber}.selectedOptionValue || "") : "")` +
    `}`;
  return `(() => { const params = ${params}; const query = (typeof ${queryName} !== "undefined" ? ${queryName} : null); return storeValue("${queryName}_filters", params).then(() => { if (!query || typeof query.run !== "function") { showAlert("${queryName} is still loading. Please wait one second and click Apply filters again.", "warning"); return null; } return query.run((response) => storeValue("${queryName}_lastData_v2", response?.data || response || {}), (error) => showAlert((error && error.message) ? error.message : "Filter request failed", "error"), params); }); })()`;
}

const filterOptions = {
  dateRanges: [
    { label: "Last 7 days", value: "7daysAgo|yesterday" },
    { label: "Last 14 days", value: "14daysAgo|yesterday" },
    { label: "Last 30 days", value: "30daysAgo|yesterday" },
    { label: "Last 90 days", value: "90daysAgo|yesterday" },
    { label: "Today", value: "today|today" },
    { label: "Custom date range", value: "custom|custom" },
  ],
  appVersions: [
  {
    "label": "All app versions",
    "value": ""
  },
  {
    "label": "1.6.0",
    "value": "1.6.0"
  },
  {
    "label": "1.7.3",
    "value": "1.7.3"
  },
  {
    "label": "1.7.4",
    "value": "1.7.4"
  },
  {
    "label": "1.5.2",
    "value": "1.5.2"
  },
  {
    "label": "1.7.5",
    "value": "1.7.5"
  },
  {
    "label": "1.7.2",
    "value": "1.7.2"
  },
  {
    "label": "1.7.1",
    "value": "1.7.1"
  },
  {
    "label": "1.0.1.1",
    "value": "1.0.1.1"
  },
  {
    "label": "1.7.0",
    "value": "1.7.0"
  }
],
  osVersions: [
  {
    "label": "All OS versions",
    "value": ""
  },
  {
    "label": "15",
    "value": "15"
  },
  {
    "label": "16",
    "value": "16"
  },
  {
    "label": "14",
    "value": "14"
  },
  {
    "label": "11",
    "value": "11"
  },
  {
    "label": "13",
    "value": "13"
  },
  {
    "label": "12",
    "value": "12"
  },
  {
    "label": "10",
    "value": "10"
  },
  {
    "label": "9",
    "value": "9"
  },
  {
    "label": "8.1.0",
    "value": "8.1.0"
  },
  {
    "label": "7.1.1",
    "value": "7.1.1"
  },
  {
    "label": "7.1.2",
    "value": "7.1.2"
  },
  {
    "label": "7.0",
    "value": "7.0"
  },
  {
    "label": "17",
    "value": "17"
  }
],
  countries: [
  {
    "label": "All countries",
    "value": ""
  },
  {
    "label": "India",
    "value": "India"
  },
  {
    "label": "United States",
    "value": "United States"
  },
  {
    "label": "Brazil",
    "value": "Brazil"
  },
  {
    "label": "Argentina",
    "value": "Argentina"
  },
  {
    "label": "Chile",
    "value": "Chile"
  },
  {
    "label": "Russia",
    "value": "Russia"
  },
  {
    "label": "Vietnam",
    "value": "Vietnam"
  },
  {
    "label": "Nepal",
    "value": "Nepal"
  },
  {
    "label": "Saudi Arabia",
    "value": "Saudi Arabia"
  },
  {
    "label": "Algeria",
    "value": "Algeria"
  },
  {
    "label": "Bangladesh",
    "value": "Bangladesh"
  },
  {
    "label": "Greece",
    "value": "Greece"
  },
  {
    "label": "Kyrgyzstan",
    "value": "Kyrgyzstan"
  },
  {
    "label": "Moldova",
    "value": "Moldova"
  },
  {
    "label": "Netherlands",
    "value": "Netherlands"
  },
  {
    "label": "Pakistan",
    "value": "Pakistan"
  },
  {
    "label": "Switzerland",
    "value": "Switzerland"
  }
],
  devices: [
  {
    "label": "All device models",
    "value": ""
  },
  {
    "label": "A142P",
    "value": "A142P"
  },
  {
    "label": "24116PCC1I",
    "value": "24116PCC1I"
  },
  {
    "label": "2411DRN47I",
    "value": "2411DRN47I"
  },
  {
    "label": "CPH2681",
    "value": "CPH2681"
  },
  {
    "label": "25028RN03I",
    "value": "25028RN03I"
  },
  {
    "label": "25028PC03I",
    "value": "25028PC03I"
  },
  {
    "label": "V2420",
    "value": "V2420"
  },
  {
    "label": "M2006C3MII",
    "value": "M2006C3MII"
  },
  {
    "label": "23028RN4DI",
    "value": "23028RN4DI"
  },
  {
    "label": "M2006C3LI",
    "value": "M2006C3LI"
  },
  {
    "label": "V2111",
    "value": "V2111"
  },
  {
    "label": "23124RN87I",
    "value": "23124RN87I"
  },
  {
    "label": "23076RN4BI",
    "value": "23076RN4BI"
  },
  {
    "label": "CPH2733",
    "value": "CPH2733"
  },
  {
    "label": "Moto G45 5G",
    "value": "Moto G45 5G"
  },
  {
    "label": "SM-A146B",
    "value": "SM-A146B"
  },
  {
    "label": "V2204",
    "value": "V2204"
  },
  {
    "label": "23128PC33I",
    "value": "23128PC33I"
  },
  {
    "label": "V2432",
    "value": "V2432"
  },
  {
    "label": "CPH2617",
    "value": "CPH2617"
  },
  {
    "label": "CPH2753",
    "value": "CPH2753"
  },
  {
    "label": "2406ERN9CI",
    "value": "2406ERN9CI"
  },
  {
    "label": "CPH2179",
    "value": "CPH2179"
  },
  {
    "label": "RMX3231",
    "value": "RMX3231"
  },
  {
    "label": "24116RNC1I",
    "value": "24116RNC1I"
  },
  {
    "label": "CPH2127",
    "value": "CPH2127"
  },
  {
    "label": "SM-A066",
    "value": "SM-A066"
  },
  {
    "label": "SM-M136B",
    "value": "SM-M136B"
  },
  {
    "label": "V2315",
    "value": "V2315"
  },
  {
    "label": "V2521",
    "value": "V2521"
  }
],
  levels: [
  {
    "label": "All levels",
    "value": ""
  },
  {
    "label": "level_1",
    "value": "level_1"
  },
  {
    "label": "level_2",
    "value": "level_2"
  },
  {
    "label": "level_3",
    "value": "level_3"
  },
  {
    "label": "level_4",
    "value": "level_4"
  },
  {
    "label": "level_5",
    "value": "level_5"
  },
  {
    "label": "level_6",
    "value": "level_6"
  },
  {
    "label": "level_7",
    "value": "level_7"
  },
  {
    "label": "level_8",
    "value": "level_8"
  },
  {
    "label": "level_9",
    "value": "level_9"
  },
  {
    "label": "level_10",
    "value": "level_10"
  },
  {
    "label": "level_11",
    "value": "level_11"
  },
  {
    "label": "level_12",
    "value": "level_12"
  },
  {
    "label": "level_13",
    "value": "level_13"
  },
  {
    "label": "level_14",
    "value": "level_14"
  },
  {
    "label": "level_15",
    "value": "level_15"
  },
  {
    "label": "level_16",
    "value": "level_16"
  },
  {
    "label": "level_17",
    "value": "level_17"
  },
  {
    "label": "level_18",
    "value": "level_18"
  },
  {
    "label": "level_19",
    "value": "level_19"
  },
  {
    "label": "level_20",
    "value": "level_20"
  },
  {
    "label": "level_21",
    "value": "level_21"
  },
  {
    "label": "level_22",
    "value": "level_22"
  },
  {
    "label": "level_23",
    "value": "level_23"
  },
  {
    "label": "level_24",
    "value": "level_24"
  },
  {
    "label": "level_25",
    "value": "level_25"
  },
  {
    "label": "level_26",
    "value": "level_26"
  },
  {
    "label": "level_27",
    "value": "level_27"
  },
  {
    "label": "level_28",
    "value": "level_28"
  },
  {
    "label": "level_29",
    "value": "level_29"
  },
  {
    "label": "level_30",
    "value": "level_30"
  },
  {
    "label": "level_31",
    "value": "level_31"
  },
  {
    "label": "level_32",
    "value": "level_32"
  },
  {
    "label": "level_33",
    "value": "level_33"
  },
  {
    "label": "level_34",
    "value": "level_34"
  },
  {
    "label": "level_35",
    "value": "level_35"
  },
  {
    "label": "level_36",
    "value": "level_36"
  },
  {
    "label": "level_37",
    "value": "level_37"
  },
  {
    "label": "level_38",
    "value": "level_38"
  },
  {
    "label": "level_39",
    "value": "level_39"
  },
  {
    "label": "level_40",
    "value": "level_40"
  }
],
};

function defaultEChartConfig(chartType, axis = {}) {
  if (axis.echartConfig) return axis.echartConfig;
  const isLineLike = ["LINE_CHART", "AREA_CHART"].includes(chartType);
  const shouldShowLabels = axis.showDataPointLabel ?? true;
  const labelEvery = axis.labelEvery ?? (isLineLike ? 5 : 3);
  return `{{{
    grid: { left: 72, right: 34, top: 70, bottom: 62, containLabel: true },
    tooltip: {
      trigger: "axis",
      valueFormatter: value => {
        const n = Number(value || 0);
        return Number.isInteger(n)
          ? n.toLocaleString()
          : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
    },
    xAxis: {
      axisLabel: {
        hideOverlap: true,
        rotate: ${axis.xRotate ?? 25},
        formatter: value => {
          const raw = String(value || "");
          if (/^\\d{8}$/.test(raw)) return raw.slice(4, 6) + "/" + raw.slice(6, 8);
          return raw.replace("tutorial_step_", "Step ").replace("level_", "L");
        }
      }
    },
    yAxis: {
      axisLabel: {
        formatter: value => {
          const n = Number(value || 0);
          return Number.isInteger(n)
            ? n.toLocaleString()
            : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
        }
      }
    },
    series: Array.from({ length: 8 }).map(() => ({
      symbolSize: ${isLineLike ? 6 : 8},
      smooth: ${isLineLike ? "true" : "false"},
      label: {
        show: ${shouldShowLabels ? "true" : "false"},
        position: "${isLineLike ? "top" : "top"}",
        distance: 6,
        fontSize: 10,
        color: "#334155",
        backgroundColor: "rgba(255,255,255,0.88)",
        borderRadius: 3,
        padding: [2, 4],
        formatter: params => {
          const idx = params?.dataIndex ?? 0;
          const n = Number(params?.value?.[1] ?? params?.value ?? 0);
          if (!Number.isFinite(n) || n === 0) return "";
          const formatted = Number.isInteger(n)
            ? n.toLocaleString()
            : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
          return idx === 0 || idx % ${labelEvery} === 0 ? formatted : "";
        }
      },
      labelLayout: { hideOverlap: true }
    }))
  }}}`;
}

function chartWidget(name, title, chartType, series, left, top, right, bottom, axis = {}) {
  const chartData = {};
  const dynamicBindingPathList = [];
  const dynamicPropertyPathList = [];

  series.forEach((item, index) => {
    const seriesId = `${name}Series${index + 1}`;
    chartData[seriesId] = {
      seriesName: item.name,
      data: safeBinding(item.data),
      color: item.color,
    };
    dynamicBindingPathList.push({ key: `chartData.${seriesId}.data` });
    dynamicPropertyPathList.push({ key: `chartData.${seriesId}.data` });
  });

  const customEChartConfig = safeBinding(defaultEChartConfig(chartType, axis));
  dynamicBindingPathList.push({ key: "customEChartConfig" });
  dynamicPropertyPathList.push({ key: "customEChartConfig" });
  const sourceData = safeBinding(series[0]?.data ?? "[]");
  dynamicBindingPathList.push({ key: "sourceData" });
  dynamicPropertyPathList.push({ key: "sourceData" });

  return {
    widgetName: name,
    widgetId: id("w"),
    type: "CHART_WIDGET",
    displayName: "Chart",
    version: 1,
    key: id("chart_key"),
    parentId: "0",
    renderMode: "CANVAS",
    isVisible: true,
    isLoading: false,
    animateLoading: true,
    leftColumn: left,
    rightColumn: right,
    topRow: top,
    bottomRow: bottom,
    parentRowSpace: 10,
    parentColumnSpace: 15,
    dynamicHeight: "FIXED",
    responsiveBehavior: "fill",
    minWidth: 280,
    chartType,
    chartName: title,
    chartData,
    sourceData,
    customEChartConfig,
    customFusionChartConfig: {},
    xAxisName: axis.x ?? "",
    yAxisName: axis.y ?? "",
    labelOrientation: "auto",
    allowScroll: true,
    showDataPointLabel: axis.showDataPointLabel ?? true,
    setAdaptiveYMin: true,
    borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
    boxShadow: "{{appsmith.theme.boxShadow.appBoxShadow}}",
    dynamicBindingPathList,
    dynamicPropertyPathList,
    dynamicTriggerPathList: [],
  };
}

const summaryQueryNames = [
  "ExecutiveSummary",
  "AcquisitionSummary",
  "OnboardingSummary",
  "GameplaySummary",
  "RetentionSummary",
];

function tutorialStepNameJs(field = "r.step") {
  return `String(${field} || "").replace("tutorial_step_", "Step ")`;
}

function onboardingStepSankeyEChart() {
  return `{{(() => {
  const rows = (${safeQueryData("OnboardingSummary")}?.step_analysis || []);
  const nodes = [];
  const nodeSet = new Set();
  const links = [];
  const addNode = (name) => {
    if (!nodeSet.has(name)) {
      nodeSet.add(name);
      nodes.push({ name });
    }
  };
  rows.forEach((r, index) => {
    const step = String(r.step || "").replace("tutorial_step_", "Step ");
    const next = rows[index + 1] ? String(rows[index + 1].step || "").replace("tutorial_step_", "Step ") : "Tutorial Complete / Exit";
    const drop = step + " Drop-off";
    addNode(step);
    addNode(next);
    addNode(drop);
    links.push({ source: step, target: next, value: Number(r.next_step_users || 0) });
    links.push({ source: step, target: drop, value: Number(r.drop_off_users || 0) });
  });
  return {
    tooltip: { trigger: "item", triggerOn: "mousemove" },
    series: [{
      type: "sankey",
      data: nodes,
      links,
      emphasis: { focus: "adjacency" },
      nodeAlign: "justify",
      nodeWidth: 18,
      nodeGap: 12,
      lineStyle: { color: "gradient", curveness: 0.5 },
      label: { fontSize: 12 }
    }]
  };
})()}}`;
}

function onboardingManagerFunnelEChart() {
  return `{{(() => {
  const rows = (${safeQueryData("OnboardingSummary")}?.detailed_funnel || [])
    .filter(r => Number(r.users || 0) > 0)
    .map(r => ({
      name: String(r.stage || r.event || "").replaceAll("_", " "),
      value: Number(r.users || 0),
      conversion: Number(r.conversion_from_previous_pct || 0),
      dropUsers: Number(r.drop_off_from_previous_users || 0),
      dropPct: Number(r.drop_off_from_previous_pct || 0),
    }));
  const colors = ["#2563EB", "#7C3AED", "#F59E0B", "#10B981", "#06B6D4", "#6366F1"];
  return {
    color: colors,
    tooltip: {
      trigger: "item",
      formatter: p => {
        const d = p.data || {};
        const users = Number(d.value || 0).toLocaleString();
        const conv = Number(d.conversion || 0).toFixed(2).replace(/\\.00$/, "");
        const dropUsers = Number(d.dropUsers || 0).toLocaleString();
        const dropPct = Number(d.dropPct || 0).toFixed(2).replace(/\\.00$/, "");
        return "<b>" + d.name + "</b><br/>Users: " + users + "<br/>Conversion from previous: " + conv + "%<br/>Drop-off: " + dropUsers + " users (" + dropPct + "%)";
      }
    },
    legend: { show: false },
    series: [{
      name: "Onboarding Funnel",
      type: "funnel",
      left: "8%",
      top: 35,
      bottom: 25,
      width: "84%",
      minSize: "25%",
      maxSize: "100%",
      sort: "none",
      gap: 4,
      label: {
        show: true,
        position: "inside",
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: 700,
        formatter: p => p.name + "\\n" + Number(p.value || 0).toLocaleString() + " users"
      },
      labelLine: { show: false },
      itemStyle: { borderColor: "#FFFFFF", borderWidth: 2 },
      emphasis: { label: { fontSize: 14 } },
      data: rows
    }]
  };
})()}}`;
}

function safeQueryData(queryName) {
  return `((typeof ${queryName} !== "undefined" ? ${queryName}.data?.data : null) || appsmith.store["${queryName}_lastData_v2"] || {})`;
}

function safeBinding(value) {
  if (typeof value !== "string") {
    return value;
  }
  let output = value;
  summaryQueryNames.forEach((queryName) => {
    output = output.replaceAll(`${queryName}.data?.data?.kpis.`, `${safeQueryData(queryName)}?.kpis?.`);
    output = output.replaceAll(`${queryName}.data?.data?.`, `${safeQueryData(queryName)}?.`);
    output = output.replaceAll(`${queryName}.data?.data.`, `${safeQueryData(queryName)}?.`);
  });
  return output;
}

function kpiVisual(label) {
  const lower = label.toLowerCase();
  if (lower.includes("drop") || lower.includes("fail") || lower.includes("frustrat") || lower.includes("uninstall") || lower.includes("remove")) {
    return { icon: "âš ", color: "#EF4444", tint: "#FEF2F2" };
  }
  if (lower.includes("retention") || lower.includes("return") || lower.includes("stickiness") || lower.includes("engagement")) {
    return { icon: "â†»", color: "#8B5CF6", tint: "#F5F3FF" };
  }
  if (lower.includes("tutorial") || lower.includes("step") || lower.includes("level")) {
    return { icon: "â—†", color: "#2563EB", tint: "#EFF6FF" };
  }
  if (lower.includes("session") || lower.includes("screen") || lower.includes("time")) {
    return { icon: "â—·", color: "#0EA5E9", tint: "#F0F9FF" };
  }
  if (lower.includes("install") || lower.includes("new") || lower.includes("active") || lower.includes("user")) {
    return { icon: "â—", color: "#16A34A", tint: "#F0FDF4" };
  }
  return { icon: "â–£", color: "#4F46E5", tint: "#EEF2FF" };
}

function kpi(pageQuery, key, label, left, top, suffix = "") {
  const safeName = label.replaceAll(" ", "").replaceAll("/", "").replaceAll("%", "Pct");
  const visual = kpiVisual(label);
  const cardText = `{{(() => { const v = ${safeQueryData(pageQuery)}?.kpis?.${key}; const cleanLabel = "${label}"; if (v === null || v === undefined || v === "") return "â—  " + cleanLabel + "\\n\\nN/A"; const n = Number(v); const formatted = !Number.isFinite(n) ? String(v).replaceAll("_", " ") : (() => { const label = cleanLabel.toLowerCase(); const needsDecimal = "${suffix}" === "%" || label.includes("%") || label.includes("rate") || label.includes("ratio") || label.includes("stickiness") || label.includes("length") || label.includes("time") || label.includes("/user"); return (needsDecimal ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString()) + "${suffix}"; })(); return "â—  " + cleanLabel + "\\n\\n" + formatted; })()}}`;
  return [
    textWidget(`${safeName}KpiCard`, cardText, left, top, left + 14, top + 9, {
      fontSize: "1.05rem",
      fontStyle: "BOLD",
      textColor: "#111827",
      backgroundColor: "#FFFFFF",
      borderColor: "#E5E7EB",
      borderWidth: "1",
      borderRadius: "10px",
      boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.08)",
    }),
  ];
}

function kpiVisualClean(label) {
  const lower = label.toLowerCase();
  if (lower.includes("drop") || lower.includes("fail") || lower.includes("frustrat") || lower.includes("uninstall") || lower.includes("remove")) {
    return { color: "#EF4444", tint: "#FEF2F2" };
  }
  if (lower.includes("retention") || lower.includes("return") || lower.includes("stickiness") || lower.includes("engagement")) {
    return { color: "#8B5CF6", tint: "#F5F3FF" };
  }
  if (lower.includes("tutorial") || lower.includes("step") || lower.includes("level")) {
    return { color: "#2563EB", tint: "#EFF6FF" };
  }
  if (lower.includes("session") || lower.includes("screen") || lower.includes("time")) {
    return { color: "#0EA5E9", tint: "#F0F9FF" };
  }
  if (lower.includes("install") || lower.includes("new") || lower.includes("active") || lower.includes("user")) {
    return { color: "#16A34A", tint: "#F0FDF4" };
  }
  return { color: "#4F46E5", tint: "#EEF2FF" };
}

kpi = function kpi(pageQuery, key, label, left, top, suffix = "") {
  const safeName = label.replaceAll(" ", "").replaceAll("/", "").replaceAll("%", "Pct");
  const visual = kpiVisualClean(label);
  const cardText = `{{(() => { const v = ${safeQueryData(pageQuery)}?.kpis?.${key}; const cleanLabel = "${label}"; const pad = "      "; if (v === null || v === undefined || v === "") return pad + cleanLabel + "\\n\\n" + pad + "N/A"; const n = Number(v); const formatted = !Number.isFinite(n) ? String(v).replaceAll("_", " ") : (() => { const label = cleanLabel.toLowerCase(); const needsDecimal = "${suffix}" === "%" || label.includes("%") || label.includes("rate") || label.includes("ratio") || label.includes("stickiness") || label.includes("length") || label.includes("time") || label.includes("/user"); return (needsDecimal ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString()) + "${suffix}"; })(); return pad + cleanLabel + "\\n\\n" + pad + formatted; })()}}`;
  return [
    textWidget(`${safeName}KpiCard`, cardText, left, top, left + 14, top + 9, {
      fontSize: "1.08rem",
      fontStyle: "BOLD",
      textColor: "#111827",
      backgroundColor: "#FFFFFF",
      borderColor: "#E5E7EB",
      borderWidth: "1",
      borderRadius: "14px",
      boxShadow: "0px 6px 16px rgba(15, 23, 42, 0.08)",
    }),
    textWidget(`${safeName}Accent`, "", left, top, left + 0.35, top + 9, {
      backgroundColor: visual.color,
      borderColor: visual.color,
      borderWidth: "1",
      borderRadius: "14px",
      boxShadow: "none",
    }),
    textWidget(`${safeName}IconBubble`, "â—", left + 1, top + 1, left + 2.8, top + 4, {
      fontSize: "1.05rem",
      fontStyle: "BOLD",
      textAlign: "CENTER",
      textColor: visual.color,
      backgroundColor: visual.tint,
      borderColor: visual.tint,
      borderWidth: "1",
      borderRadius: "999px",
      boxShadow: "none",
    }),
  ];
};

kpi = function kpi(pageQuery, key, label, left, top, suffix = "") {
  const safeName = label.replaceAll(" ", "").replaceAll("/", "").replaceAll("%", "Pct");
  const visual = kpiVisualClean(label);
  const cardText = `{{(() => { const v = ${safeQueryData(pageQuery)}?.kpis?.${key}; const cleanLabel = "${label}"; if (v === null || v === undefined || v === "") return cleanLabel + "\\n\\nN/A"; const n = Number(v); const formatted = !Number.isFinite(n) ? String(v).replaceAll("_", " ") : (() => { const label = cleanLabel.toLowerCase(); const needsDecimal = "${suffix}" === "%" || label.includes("%") || label.includes("rate") || label.includes("ratio") || label.includes("stickiness") || label.includes("length") || label.includes("time") || label.includes("/user"); return (needsDecimal ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString()) + "${suffix}"; })(); return cleanLabel + "\\n\\n" + formatted; })()}}`;
  return [
    textWidget(`${safeName}KpiCard`, cardText, left, top, left + 14, top + 9, {
      fontSize: "1.12rem",
      fontStyle: "BOLD",
      textColor: "#0F172A",
      backgroundColor: visual.tint,
      borderColor: visual.color,
      borderWidth: "1",
      borderRadius: "18px",
      boxShadow: "0px 10px 24px rgba(15, 23, 42, 0.10)",
    }),
  ];
};

function makePage({ name, slug, queryName, pathName, kpis, tables }) {
  const pageIdBySlug = {
    "executive-health": "64a5df3c2bc8e5f3b81f0001",
    acquisition: "64a5df3c2bc8e5f3b81f0002",
    onboarding: "64a5df3c2bc8e5f3b81f0003",
    gameplay: "64a5df3c2bc8e5f3b81f0004",
    retention: "64a5df3c2bc8e5f3b81f0005",
  };
  const pageId = pageIdBySlug[slug] || id("page");
  const isDefault = slug === "executive-health";
  const filterNames = {
    dateRange: `${queryName}DateRangeFilter`,
    customStartDate: `${queryName}CustomStartDateFilter`,
    customEndDate: `${queryName}CustomEndDateFilter`,
    appVersion: `${queryName}AppVersionFilter`,
    osVersion: `${queryName}OSVersionFilter`,
    deviceModel: `${queryName}DeviceModelFilter`,
    country: `${queryName}CountryFilter`,
    levelNumber: `${queryName}LevelNumberFilter`,
  };
  const runWithFilters = `{{${filterStoreExpression(queryName, filterNames)}}}`;
  const children = [
    textWidget(`${slug}Title`, name, 2, 2, 42, 7, {
      fontSize: "1.7rem",
      fontStyle: "BOLD",
      textColor: "#111827",
    }),
    textWidget(`${slug}Subtitle`, "Live GA4 data via FastAPI. Date range: last 30 days ending yesterday.", 2, 7, 56, 10, {
      fontSize: "0.9rem",
      fontStyle: "NORMAL",
      textColor: "#6B7280",
    }),
    textWidget(`${slug}FiltersTitle`, "Filters", 2, 11, 12, 14, {
      fontSize: "1rem",
      fontStyle: "BOLD",
      textColor: "#111827",
    }),
    selectWidget(filterNames.dateRange, "Select date range", filterOptions.dateRanges, `{{appsmith.store["${queryName}_filters"]?.date_range || "30daysAgo|yesterday"}}`, 2, 15, 12, 22),
    selectWidget(filterNames.appVersion, "App version", filterOptions.appVersions, `{{appsmith.store["${queryName}_filters"]?.app_version || ""}}`, 13, 15, 23, 22),
    selectWidget(filterNames.osVersion, "OS version", filterOptions.osVersions, `{{appsmith.store["${queryName}_filters"]?.os_version || ""}}`, 24, 15, 34, 22),
    selectWidget(filterNames.deviceModel, "Device model", filterOptions.devices, `{{appsmith.store["${queryName}_filters"]?.device_model || ""}}`, 35, 15, 45, 22),
    selectWidget(filterNames.country, "Country", filterOptions.countries, `{{appsmith.store["${queryName}_filters"]?.country || ""}}`, 46, 15, 54, 22),
    selectWidget(filterNames.levelNumber, "Level Number", filterOptions.levels, `{{appsmith.store["${queryName}_filters"]?.level_number || ""}}`, 55, 15, 63, 22),
    datePickerWidget(
      filterNames.customStartDate,
      "Custom start date",
      `{{appsmith.store["${queryName}_filters"]?.date_range === "custom|custom" ? (appsmith.store["${queryName}_filters"]?.start_date || "") : ""}}`,
      2,
      23,
      12,
      30,
      true,
      "",
    ),
    datePickerWidget(
      filterNames.customEndDate,
      "Custom end date",
      `{{appsmith.store["${queryName}_filters"]?.date_range === "custom|custom" ? (appsmith.store["${queryName}_filters"]?.end_date || "") : ""}}`,
      13,
      23,
      23,
      30,
      true,
      "",
    ),
    buttonWidget(`${queryName}RefreshButton`, "Apply filters", runWithFilters, 24, 24, 35, 30),
    textWidget(
      `${slug}FiltersHelp`,
      "Calendar dates are used only when Date range = Custom date range. Select All for optional filters.",
      36,
      24,
      62,
      30,
      {
        fontSize: "0.8rem",
        fontStyle: "NORMAL",
        textColor: "#6B7280",
      },
    ),
  ];

  const kpiStartTop = 34;

  kpis.forEach((item, index) => {
    const left = 2 + (index % 4) * 15;
    const top = kpiStartTop + Math.floor(index / 4) * 17;
    children.push(...containerKpiCard(queryName, item.key, item.label, left, top, item.suffix ?? ""));
  });

  const kpiRows = Math.ceil(kpis.length / 4);
  const chartTop = kpiStartTop + kpiRows * 17 + 8;
  (arguments[0].charts ?? []).forEach((item, index) => {
    const left = index % 2 === 0 ? 2 : 34;
    const top = chartTop + Math.floor(index / 2) * 31;
    children.push(chartWidget(item.name, item.title, item.type, item.series, left, top, left + 30, top + 27, item.axis));
  });

  const tableTop = kpis.length
    ? chartTop + Math.ceil((arguments[0].charts ?? []).length / 2) * 31 + 10
    : kpiStartTop;
  let currentTableTop = tableTop;
  tables.forEach((item) => {
    const top = currentTableTop;
    if (item.cohortTable) {
      children.push(...retentionCohortTableWidgets(item.name, item.label, queryName, 2, top));
      currentTableTop += 64;
      return;
    }
    if (item.rollingRetentionTable) {
      children.push(...rollingRetentionTableWidgets(item.name, item.label, queryName, 2, top));
      currentTableTop += 58;
      return;
    }
    if (item.markdown && !item.data) {
      children.push(
        textWidget(`${item.name}Title`, item.label, 2, top, 40, top + 4, {
          fontSize: "1rem",
          fontStyle: "BOLD",
          textColor: "#111827",
        }),
        textWidget(
          `${item.name}MarkdownTable`,
          safeBinding(item.markdown),
          2,
          top + 4,
          62,
          top + 27,
          {
            fontSize: "0.82rem",
            fontStyle: "NORMAL",
            textColor: "#111827",
          },
        ),
      );
      currentTableTop += 28;
      return;
    }
    children.push(
      textWidget(`${item.name}Title`, item.label, 2, top, 40, top + 4, {
        fontSize: "1rem",
        fontStyle: "BOLD",
        textColor: "#111827",
      }),
      tableWidget(
        `${item.name}Table`,
        item.data
          ? safeBinding(item.data)
          : `{{${safeQueryData(queryName)}?.${item.path} ?? []}}`,
        2,
        top + 4,
        62,
        top + 27,
        item.columns ? { columns: item.columns } : {},
      ),
    );
    currentTableTop += 28;
  });

  const dsl = {
    widgetName: "MainContainer",
    backgroundColor: "none",
    rightColumn: 1280,
    snapColumns: 64,
    detachFromLayout: true,
    widgetId: "0",
    topRow: 0,
    bottomRow: Math.max(90, tableTop + tables.length * 28 + 6),
    containerStyle: "none",
    snapRows: 125,
    parentRowSpace: 1,
    type: "CANVAS_WIDGET",
    canExtend: true,
    version: 89,
    minHeight: 900,
    parentColumnSpace: 1,
    dynamicTriggerPathList: [],
    dynamicBindingPathList: [],
    leftColumn: 0,
    children,
  };

  const actionId = id("action");
  const queryParamValue = (key, fallback) =>
    `{{(typeof this !== "undefined" && this.params && this.params.${key} !== undefined ? this.params.${key} : (appsmith.store["${queryName}_filters"]?.${key} ?? "${fallback}"))}}`;
  const queryParameters = [
    {
      key: "start_date",
      value: queryParamValue("start_date", "30daysAgo"),
    },
    {
      key: "end_date",
      value: queryParamValue("end_date", "yesterday"),
    },
    { key: "app_version", value: queryParamValue("app_version", "") },
    { key: "os_version", value: queryParamValue("os_version", "") },
    { key: "device_model", value: queryParamValue("device_model", "") },
    { key: "country", value: queryParamValue("country", "") },
    { key: "level_number", value: queryParamValue("level_number", "") },
  ];
  const queryJsonPathKeys = queryParameters.map((param) => param.value.slice(2, -2));
  const action = {
    id: actionId,
    baseId: actionId,
    baseActionId: actionId,
    basePageId: pageId,
    userPermissions: ["read:actions", "execute:actions", "manage:actions"],
    pluginType: "API",
    pluginId: restApiPluginId,
    unpublishedAction: {
      id: actionId,
      baseId: actionId,
      baseActionId: actionId,
      basePageId: pageId,
      name: queryName,
      datasource: {
        userPermissions: [],
        name: "SumlinkAPI",
        pluginId: restApiPluginId,
        datasourceConfiguration: { url: baseUrl },
        invalids: [],
        isValid: true,
        new: true,
      },
      pageId: pageId,
      actionConfiguration: {
        timeoutInMillisecond: 60000,
        paginationType: "NONE",
        path: pathName,
        headers: [],
        autoGeneratedHeaders: [],
        bodyFormData: [],
        encodeParamsToggle: true,
        queryParameters,
        body: "",
        formData: { apiContentType: "none" },
        httpMethod: { name: "GET" },
        httpVersion: "HTTP11",
        pluginSpecifiedTemplates: [{ value: true }],
      },
      executeOnLoad: true,
      dynamicBindingPathList: queryParameters.map((_, index) => ({ key: `actionConfiguration.queryParameters.${index}.value` })),
      isValid: true,
      invalids: [],
      jsonPathKeys: queryJsonPathKeys,
      confirmBeforeExecute: false,
      userPermissions: [],
    },
    new: false,
  };
  action.publishedAction = structuredClone(action.unpublishedAction);

  return {
    page: {
      id: pageId,
      baseId: pageId,
      basePageId: pageId,
      defaultPageId: pageId,
      isDefault,
      new: true,
      userPermissions: ["read:pages", "manage:pages"],
      unpublishedPage: {
        id: pageId,
        baseId: pageId,
        basePageId: pageId,
        name,
        slug,
        isDefault,
        layouts: [
          {
            id: id("layout"),
            userPermissions: [],
            dsl,
            layoutOnLoadActions: [[{
              id: actionId,
              name: queryName,
              pluginType: "API",
              jsonPathKeys: queryJsonPathKeys,
              timeoutInMillisecond: 60000,
              confirmBeforeExecute: false,
            }]],
            layoutOnLoadActionErrors: [],
            validOnPageLoadActions: true,
            new: false,
          },
        ],
        userPermissions: [],
      },
      publishedPage: {
        id: pageId,
        baseId: pageId,
        basePageId: pageId,
        name,
        slug,
        isDefault,
        layouts: [
          {
            id: id("layout"),
            userPermissions: [],
            dsl: structuredClone(dsl),
            layoutOnLoadActions: [[{
              id: actionId,
              name: queryName,
              pluginType: "API",
              jsonPathKeys: queryJsonPathKeys,
              timeoutInMillisecond: 60000,
              confirmBeforeExecute: false,
            }]],
            layoutOnLoadActionErrors: [],
            validOnPageLoadActions: true,
            new: false,
          },
        ],
        userPermissions: [],
      },
      unpublishedCustomPage: {
        id: pageId,
        basePageId: pageId,
        name,
        isDefault,
      },
      publishedCustomPage: {
        id: pageId,
        basePageId: pageId,
        name,
        isDefault,
      },
    },
    action,
  };
}

const specs = [
  {
    name: "Executive Health",
    slug: "executive-health",
    queryName: "ExecutiveSummary",
    pathName: "https://sumlink-analytics-api.onrender.com/api/v1/executive/summary",
    kpis: [
      { key: "active_users", label: "Active Users" },
      { key: "new_users", label: "New Users" },
      { key: "dau", label: "DAU" },
      { key: "mau", label: "MAU" },
      { key: "stickiness_pct", label: "DAU / MAU Stickiness", suffix: "%" },
      { key: "engagement_rate_pct", label: "Engagement Rate", suffix: "%" },
      { key: "sessions", label: "Sessions" },
      { key: "screen_views", label: "Screen Views" },
    ],
    charts: [
      {
        name: "ActiveUsersTrendChart",
        title: "Daily Users: Active vs New",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Users", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Active Users",
            data: "{{(ExecutiveSummary.data?.data?.daily_trend || []).map(r => ({ x: r.date, y: Number(r.activeUsers || 0) }))}}",
          },
          {
            name: "New Users",
            data: "{{(ExecutiveSummary.data?.data?.daily_trend || []).map(r => ({ x: r.date, y: Number(r.newUsers || 0) }))}}",
          },
        ],
      },
      {
        name: "StickinessTrendChart",
        title: "DAU / MAU Stickiness Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Stickiness %", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Stickiness %",
            data: "{{(ExecutiveSummary.data?.data?.daily_trend || []).map(r => ({ x: r.date, y: Number((((r.activeUsers || 0) / (ExecutiveSummary.data?.data?.kpis.mau || 1)) * 100).toFixed(2)) }))}}",
          },
        ],
      },
      {
        name: "SessionsViewsTrendChart",
        title: "Session Activity vs Screen Views",
        type: "AREA_CHART",
        axis: { x: "Date", y: "Count", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Sessions",
            data: "{{(ExecutiveSummary.data?.data?.daily_trend || []).map(r => ({ x: r.date, y: Number(r.sessions || 0) }))}}",
          },
          {
            name: "Screen Views",
            data: "{{(ExecutiveSummary.data?.data?.daily_trend || []).map(r => ({ x: r.date, y: Number(r.screenPageViews || 0) }))}}",
          },
        ],
      },
      {
        name: "ActivityMixChart",
        title: "Executive KPI Mix",
        type: "COLUMN_CHART",
        axis: { x: "Metric", y: "Count" },
        series: [
          {
            name: "Count",
            data: "{{[{ x: 'Active Users', y: Number(ExecutiveSummary.data?.data?.kpis.active_users || 0) }, { x: 'New Users', y: Number(ExecutiveSummary.data?.data?.kpis.new_users || 0) }, { x: 'Sessions', y: Number(ExecutiveSummary.data?.data?.kpis.sessions || 0) }, { x: 'Screen Views', y: Number(ExecutiveSummary.data?.data?.kpis.screen_views || 0) }]}}",
          },
        ],
      },
    ],
    tables: [{ name: "DailyTrend", label: "Daily Executive Metrics", path: "daily_trend" }],
  },
  {
    name: "Acquisition",
    slug: "acquisition",
    queryName: "AcquisitionSummary",
    pathName: "https://sumlink-analytics-api.onrender.com/api/v1/acquisition/summary",
    kpis: [
      { key: "installs", label: "Installs" },
      { key: "installing_users", label: "Installing Users" },
      { key: "new_users", label: "New Users" },
      { key: "active_users", label: "Active Users" },
      { key: "sessions", label: "Sessions" },
      { key: "uninstalls", label: "Uninstalls" },
    ],
    charts: [
      {
        name: "GrowthVsChurnTrendChart",
        title: "Install vs App Remove Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Events", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Installs",
            data: "{{(AcquisitionSummary.data?.data?.daily_growth_churn || []).map(r => ({ x: r.date, y: Number(r.installs || 0) }))}}",
          },
          {
            name: "Uninstalls / App Remove",
            data: "{{(AcquisitionSummary.data?.data?.daily_growth_churn || []).map(r => ({ x: r.date, y: Number(r.uninstalls || 0) }))}}",
          },
        ],
      },
      {
        name: "CampaignUsersChart",
        title: "New Users by Campaign",
        type: "COLUMN_CHART",
        axis: { x: "Campaign", y: "New Users" },
        series: [
          {
            name: "New Users",
            data: "{{(AcquisitionSummary.data?.data?.campaign_performance || []).map(r => ({ x: `${r.firstUserSource} / ${r.firstUserCampaignName}`, y: Number(r.newUsers || 0) }))}}",
          },
        ],
      },
      {
        name: "TrafficSourceSessionsChart",
        title: "Traffic Source Quality: Sessions",
        type: "COLUMN_CHART",
        axis: { x: "Source / Medium", y: "Sessions" },
        series: [
          {
            name: "Sessions",
            data: `{{(AcquisitionSummary.data?.data?.traffic_sources || []).slice(0, 8).map(r => ({ x: (${shortSourceLabelJs})(r.firstUserSource, r.firstUserMedium), y: Number(r.sessions || 0) }))}}`,
          },
        ],
      },
      {
        name: "DailyUsersBySourceChart",
        title: "Daily New Users by Source",
        type: "LINE_CHART",
        axis: { x: "Date", y: "New Users", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Google / CPC",
            data: "{{(AcquisitionSummary.data?.data?.daily_source_users || []).filter(r => String(r.firstUserSource || '').toLowerCase() === 'google' && String(r.firstUserMedium || '').toLowerCase() === 'cpc').map(r => ({ x: r.date, y: Number(r.newUsers || 0) }))}}",
          },
          {
            name: "Google Play / Organic",
            data: "{{(AcquisitionSummary.data?.data?.daily_source_users || []).filter(r => String(r.firstUserSource || '').toLowerCase() === 'google-play').map(r => ({ x: r.date, y: Number(r.newUsers || 0) }))}}",
          },
          {
            name: "Direct",
            data: "{{(AcquisitionSummary.data?.data?.daily_source_users || []).filter(r => String(r.firstUserSource || '').toLowerCase() === 'direct').map(r => ({ x: r.date, y: Number(r.newUsers || 0) }))}}",
          },
        ],
      },
      {
        name: "InstallQualityTrendChart",
        title: "Install Quality: Installing Users vs Played Users",
        type: "AREA_CHART",
        axis: { x: "Date", y: "Users", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Installing Users",
            data: "{{(AcquisitionSummary.data?.data?.daily_growth_churn || []).map(r => ({ x: r.date, y: Number(r.installing_users || 0) }))}}",
          },
          {
            name: "Played Users",
            data: "{{(AcquisitionSummary.data?.data?.daily_growth_churn || []).map(r => ({ x: r.date, y: Number(r.played_users || 0) }))}}",
          },
        ],
      },
      {
        name: "CountryUsersChart",
        title: "Active Users by Country",
        type: "BAR_CHART",
        axis: { x: "Country", y: "Active Users" },
        series: [
          {
            name: "Active Users",
            data: "{{(AcquisitionSummary.data?.data?.countries || []).slice(0, 10).map(r => ({ x: r.country, y: Number(r.activeUsers || 0) }))}}",
          },
        ],
      },
      {
        name: "DeviceUsersChart",
        title: "Active Users by Device Model",
        type: "BAR_CHART",
        axis: { x: "Device", y: "Active Users" },
        series: [
          {
            name: "Active Users",
            data: "{{(AcquisitionSummary.data?.data?.devices || []).filter(r => r.mobileDeviceModel && r.mobileDeviceModel !== 'Unknown').slice(0, 12).map(r => ({ x: r.mobileDeviceModel, y: Number(r.activeUsers || 0) }))}}",
          },
        ],
      },
    ],
    tables: [
      { name: "DailyGrowthChurn", label: "Daily Acquisition, App Remove, and Never-Played Proxy", path: "daily_growth_churn" },
      { name: "CampaignPerformance", label: "Campaign Performance - New Users and Sessions", path: "campaign_performance" },
      { name: "TrafficSources", label: "Traffic Source Quality - Sessions and Engagement", path: "traffic_sources" },
      { name: "DailySourceUsers", label: "Daily New Users by Acquisition Source", path: "daily_source_users" },
      { name: "Countries", label: "Country Breakdown - Active Users", path: "countries" },
      { name: "Devices", label: "Device Model Breakdown - Active Users", path: "devices" },
    ],
  },
  {
    name: "Onboarding",
    slug: "onboarding",
    queryName: "OnboardingSummary",
    pathName: "https://sumlink-analytics-api.onrender.com/api/v1/onboarding/summary",
    kpis: [
      { key: "tutorial_started", label: "Tutorial Started" },
      { key: "tutorial_completed", label: "Tutorial Completed" },
      { key: "frustrated_users", label: "Frustrated Users" },
      { key: "user_frustration_rate_pct", label: "Frustration Rate", suffix: "%" },
      { key: "completion_pct", label: "Tutorial Completion %", suffix: "%" },
      { key: "failure_pct", label: "Tutorial Failure %", suffix: "%" },
      { key: "skip_pct", label: "Tutorial Skip %", suffix: "%" },
      { key: "average_tutorial_time", label: "Avg Tutorial Time Sec" },
      { key: "launch_to_first_step_pct", label: "Launch to Step 1 %", suffix: "%" },
      { key: "first_step_drop_off_users", label: "Step 1 Drop-off Users" },
      { key: "worst_tutorial_step", label: "Worst Tutorial Step" },
    ],
    charts: [
      {
        name: "OnboardingRealFunnelChart",
        title: "Funnel: Install to Tutorial to First Level",
        type: "CUSTOM_ECHART",
        axis: { x: "Onboarding Stage", y: "Users", labelEvery: 1, echartConfig: onboardingManagerFunnelEChart() },
        series: [
          {
            name: "Users Reached",
            data: "{{(OnboardingSummary.data?.data?.detailed_funnel || []).filter(r => Number(r.users || 0) > 0).map(r => ({ x: String(r.stage || r.event || '').replaceAll('_', ' '), y: Number(r.users || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialFunnelChart",
        title: "Tutorial Funnel: Users by Step",
        type: "BAR_CHART",
        axis: { x: "Users", y: "Tutorial Step", labelEvery: 1 },
        series: [
          {
            name: "Reached Users",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.reached_users || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialFunnelDropoffChart",
        title: "Funnel Drop-off % by Stage",
        type: "COLUMN_CHART",
        axis: { x: "Stage", y: "Drop-off %", labelEvery: 1 },
        series: [
          {
            name: "Drop-off %",
            data: "{{(OnboardingSummary.data?.data?.detailed_funnel || []).map(r => ({ x: r.stage, y: Number(r.drop_off_from_previous_pct || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialStepFunnelSankeyStyleChart",
        title: "Step Flow: Continued vs Dropped",
        type: "COLUMN_CHART",
        axis: { x: "Tutorial Step", y: "Users", labelEvery: 1 },
        series: [
          {
            name: "Continued to Next Step",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.next_step_users || 0) }))}}",
          },
          {
            name: "Dropped Off",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.drop_off_users || 0) }))}}",
          },
        ],
      },
      {
        name: "DailyTutorialCompletedByStepChart",
        title: "Daily Step Success by Tutorial Step",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Successful Users", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Step 1",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_1').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
          {
            name: "Step 2",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_2').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
          {
            name: "Step 3",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_3').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
          {
            name: "Step 4",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_4').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
          {
            name: "Step 5",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_5').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
          {
            name: "Step 6",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_6').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
          {
            name: "Step 7",
            data: "{{(OnboardingSummary.data?.data?.daily_step_completion || []).filter(r => r.step === 'tutorial_step_7').map(r => ({ x: r.date, y: Number(r.match_made_users || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialFrustrationIndexTrendChart",
        title: "Tutorial Frustration Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Frustration %", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Frustration %",
            data: "{{(OnboardingSummary.data?.data?.daily_frustration_trend || []).map(r => ({ x: r.date, y: Number(r.frustration_rate_pct || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialStepReachedDropoffChart",
        title: "Step Reach vs Drop-off Users",
        type: "COLUMN_CHART",
        axis: { x: "Step", y: "Users", labelEvery: 1 },
        series: [
          {
            name: "Reached Users",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.reached_users || 0) }))}}",
          },
          {
            name: "Drop-off Users",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.drop_off_users || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialFailureByStepChart",
        title: "Failed vs Skipped Users",
        type: "COLUMN_CHART",
        axis: { x: "Step", y: "Users", labelEvery: 1 },
        series: [
          {
            name: "Failed Users",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.failed_users || 0) }))}}",
          },
          {
            name: "Skipped Users",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.skipped_users || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialStepRateChart",
        title: "Step Rates: Complete / Fail / Skip",
        type: "COLUMN_CHART",
        axis: { x: "Step", y: "%", labelEvery: 1 },
        series: [
          {
            name: "Completion %",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.completion_pct || 0) }))}}",
          },
          {
            name: "Failure %",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.failure_pct || 0) }))}}",
          },
          {
            name: "Skip %",
            data: "{{(OnboardingSummary.data?.data?.step_analysis || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || ''))).map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(r.skip_pct || 0) }))}}",
          },
        ],
      },
      {
        name: "TutorialSkipAttemptTrendChart",
        title: "Tutorial Skip Attempt Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Attempts", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Skip Attempts",
            data: "{{(OnboardingSummary.data?.data?.skip_attempt_trend || []).map(r => ({ x: r.date, y: Number(r.skip_attempts || 0) }))}}",
          },
        ],
      },
      {
        name: "AverageTutorialTimeByStepChart",
        title: "Avg Time by Tutorial Step",
        type: "COLUMN_CHART",
        axis: { x: "Tutorial Step", y: "Seconds", labelEvery: 1 },
        series: [
          {
            name: "Average Time",
            data: "{{(() => { const rows = (OnboardingSummary.data?.data?.average_time_by_step || []).filter(r => /^tutorial_step_\\d+$/.test(String(r.step || '')) && Number(r.average_time_sec || 0) > 0).sort((a,b) => Number(String(a.step).replace('tutorial_step_', '')) - Number(String(b.step).replace('tutorial_step_', ''))); return rows.length ? rows.map(r => ({ x: String(r.step || '').replace('tutorial_step_', 'Step '), y: Number(Number(r.average_time_sec || 0).toFixed(2)) })) : [{ x: 'No time_taken data for filter', y: 0 }]; })()}}",
          },
        ],
      },
    ],
    tables: [
      { name: "DetailedOnboardingFunnel", label: "Detailed Onboarding Funnel - Users, Conversion, Drop-off", path: "detailed_funnel" },
      { name: "TutorialStepAnalysis", label: "Tutorial Step Diagnostics - Fail, Skip, Drop-off", path: "step_analysis" },
      { name: "DailyStepCompletion", label: "Daily Tutorial Completed by Step", path: "daily_step_completion" },
      { name: "TutorialRawStepEvents", label: "Raw Tutorial Event Mapping", path: "steps" },
    ],
  },
  {
    name: "Gameplay",
    slug: "gameplay",
    queryName: "GameplaySummary",
    pathName: "https://sumlink-analytics-api.onrender.com/api/v1/gameplay/summary",
    kpis: [
      { key: "level_started", label: "Level Started" },
      { key: "level_completed", label: "Level Completed" },
      { key: "hint_usage", label: "Hint Usage" },
      { key: "drop_off_pct", label: "Level Drop-off %", suffix: "%" },
    ],
    charts: [
      {
        name: "NewReturningByLevelChart",
        title: "Level Starts: New vs Returning Players",
        type: "LINE_CHART",
        axis: { x: "Level", y: "Active Users", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "New",
            data: "{{(GameplaySummary.data?.data?.new_returning_by_level || []).filter(r => String(r.level).startsWith('level_')).slice(0, 30).map(r => ({ x: r.level, y: Number(r.new || 0) }))}}",
          },
          {
            name: "Returning",
            data: "{{(GameplaySummary.data?.data?.new_returning_by_level || []).filter(r => String(r.level).startsWith('level_')).slice(0, 30).map(r => ({ x: r.level, y: Number(r.returning || 0) }))}}",
          },
        ],
      },
      {
        name: "LevelCompletionChart",
        title: "Level Completion vs Drop-off %",
        type: "COLUMN_CHART",
        axis: { x: "Level", y: "%", labelEvery: 2 },
        series: [
          {
            name: "Completion %",
            data: "{{(GameplaySummary.data?.data?.difficulty_curve || []).filter(r => String(r.level).startsWith('level_')).slice(0, 40).map(r => ({ x: r.level, y: Number(r.completion_pct || 0) }))}}",
          },
          {
            name: "Drop-off %",
            data: "{{(GameplaySummary.data?.data?.difficulty_curve || []).filter(r => String(r.level).startsWith('level_')).slice(0, 40).map(r => ({ x: r.level, y: Number(r.drop_off_pct || 0) }))}}",
          },
        ],
      },
      {
        name: "LevelStartsChart",
        title: "Level Started vs Completed",
        type: "COLUMN_CHART",
        axis: { x: "Level", y: "Users", labelEvery: 2 },
        series: [
          {
            name: "Started",
            data: "{{(GameplaySummary.data?.data?.difficulty_curve || []).filter(r => String(r.level).startsWith('level_')).slice(0, 25).map(r => ({ x: r.level, y: Number(r.started || 0) }))}}",
          },
          {
            name: "Completed",
            data: "{{(GameplaySummary.data?.data?.difficulty_curve || []).filter(r => String(r.level).startsWith('level_')).slice(0, 25).map(r => ({ x: r.level, y: Number(r.completed || 0) }))}}",
          },
        ],
      },
      {
        name: "LevelDropoffUsersChart",
        title: "Drop-off Users by Level",
        type: "BAR_CHART",
        axis: { x: "Level", y: "Drop-off Users", labelEvery: 2 },
        series: [
          {
            name: "Drop-off Users",
            data: "{{(GameplaySummary.data?.data?.level_performance || []).filter(r => String(r.level).startsWith('level_')).slice(0, 25).map(r => ({ x: r.level, y: Number(r.drop_off_users || 0) }))}}",
          },
        ],
      },
      {
        name: "HintUsageByLevelChart",
        title: "Hint Usage by Level",
        type: "COLUMN_CHART",
        axis: { x: "Level", y: "Hints", labelEvery: 2 },
        series: [
          {
            name: "Hints",
            data: "{{(GameplaySummary.data?.data?.difficulty_curve || []).filter(r => String(r.level).startsWith('level_') && Number(r.hints || 0) > 0).slice(0, 25).map(r => ({ x: r.level, y: Number(r.hints || 0) }))}}",
          },
        ],
      },
      {
        name: "HintTrendChart",
        title: "Hint Event Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Events", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Highlighted",
            data: "{{(GameplaySummary.data?.data?.hint_trend || []).map(r => ({ x: r.date, y: Number(r.highlighted || 0) }))}}",
          },
          {
            name: "Clicked",
            data: "{{(GameplaySummary.data?.data?.hint_trend || []).map(r => ({ x: r.date, y: Number(r.clicked || 0) }))}}",
          },
          {
            name: "Used Successfully",
            data: "{{(GameplaySummary.data?.data?.hint_trend || []).map(r => ({ x: r.date, y: Number(r.used_successfully || 0) }))}}",
          },
        ],
      },
      {
        name: "HintsPerCompletedUserChart",
        title: "Hint Pressure by Level",
        type: "COLUMN_CHART",
        axis: { x: "Level", y: "Hints / Completed User", labelEvery: 1 },
        series: [
          {
            name: "Hints / Completed User",
            data: "{{(GameplaySummary.data?.data?.level_performance || []).filter(r => String(r.level).startsWith('level_') && Number(r.hints_per_completed_user || 0) > 0).slice(0, 20).map(r => ({ x: r.level, y: Number(Number(r.hints_per_completed_user || 0).toFixed(2)) }))}}",
          },
        ],
      },
      {
        name: "AddRowTrendChart",
        title: "Add Row Users Over Time",
        type: "COLUMN_CHART",
        axis: { x: "Date", y: "Active Users" },
        series: [
          {
            name: "Active Users",
            data: "{{(GameplaySummary.data?.data?.add_row_trend || []).map(r => ({ x: r.date, y: Number(r.activeUsers || 0) }))}}",
          },
        ],
      },
      {
        name: "AverageTimeByLevelChart",
        title: "Avg Time by Level",
        type: "COLUMN_CHART",
        axis: { x: "Level", y: "Seconds", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Average Time",
            data: "{{(GameplaySummary.data?.data?.difficulty_curve || []).filter(r => String(r.level).startsWith('level_')).slice(0, 25).map(r => ({ x: r.level, y: Math.round(Number(r.average_time || 0)) }))}}",
          },
        ],
      },
    ],
    tables: [
      {
        name: "LevelPerformance",
        label: "Level Performance Details - Completion, Drop-off, Hints, Avg Time",
        path: "level_performance",
        data: "{{(((typeof GameplaySummary !== \"undefined\" ? GameplaySummary.data?.data : null) || appsmith.store[\"GameplaySummary_lastData\"] || {})?.level_performance || []).filter(r => String(r.level || '').startsWith('level_')).slice(0, 40).map(r => ({ Level: String(r.level || '').replace('level_', 'Level '), Started: Number(r.started || 0), Completed: Number(r.completed || 0), 'Completion %': Number(r.completion_pct || 0).toFixed(2) + '%', 'Drop-off Users': Number(r.drop_off_users || 0), 'Drop-off %': Number(r.drop_off_pct || 0).toFixed(2) + '%', Hints: Number(r.hints || 0), 'Hints / Completed User': Number(r.hints_per_completed_user || 0).toFixed(2), 'Avg Time Sec': Math.round(Number(r.average_time || 0)) }))}}",
        markdown: "{{(() => { const rows = (((typeof GameplaySummary !== \"undefined\" ? GameplaySummary.data?.data : null) || appsmith.store[\"GameplaySummary_lastData\"] || {})?.level_performance || []).filter(r => String(r.level || '').startsWith('level_')).slice(0, 25); if (!rows.length) return 'No level performance rows returned from GA4 for the selected filters.'; const fmt = n => Number(n || 0).toLocaleString(); const header='| Level | Started | Completed | Completion % | Drop-off Users | Drop-off % | Hints | Hints / Completed | Avg Time Sec |\\n|---|---:|---:|---:|---:|---:|---:|---:|---:|'; const body = rows.map(r => `| ${String(r.level || '').replace('level_', 'Level ')} | ${fmt(r.started)} | ${fmt(r.completed)} | ${Number(r.completion_pct || 0).toFixed(2)}% | ${fmt(r.drop_off_users)} | ${Number(r.drop_off_pct || 0).toFixed(2)}% | ${fmt(r.hints)} | ${Number(r.hints_per_completed_user || 0).toFixed(2)} | ${Math.round(Number(r.average_time || 0))} |`).join('\\n'); return header + '\\n' + body; })()}}",
      },
    ],
  },
  {
    name: "Retention",
    slug: "retention",
    queryName: "RetentionSummary",
    pathName: "https://sumlink-analytics-api.onrender.com/api/v1/retention/summary",
    kpis: [],
    charts: [],
    oldCharts: [
      {
        name: "RetentionDailyActivityChart",
        title: "DAU / WAU / MAU Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Users", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "DAU",
            data: "{{(RetentionSummary.data?.data?.daily_activity || []).map(r => ({ x: r.date, y: Number(r.dau || 0) }))}}",
          },
          {
            name: "WAU",
            data: "{{(RetentionSummary.data?.data?.daily_activity || []).map(r => ({ x: r.date, y: Number(r.wau || 0) }))}}",
          },
          {
            name: "MAU",
            data: "{{(RetentionSummary.data?.data?.daily_activity || []).map(r => ({ x: r.date, y: Number(r.mau || 0) }))}}",
          },
        ],
      },
      {
        name: "RetentionUserEngagementChart",
        title: "User Engagement Duration Trend",
        type: "AREA_CHART",
        axis: { x: "Date", y: "Seconds", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "User Engagement Duration",
            data: "{{(RetentionSummary.data?.data?.daily_activity || []).map(r => ({ x: r.date, y: Number(r.userEngagementDuration || 0) }))}}",
          },
        ],
      },
      {
        name: "RetentionStickinessTrendChart",
        title: "DAU / MAU Stickiness Trend",
        type: "LINE_CHART",
        axis: { x: "Date", y: "Stickiness %", showDataPointLabel: true, labelEvery: 5 },
        series: [
          {
            name: "Stickiness %",
            data: "{{(RetentionSummary.data?.data?.daily_activity || []).map(r => ({ x: r.date, y: Number(r.stickiness_pct || 0) }))}}",
          },
        ],
      },
      {
        name: "RetentionCurveChart",
        title: "Cohort Retention: Day 0 Users Returning by Day",
        type: "LINE_CHART",
        axis: { x: "Day", y: "Users", showDataPointLabel: true, labelEvery: 2 },
        series: [
          {
            name: "Active Users",
            data: "{{(RetentionSummary.data?.data?.retention_curve || []).map(r => ({ x: `Day ${r.day}`, y: Number(r.active_users || 0) }))}}",
          },
        ],
      },
      {
        name: "CohortActiveUsersChart",
        title: "Day 0 Cohort Users Active on Each Retention Day",
        type: "AREA_CHART",
        axis: { x: "Day", y: "Users" },
        series: [
          {
            name: "Active Users",
            data: "{{(RetentionSummary.data?.data?.retention_curve || []).map(r => ({ x: `Day ${r.day}`, y: Number(r.active_users || 0) }))}}",
          },
        ],
      },
      {
        name: "RetentionMilestoneChart",
        title: "Cohort Retention %: D1 / D3 / D7 / D14 / D30",
        type: "COLUMN_CHART",
        axis: { x: "Day", y: "Retention %" },
        series: [
          {
            name: "Retention %",
            data: "{{[{ x: 'Day 1', y: Number(RetentionSummary.data?.data?.kpis.day_1_retention_pct || 0) }, { x: 'Day 3', y: Number(RetentionSummary.data?.data?.kpis.day_3_retention_pct || 0) }, { x: 'Day 7', y: Number(RetentionSummary.data?.data?.kpis.day_7_retention_pct || 0) }, { x: 'Day 14', y: Number(RetentionSummary.data?.data?.kpis.day_14_retention_pct || 0) }, { x: 'Day 30', y: Number(RetentionSummary.data?.data?.kpis.day_30_retention_pct || 0) }]}}",
          },
        ],
      },
    ],
    tables: [
      {
        name: "RetentionCurve",
        label: "Manager Retention Cohort Table - Day 0 to Day 10",
        cohortTable: true,
      },
      {
        name: "RollingRetention",
        label: "Manager Rolling Retention Table - Day 1+, Day 3+, Day 7+, Day 15+",
        rollingRetentionTable: true,
      },
    ],
  },
];
const built = specs.map(makePage);

const app = {
  clientVersion: "1.9.2",
  fileFormatVersion: 1,
  serverSchemaVersion: 5,
  exportedApplication: {
    id: "64a5df3c2bc8e5f3b81f0000",
    baseId: "64a5df3c2bc8e5f3b81f0000",
    baseApplicationId: "64a5df3c2bc8e5f3b81f0000",
    userPermissions: ["manage:applications", "export:applications", "read:applications", "publish:applications", "makePublic:applications"],
    name: appName,
    isPublic: false,
    appIsExample: false,
    unreadCommentThreads: 0,
    color: "#1565C0",
    icon: "line-chart",
    appLayout: { type: "DESKTOP" },
    new: true,
    publishedDefaultPageName: "Executive Health",
    unpublishedDefaultPageName: "Executive Health",
    publishedDefaultPageId: "64a5df3c2bc8e5f3b81f0001",
    unpublishedDefaultPageId: "64a5df3c2bc8e5f3b81f0001",
    publishedDefaultBasePageId: "64a5df3c2bc8e5f3b81f0001",
    unpublishedDefaultBasePageId: "64a5df3c2bc8e5f3b81f0001",
  },
  pluginList: [
    {
      id: "restapi-plugin",
      name: "REST API",
      type: "API",
      packageName: "restapi-plugin",
    },
  ],
  datasourceList: [
    {
      name: "SumlinkAPI",
      pluginId: "restapi-plugin",
      pluginPackageName: "restapi-plugin",
      userPermissions: [],
      datasourceConfiguration: {
        url: baseUrl,
        headers: [
          {
            key: "x-api-key",
            value: "UB9c9YFakU4h8+eFZGalibxAJH+c4s2SBu0NJxux0HQ=",
          },
        ],
      },
      invalids: [],
      isValid: true,
      isConfigured: true,
    },
  ],
  actionCollectionList: [],
  customJSLibList: [],
  pageList: built.map((item) => item.page),
  publishedDefaultPageName: "Executive Health",
  unpublishedDefaultPageName: "Executive Health",
  actionList: built.map((item) => item.action),
  decryptedFields: {},
  publishedLayoutmongoEscapedWidgets: {},
  unpublishedLayoutmongoEscapedWidgets: {},
};

function stripCloudImportFields(node) {
  if (Array.isArray(node)) return node.map(stripCloudImportFields);
  if (!node || typeof node !== "object") return node;

  const clone = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "publishedPage" || key === "publishedCustomPage" || key === "publishedAction") continue;
    if (key === "actionCollectionList" || key === "customJSLibList" || key === "publishedLayoutmongoEscapedWidgets") continue;
    if (key === "decryptedFields") {
      clone[key] = {};
      continue;
    }
    clone[key] = stripCloudImportFields(value);
  }

  if (clone.pageList) {
    clone.pageList = clone.pageList.map((page) => {
      const next = {
        userPermissions: page.userPermissions || [],
        unpublishedPage: stripCloudImportFields(page.unpublishedPage),
        new: page.new ?? true,
      };
      if (page.id) next.id = page.id;
      if (page.baseId) next.baseId = page.baseId;
      if (page.basePageId) next.basePageId = page.basePageId;
      if (page.isDefault !== undefined) next.isDefault = page.isDefault;
      if (page.defaultPageId) next.defaultPageId = page.defaultPageId;
      if (page.unpublishedCustomPage) next.unpublishedCustomPage = stripCloudImportFields(page.unpublishedCustomPage);
      if (page.publishedCustomPage) next.publishedCustomPage = stripCloudImportFields(page.publishedCustomPage);
      if (page.publishedPage?.slug || page.unpublishedPage?.slug) {
        next.unpublishedPage.slug = page.unpublishedPage?.slug || page.publishedPage?.slug;
      }
      return next;
    });
  }

  if (clone.actionList) {
    clone.actionList = clone.actionList.map((action) => {
      const next = {
        pluginType: action.pluginType,
        pluginId: action.pluginId,
        unpublishedAction: stripCloudImportFields(action.unpublishedAction),
        new: action.new ?? false,
      };
      if (action.id) next.id = action.id;
      if (action.baseId) next.baseId = action.baseId;
      if (action.baseActionId) next.baseActionId = action.baseActionId;
      if (action.basePageId) next.basePageId = action.basePageId;
      if (action.publishedAction) next.publishedAction = stripCloudImportFields(action.publishedAction);
      return next;
    });
  }

  return clone;
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(app, null, 2)}\n`);

const cloudLite = {
  clientVersion: app.clientVersion,
  fileFormatVersion: app.fileFormatVersion,
  serverSchemaVersion: app.serverSchemaVersion,
  exportedApplication: {
    id: app.exportedApplication.id,
    baseId: app.exportedApplication.baseId,
    baseApplicationId: app.exportedApplication.baseApplicationId,
    userPermissions: [],
    name: app.exportedApplication.name,
    isPublic: app.exportedApplication.isPublic,
    appIsExample: app.exportedApplication.appIsExample,
    unreadCommentThreads: 0,
    color: app.exportedApplication.color,
    icon: app.exportedApplication.icon,
    appLayout: structuredClone(app.exportedApplication.appLayout),
    new: true,
    publishedDefaultPageName: app.exportedApplication.publishedDefaultPageName,
    unpublishedDefaultPageName: app.exportedApplication.unpublishedDefaultPageName,
    publishedDefaultPageId: app.exportedApplication.publishedDefaultPageId,
    unpublishedDefaultPageId: app.exportedApplication.unpublishedDefaultPageId,
    publishedDefaultBasePageId: app.exportedApplication.publishedDefaultBasePageId,
    unpublishedDefaultBasePageId: app.exportedApplication.unpublishedDefaultBasePageId,
  },
  pluginList: structuredClone(app.pluginList),
  datasourceList: structuredClone(app.datasourceList),
  pageList: app.pageList.map((page) => ({
    id: page.id,
    baseId: page.baseId,
    basePageId: page.basePageId,
    defaultPageId: page.defaultPageId,
    isDefault: page.isDefault,
    new: page.new,
    userPermissions: [],
    unpublishedPage: {
      id: page.unpublishedPage?.id,
      baseId: page.unpublishedPage?.baseId,
      basePageId: page.unpublishedPage?.basePageId,
      name: page.unpublishedPage?.name,
      slug: page.unpublishedPage?.slug,
      layouts: page.unpublishedPage?.layouts,
      userPermissions: [],
      isDefault: page.unpublishedPage?.isDefault,
    },
    unpublishedCustomPage: {
      id: page.unpublishedCustomPage?.id,
      basePageId: page.unpublishedCustomPage?.basePageId,
      name: page.unpublishedCustomPage?.name,
      isDefault: page.unpublishedCustomPage?.isDefault,
    },
  })),
  publishedDefaultPageName: app.publishedDefaultPageName,
  unpublishedDefaultPageName: app.unpublishedDefaultPageName,
  actionList: app.actionList.map((action) => ({
    id: action.id,
    baseId: action.baseId,
    baseActionId: action.baseActionId,
    basePageId: action.basePageId,
    pluginType: action.pluginType,
    pluginId: action.pluginId,
    new: action.new,
    unpublishedAction: {
      id: action.unpublishedAction?.id,
      baseId: action.unpublishedAction?.baseId,
      name: action.unpublishedAction?.name,
      pageId: action.unpublishedAction?.pageId,
      basePageId: action.unpublishedAction?.basePageId,
      pluginType: action.unpublishedAction?.pluginType,
      pluginId: action.unpublishedAction?.pluginId,
      pluginPackageName: action.unpublishedAction?.pluginPackageName,
      actionConfiguration: action.unpublishedAction?.actionConfiguration,
      executeOnLoad: action.unpublishedAction?.executeOnLoad,
      dynamicBindingPathList: action.unpublishedAction?.dynamicBindingPathList || [],
      jsonPathKeys: action.unpublishedAction?.jsonPathKeys || [],
      isValid: true,
      invalids: [],
      userPermissions: [],
    },
  })),
  actionCollectionList: [],
  customJSLibList: [],
  decryptedFields: {},
  publishedLayoutmongoEscapedWidgets: {},
  unpublishedLayoutmongoEscapedWidgets: {},
};

fs.writeFileSync(path.resolve("appsmith/sumlink-analytics-dashboard-cloud-lite.appsmith.json"), `${JSON.stringify(cloudLite, null, 2)}\n`);
console.log(outFile);
