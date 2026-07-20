import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const provided = req.get("x-api-key") || "";
  const expected = config.apiKey;
  const valid = expected.length > 0 && provided.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!valid) return res.status(401).json({ error: "Missing or invalid x-api-key" });
  return next();
}

