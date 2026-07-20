import { z } from "zod";

const dateValue = z.string().regex(/^(today|yesterday|\d+daysAgo|\d{4}-\d{2}-\d{2})$/, "Use YYYY-MM-DD, today, yesterday, or NdaysAgo");
const optionalText = z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).max(200).optional());

function resolveDate(value: string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (value === "today") return today;
  if (value === "yesterday") return new Date(today.getTime() - 86_400_000);
  const relative = value.match(/^(\d+)daysAgo$/);
  if (relative) return new Date(today.getTime() - Number(relative[1]) * 86_400_000);
  return new Date(`${value}T00:00:00Z`);
}

export const analyticsQuerySchema = z.object({
  startDate: dateValue.default("30daysAgo"),
  endDate: dateValue.default("yesterday"),
  appVersion: optionalText,
  osVersion: optionalText,
  deviceModel: optionalText,
  newReturning: z.preprocess((value) => value === "" ? undefined : value, z.enum(["new", "returning"]).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
}).superRefine((value, context) => {
  if (resolveDate(value.startDate) > resolveDate(value.endDate)) {
    context.addIssue({ code: "custom", path: ["startDate"], message: "startDate must not be after endDate" });
  }
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export function exactFilter(fieldName: string, value: unknown): any {
  return { filter: { fieldName, stringFilter: { matchType: "EXACT", value: String(value), caseSensitive: false } } };
}

export function inListFilter(fieldName: string, values: string[]): any {
  return { filter: { fieldName, inListFilter: { values, caseSensitive: true } } };
}

export function andFilters(...filters: any[]): any | undefined {
  const expressions = filters.filter(Boolean);
  if (!expressions.length) return undefined;
  if (expressions.length === 1) return expressions[0];
  return { andGroup: { expressions } };
}

export function buildCommonFilter(query: AnalyticsQuery): any | undefined {
  return andFilters(
    query.appVersion && exactFilter("appVersion", query.appVersion),
    query.osVersion && exactFilter("operatingSystemVersion", query.osVersion),
    query.deviceModel && exactFilter("mobileDeviceModel", query.deviceModel),
    query.newReturning && exactFilter("newVsReturning", query.newReturning),
  );
}

export function reportOptions(query: AnalyticsQuery) {
  return { startDate: query.startDate, endDate: query.endDate, commonFilter: buildCommonFilter(query) };
}

export function pagination(query: AnalyticsQuery) {
  return { page: query.page, pageSize: query.pageSize, offset: (query.page - 1) * query.pageSize };
}
