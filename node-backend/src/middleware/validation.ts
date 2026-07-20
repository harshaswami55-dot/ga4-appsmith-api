import { Request, Response, NextFunction } from "express";
import { analyticsQuerySchema } from "../utils/filters";

export function validateAnalyticsQuery(req: Request, res: Response, next: NextFunction) {
  const parsed = analyticsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
  }
  res.locals.analyticsQuery = parsed.data;
  return next();
}

