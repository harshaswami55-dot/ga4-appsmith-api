import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

export function errorHandler(error: Error | HttpError, req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof HttpError ? error.statusCode : 500;
  req.log?.error({ err: error }, "request failed");
  const message = status >= 500 ? "Analytics query failed" : error.message;
  res.status(status).json({ error: message });
}

