const DATE_PATTERN = /^(today|yesterday|\d+daysAgo|\d{4}-\d{2}-\d{2})$/;

function exactFilter(fieldName, value) {
  return {
    filter: {
      fieldName,
      stringFilter: { matchType: "EXACT", value: String(value), caseSensitive: false },
    },
  };
}

function inListFilter(fieldName, values) {
  return {
    filter: { fieldName, inListFilter: { values, caseSensitive: true } },
  };
}

function andFilters(...filters) {
  const expressions = filters.filter(Boolean);
  if (!expressions.length) return undefined;
  if (expressions.length === 1) return expressions[0];
  return { andGroup: { expressions } };
}

function buildCommonFilter(query = {}) {
  return andFilters(
    query.appVersion && exactFilter("appVersion", query.appVersion),
    query.osVersion && exactFilter("operatingSystemVersion", query.osVersion),
    query.deviceModel && exactFilter("mobileDeviceModel", query.deviceModel),
    query.newReturning && exactFilter("newVsReturning", query.newReturning),
  );
}

function reportOptions(query = {}) {
  const startDate = query.startDate || "30daysAgo";
  const endDate = query.endDate || "yesterday";
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    const error = new Error("Dates must use YYYY-MM-DD, today, yesterday, or NdaysAgo");
    error.statusCode = 400;
    throw error;
  }
  return { startDate, endDate, commonFilter: buildCommonFilter(query) };
}

function pagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page || "1", 10));
  const pageSize = Math.min(200, Math.max(1, Number.parseInt(query.pageSize || "50", 10)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = {
  exactFilter,
  inListFilter,
  andFilters,
  buildCommonFilter,
  reportOptions,
  pagination,
};

