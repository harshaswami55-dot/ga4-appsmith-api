import subprocess

js_script = """
const appId = "6a5df3c2bc8e5f3b81feb820";
const renderUrl = "https://sumlink-analytics-api.onrender.com";
const apiKey = "sumlink-dashboard-key-2026";

const endpointMap = {
  "ExecutiveSummary": "/api/v1/executive/summary",
  "AcquisitionSummary": "/api/v1/acquisition/summary",
  "OnboardingSummary": "/api/v1/onboarding/summary",
  "GameplaySummary": "/api/v1/gameplay/summary",
  "RetentionSummary": "/api/v1/retention/summary"
};

db.newAction.find({applicationId: appId}).forEach(act => {
  let u = act.unpublishedAction;
  if (u && endpointMap[u.name]) {
    const ep = endpointMap[u.name];
    if (!u.actionConfiguration) u.actionConfiguration = {};
    u.actionConfiguration.url = renderUrl + ep;
    u.actionConfiguration.path = ep;
    u.actionConfiguration.headers = [{key: "x-api-key", value: apiKey}];
    u.actionConfiguration.httpMethod = "GET";

    if (u.datasource) {
      u.datasource.datasourceConfiguration = {
        url: renderUrl,
        headers: [{key: "x-api-key", value: apiKey}]
      };
    }
    db.newAction.replaceOne({_id: act._id}, act);
  }
});

print("SUCCESS: Updated all local MongoDB Appsmith actions to point to live Render backend!");
"""

res = subprocess.run([
    "docker", "exec", "-i", "sumlink-appsmith",
    "mongosh", "mongodb://appsmith:0DXXIYRsPBrVy@localhost:27017/appsmith",
    "--quiet"
], input=js_script.encode("utf-8"), capture_output=True)

print(res.stdout.decode("utf-8", errors="ignore"))
