const { getGA4Client } = require("../ga4Client");
const { reportOptions, exactFilter, inListFilter, andFilters, pagination } = require("../utils/filters");

const EVENTS = {
  install: "first_open",
  uninstall: "app_remove",
  tutorialStep: "tutorial_step",
  tutorialMatchMade: "tutorial_match_made",
  tutorialFailed: "tutorial_match_failed",
  tutorialCompleted: "tutorial_completed",
  tutorialSkipped: "tutorial_skipped",
  tutorialSkipAttempt: "tutorial_skip_attempt",
  levelStart: "level_start",
  levelComplete: "level_complete",
  hintHighlighted: "hint_button_highlighted",
  hintClicked: "hint_button_clicked",
  hintUsed: "hint_used_successfully",
};

const LEVEL_DIMENSION = "customEvent:level_number";
const STEP_DIMENSION = "customEvent:step_number";
const AVERAGE_TIME_METRIC = "averageCustomEvent:time_taken";

const percent = (part, total) => total ? Number(((part / total) * 100).toFixed(2)) : 0;
const first = (report) => report.rows[0] || {};

function metadata(query, reports = []) {
  const { startDate, endDate } = reportOptions(query);
  return {
    propertyId: process.env.GA4_PROPERTY_ID || "516899630",
    startDate,
    endDate,
    filters: {
      appVersion: query.appVersion || null,
      osVersion: query.osVersion || null,
      deviceModel: query.deviceModel || null,
      newReturning: query.newReturning || null,
    },
    cached: reports.length > 0 && reports.every((report) => report.cached),
  };
}

async function eventReport(client, options, eventNames, dimensions = ["eventName"], metrics = ["eventCount"]) {
  return client.runReport({
    ...options,
    dimensions,
    metrics,
    dimensionFilter: inListFilter("eventName", eventNames),
    limit: 10000,
  });
}

async function runAllPages(client, request, batchSize = 250) {
  const rows = [];
  let offset = 0;
  let rowCount = 0;
  const reports = [];
  do {
    const report = await client.runReport({ ...request, limit: batchSize, offset });
    reports.push(report);
    rows.push(...report.rows);
    rowCount = report.rowCount;
    offset += batchSize;
  } while (offset < rowCount);
  return { rows, rowCount, cached: reports.every((report) => report.cached), pages: reports.length };
}

function pivotByDate(rows, eventNames) {
  const dates = new Map();
  for (const row of rows) {
    if (!dates.has(row.date)) dates.set(row.date, { date: row.date });
    dates.get(row.date)[row.eventName] = row.eventCount || row.totalUsers || 0;
  }
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)).map((row) => {
    for (const name of eventNames) if (row[name] == null) row[name] = 0;
    return row;
  });
}

async function executiveHealth(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const [summary, daily, users] = await Promise.all([
    client.runReport({ ...options, metrics: ["activeUsers", "newUsers", "engagementRate"] }),
    client.runReport({ ...options, dimensions: ["date"], metrics: ["activeUsers", "active28DayUsers"], limit: 1000 }),
    client.runReport({ ...options, dimensions: ["newVsReturning"], metrics: ["activeUsers"] }),
  ]);
  const kpi = first(summary);
  const stickinessValues = daily.rows.map((row) => percent(row.activeUsers, row.active28DayUsers));
  const returningUsers = users.rows.find((row) => row.newVsReturning === "returning")?.activeUsers || 0;
  return {
    kpis: {
      activeUsers: kpi.activeUsers || 0,
      newUsers: kpi.newUsers || 0,
      avgDailyStickinessPct: stickinessValues.length ? Number((stickinessValues.reduce((a, b) => a + b, 0) / stickinessValues.length).toFixed(2)) : 0,
      engagementRatePct: Number(((kpi.engagementRate || 0) * 100).toFixed(2)),
      observedChurnPct: Number((100 - percent(returningUsers, kpi.activeUsers || 0)).toFixed(2)),
    },
    dailyStickiness: daily.rows.map((row) => ({ ...row, stickinessPct: percent(row.activeUsers, row.active28DayUsers) })),
    definitions: { observedChurnPct: "100% minus the returning-user share; GA4 has no direct uninstall/churn metric" },
    meta: metadata(query, [summary, daily, users]),
  };
}

async function acquisitionChurn(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const [events, channels] = await Promise.all([
    eventReport(client, options, [EVENTS.install, EVENTS.uninstall], ["date", "eventName"]),
    client.runReport({
      ...options,
      dimensions: ["sessionDefaultChannelGroup"],
      metrics: ["engagementRate", "sessions", "engagedSessions"],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 250,
    }),
  ]);
  const trend = pivotByDate(events.rows, [EVENTS.install, EVENTS.uninstall]).map((row) => ({
    date: row.date, installs: row[EVENTS.install], uninstalls: row[EVENTS.uninstall],
  }));
  return {
    installsVsUninstalls: trend,
    trafficSourceQuality: channels.rows.map((row) => ({ ...row, engagementRatePct: Number((row.engagementRate * 100).toFixed(2)) })),
    notes: { uninstalls: "app_remove was not observed; zero is shown. GA4 does not guarantee uninstall measurement." },
    meta: metadata(query, [events, channels]),
  };
}

async function onboardingFunnel(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const names = [EVENTS.install, EVENTS.tutorialStep, EVENTS.tutorialMatchMade, EVENTS.levelStart];
  const report = await eventReport(client, options, names, ["eventName"], ["eventCount"]);
  const values = new Map(report.rows.map((row) => [row.eventName, row.eventCount]));
  return {
    funnel: names.map((eventName, index) => ({ step: index + 1, eventName, eventCount: values.get(eventName) || 0 })),
    meta: metadata(query, [report]),
  };
}

async function tutorialFrustration(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const names = [EVENTS.tutorialStep, EVENTS.tutorialFailed];
  const [summary, daily] = await Promise.all([
    eventReport(client, options, names, ["eventName"], ["eventCount", "totalUsers"]),
    eventReport(client, options, names, ["date", "eventName"], ["eventCount"]),
  ]);
  const map = new Map(summary.rows.map((row) => [row.eventName, row]));
  const started = map.get(EVENTS.tutorialStep) || {};
  const failed = map.get(EVENTS.tutorialFailed) || {};
  const trend = pivotByDate(daily.rows, names).map((row) => ({
    date: row.date,
    tutorialStarted: row[EVENTS.tutorialStep],
    failures: row[EVENTS.tutorialFailed],
    frustrationIndexPct: percent(row[EVENTS.tutorialFailed], row[EVENTS.tutorialStep]),
  }));
  return {
    kpis: {
      frustratedUsers: failed.totalUsers || 0,
      frustrationRatePct: percent(failed.totalUsers || 0, started.totalUsers || 0),
      tutorialStarted: started.totalUsers || 0,
    },
    frustrationTrend: trend,
    meta: metadata(query, [summary, daily]),
  };
}

async function gameplayBalancing(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const hints = [EVENTS.hintHighlighted, EVENTS.hintClicked, EVENTS.hintUsed];
  const [players, hintReport] = await Promise.all([
    client.runReport({
      ...options,
      dimensions: [LEVEL_DIMENSION, "newVsReturning"],
      metrics: ["totalUsers", "eventCount"],
      dimensionFilter: exactFilter("eventName", EVENTS.levelStart),
      limit: 10000,
    }),
    eventReport(client, options, hints, [LEVEL_DIMENSION, "eventName"], ["eventCount"]),
  ]);
  const levelHints = new Map();
  for (const row of hintReport.rows) {
    const level = row[LEVEL_DIMENSION] || "unknown";
    if (!levelHints.has(level)) levelHints.set(level, { levelNumber: level, highlighted: 0, clicked: 0, used: 0 });
    const item = levelHints.get(level);
    if (row.eventName === EVENTS.hintHighlighted) item.highlighted = row.eventCount;
    if (row.eventName === EVENTS.hintClicked) item.clicked = row.eventCount;
    if (row.eventName === EVENTS.hintUsed) item.used = row.eventCount;
  }
  return {
    newVsReturningByLevel: players.rows.map((row) => ({ levelNumber: row[LEVEL_DIMENSION], userType: row.newVsReturning, users: row.totalUsers, starts: row.eventCount })),
    hintUsageByLevel: [...levelHints.values()].sort(levelSort),
    meta: metadata(query, [players, hintReport]),
  };
}

function levelSort(a, b) {
  const left = Number(a.levelNumber); const right = Number(b.levelNumber);
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  return String(a.levelNumber).localeCompare(String(b.levelNumber));
}

async function levelDifficulty(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const pageOptions = pagination(query);
  const report = await runAllPages(client, {
    ...options,
    dimensions: [LEVEL_DIMENSION, "eventName"],
    metrics: ["eventCount", "totalUsers"],
    dimensionFilter: inListFilter("eventName", [EVENTS.levelStart, EVENTS.levelComplete]),
    orderBys: [{ dimension: { dimensionName: LEVEL_DIMENSION, orderType: "NUMERIC" } }],
  });
  const levels = new Map();
  for (const row of report.rows) {
    const key = row[LEVEL_DIMENSION] || "unknown";
    if (!levels.has(key)) levels.set(key, { levelNumber: key, started: 0, completed: 0, startedUsers: 0, completedUsers: 0 });
    const level = levels.get(key);
    if (row.eventName === EVENTS.levelStart) {
      level.started = row.eventCount; level.startedUsers = row.totalUsers;
    } else {
      level.completed = row.eventCount; level.completedUsers = row.totalUsers;
    }
  }
  const allLevels = [...levels.values()].sort(levelSort).map((level) => ({
    ...level,
    completionPct: percent(level.completed, level.started),
    dropOffUsers: Math.max(level.startedUsers - level.completedUsers, 0),
    dropOffPct: percent(Math.max(level.started - level.completed, 0), level.started),
  }));
  const start = pageOptions.offset;
  return {
    table: allLevels.slice(start, start + pageOptions.pageSize),
    difficultyCurve: allLevels,
    pagination: { ...pageOptions, totalRows: allLevels.length, totalPages: Math.ceil(allLevels.length / pageOptions.pageSize), ga4PagesFetched: report.pages },
    notes: { dropOffUsers: "Started users minus completed users; exact user-level exclusion requires BigQuery." },
    meta: metadata(query, [report]),
  };
}

async function retention(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const [summary, types, engagement, sessions] = await Promise.all([
    client.runReport({ ...options, metrics: ["newUsers", "engagedSessions", "activeUsers", "sessions"] }),
    client.runReport({ ...options, dimensions: ["date", "newVsReturning"], metrics: ["activeUsers"], limit: 10000 }),
    client.runReport({ ...options, dimensions: ["date"], metrics: ["userEngagementDuration", "engagedSessions"], limit: 1000 }),
    client.runReport({ ...options, dimensions: ["date"], metrics: ["sessions"], limit: 1000 }),
  ]);
  return {
    kpis: first(summary),
    newVsReturningTrend: types.rows,
    engagementOverTime: engagement.rows,
    sessionsOverTime: sessions.rows,
    meta: metadata(query, [summary, types, engagement, sessions]),
  };
}

async function dauMau(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const report = await client.runReport({ ...options, dimensions: ["date"], metrics: ["activeUsers", "active28DayUsers"], limit: 1000 });
  return {
    trend: report.rows.map((row) => ({ date: row.date, dau: row.activeUsers, mau28: row.active28DayUsers, stickinessPct: percent(row.activeUsers, row.active28DayUsers) })),
    meta: metadata(query, [report]),
  };
}

async function tutorialSkip(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const names = [EVENTS.tutorialStep, EVENTS.tutorialSkipped, EVENTS.tutorialSkipAttempt];
  const [events, duration] = await Promise.all([
    eventReport(client, options, names, ["date", "eventName"], ["eventCount"]),
    client.runReport({
      ...options,
      dimensions: ["date", STEP_DIMENSION],
      metrics: [AVERAGE_TIME_METRIC],
      dimensionFilter: exactFilter("eventName", EVENTS.tutorialStep),
      limit: 10000,
    }),
  ]);
  const trend = pivotByDate(events.rows, names).map((row) => ({
    date: row.date,
    started: row[EVENTS.tutorialStep],
    skipped: row[EVENTS.tutorialSkipped],
    skipAttempts: row[EVENTS.tutorialSkipAttempt],
    skipPct: percent(row[EVENTS.tutorialSkipped], row[EVENTS.tutorialStep]),
  }));
  return { skipTrend: trend, averageTimePerStep: duration.rows, meta: metadata(query, [events, duration]) };
}

async function neverPlayed(query, client = getGA4Client()) {
  const options = reportOptions(query);
  const report = await eventReport(client, options, [EVENTS.install, EVENTS.levelStart], ["date", "eventName"], ["totalUsers"]);
  const trend = pivotByDate(report.rows, [EVENTS.install, EVENTS.levelStart]).map((row) => ({
    date: row.date,
    installedUsers: row[EVENTS.install],
    playedUsers: row[EVENTS.levelStart],
    neverPlayedProxy: Math.max(row[EVENTS.install] - row[EVENTS.levelStart], 0),
  }));
  return {
    trend,
    notes: { neverPlayedProxy: "Daily installing users minus daily level-starting users; exact user exclusion requires BigQuery." },
    meta: metadata(query, [report]),
  };
}

module.exports = {
  EVENTS,
  executiveHealth,
  acquisitionChurn,
  onboardingFunnel,
  tutorialFrustration,
  gameplayBalancing,
  levelDifficulty,
  retention,
  dauMau,
  tutorialSkip,
  neverPlayed,
  runAllPages,
};

