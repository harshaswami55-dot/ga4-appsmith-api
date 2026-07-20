const express = require("express");
const analytics = require("../services/analyticsService");

const router = express.Router();

function endpoint(handler) {
  return async (req, res, next) => {
    try {
      res.json(await handler(req.query));
    } catch (error) {
      next(error);
    }
  };
}

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

module.exports = router;

