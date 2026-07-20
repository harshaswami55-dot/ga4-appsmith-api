import { Router, Request, Response, NextFunction } from "express";
import * as analytics from "../services/analyticsService";
import { AnalyticsQuery } from "../utils/filters";

const router = Router();
const endpoint = (handler: (query: AnalyticsQuery) => Promise<unknown>) => async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await handler(res.locals.analyticsQuery)); } catch (error) { next(error); }
};

router.get("/executive-health", endpoint(analytics.executiveHealth));
router.get("/acquisition-churn", endpoint(analytics.acquisitionChurn));
router.get("/onboarding-funnel", endpoint(analytics.onboardingFunnel));
router.get("/tutorial-frustration", endpoint(analytics.tutorialFrustration));
router.get("/gameplay-balancing", endpoint(analytics.gameplayBalancing));
router.get("/level-difficulty", endpoint(analytics.levelDifficulty));
router.get("/retention", endpoint(analytics.retention));
router.get("/dau-mau", endpoint(analytics.dauMau));
router.get("/tutorial-skip", endpoint(analytics.tutorialSkip));
router.get("/never-played", endpoint(analytics.neverPlayed));

export default router;

