import { Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";
import { config } from "../config";

export const responseCache = new NodeCache({ stdTTL: config.cacheTtlSeconds, checkperiod: 60, useClones: false });

export function cacheResponse(req: Request, res: Response, next: NextFunction) {
  const key = `${req.path}?${new URLSearchParams(req.query as Record<string, string>).toString()}`;
  const cached = responseCache.get(key);
  if (cached !== undefined) return res.json(cached);
  const send = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) responseCache.set(key, body);
    return send(body);
  }) as typeof res.json;
  return next();
}

