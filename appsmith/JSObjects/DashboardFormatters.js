export default {
  integer(value) {
    return Number(value || 0).toLocaleString();
  },

  percent(value) {
    return `${Number(value || 0).toFixed(2)}%`;
  },

  seconds(value) {
    if (value === null || value === undefined) return "Not configured";
    const seconds = Number(value || 0);
    if (seconds < 60) return `${seconds.toFixed(1)} sec`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  },

  chartSeries(rows, xKey, yKey) {
    return [{
      seriesName: yKey,
      data: (rows || []).map((row) => ({ x: row[xKey], y: Number(row[yKey] || 0) })),
    }];
  },
};

