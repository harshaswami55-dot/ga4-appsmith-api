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
      start_date: this.isoDate(StartDatePicker, "30daysAgo"),
      end_date: this.isoDate(EndDatePicker, "yesterday"),
      country: this.value(CountrySelect),
      platform: this.value(PlatformSelect),
      device_category: this.value(DeviceCategorySelect),
      device_model: this.value(DeviceModelSelect),
      os_version: this.value(OSVersionSelect),
      app_version: this.value(AppVersionSelect),
      traffic_source: this.value(TrafficSourceSelect),
      campaign: this.value(CampaignSelect),
      user_type: this.value(UserTypeSelect),
      level_number: this.value(LevelNumberSelect),
      tutorial_step: this.value(TutorialStepSelect),
    };
  },

  async refreshCurrentPage() {
    const queryByPage = {
      "Executive Dashboard": ExecutiveSummary,
      "Acquisition Dashboard": AcquisitionSummary,
      "Onboarding Dashboard": OnboardingSummary,
      "Gameplay Dashboard": GameplaySummary,
      "Retention Dashboard": RetentionSummary,
    };
    const query = queryByPage[appsmith.currentPageName];
    if (!query) {
      showAlert(`No dashboard query is mapped for ${appsmith.currentPageName}`, "warning");
      return;
    }
    await ApiRunner.run(query);
  },
};
