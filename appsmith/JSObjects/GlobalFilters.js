export default {
  value(widget, fallback = "") {
    return widget?.selectedOptionValue ?? widget?.text ?? fallback;
  },

  isoDate(widget, fallback) {
    const value = widget?.selectedDate;
    return value ? moment(value).format("YYYY-MM-DD") : fallback;
  },

  params() {
    return {
      startDate: this.isoDate(StartDatePicker, "30daysAgo"),
      endDate: this.isoDate(EndDatePicker, "yesterday"),
      appVersion: this.value(AppVersionSelect),
      osVersion: this.value(OSVersionSelect),
      deviceModel: this.value(DeviceModelSelect),
      newReturning: this.value(NewReturningSelect),
    };
  },

  async refreshCurrentPage() {
    const queryByPage = {
      "Executive Health": getExecutiveHealth,
      "Acquisition & Churn": getAcquisitionChurn,
      "Onboarding Health": getOnboardingFunnel,
      "Core Gameplay & Balancing": getGameplayBalancing,
      "Level Difficulty": getLevelDifficulty,
      "Retention Dashboard": getRetention,
      "DAU MAU": getDauMau,
      "Tutorial Diagnostics": getTutorialSkip,
    };
    const query = queryByPage[appsmith.currentPageName];
    if (!query) {
      showAlert(`No dashboard query is mapped for ${appsmith.currentPageName}`, "warning");
      return;
    }
    await ApiRunner.run(query);
  },

  async refreshAll() {
    return Promise.all([
      getExecutiveHealth,
      getAcquisitionChurn,
      getOnboardingFunnel,
      getTutorialFrustration,
      getGameplayBalancing,
      getLevelDifficulty,
      getRetention,
      getDauMau,
      getTutorialSkip,
      getNeverPlayed,
    ].map((query) => ApiRunner.run(query)));
  },
};
