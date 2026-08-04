import subprocess
import json

js_script = """
const appId = "6a5df3c2bc8e5f3b81feb820";
const app = db.application.findOne({_id: ObjectId(appId)});
const pages = db.newPage.find({applicationId: appId}).toArray();
const actions = db.newAction.find({applicationId: appId}).toArray();

const exportData = {
  clientVersion: "1.9.2",
  fileFormatVersion: 1,
  serverSchemaVersion: 5,
  exportedApplication: {
    name: app.name,
    isPublic: app.isPublic || false,
    appIsExample: false,
    unreadCommentThreads: 0,
    color: app.color || "#1565C0",
    icon: app.icon || "line-chart",
    appLayout: app.appLayout || { type: "DESKTOP" },
    publishedDefaultPageName: "Executive Health",
    unpublishedDefaultPageName: "Executive Health"
  },
  pluginList: [
    {
      id: "restapi-plugin",
      name: "restapi-plugin",
      type: "API",
      packageName: "restapi-plugin"
    }
  ],
  datasourceList: [
    {
      name: "SumlinkAPI",
      pluginId: "restapi-plugin",
      pluginPackageName: "restapi-plugin",
      datasourceConfiguration: {
        url: "https://sumlink-analytics-api.onrender.com",
        headers: [{ key: "x-api-key", value: "sumlink-dashboard-key-2026" }]
      },
      invalids: [],
      isValid: true,
      isConfigured: true
    }
  ],
  pageList: pages.map(p => {
    delete p._id;
    delete p.applicationId;
    return p;
  }),
  actionList: actions.map(a => {
    delete a._id;
    delete a.applicationId;
    if (a.unpublishedAction) {
      a.unpublishedAction.pluginId = "restapi-plugin";
      if (a.unpublishedAction.datasource) {
        a.unpublishedAction.datasource.pluginId = "restapi-plugin";
        a.unpublishedAction.datasource.pluginPackageName = "restapi-plugin";
      }
    }
    return a;
  }),
  actionCollectionList: [],
  customJSLibList: [],
  decryptedFields: {},
  publishedDefaultPageName: "Executive Health",
  unpublishedDefaultPageName: "Executive Health"
};

print(JSON.stringify(exportData));
"""

res = subprocess.run([
    "docker", "exec", "-i", "sumlink-appsmith",
    "mongosh", "mongodb://appsmith:0DXXIYRsPBrVy@localhost:27017/appsmith",
    "--quiet"
], input=js_script.encode('utf-8'), capture_output=True)

if res.returncode == 0 and res.stdout:
    output_text = res.stdout.decode('utf-8', errors='ignore').strip()
    start_idx = output_text.find('{')
    end_idx = output_text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = output_text[start_idx:end_idx+1]
        data = json.loads(json_str)
        print("SUCCESS: Extracted full database records for Sumlink Dashboard!")
        print("Pages count:", len(data.get("pageList", [])))
        print("Actions count:", len(data.get("actionList", [])))
        
        with open(r"C:\Users\harsh\Downloads\sumlink-analytics-dashboard.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        with open(r"d:\XORSTACK\Sumlink dashboard appsmith\appsmith\sumlink-analytics-dashboard.appsmith.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("Saved directly to Downloads and project repository.")
    else:
        print("Raw output:", output_text)

else:
    print("Error:", res.stderr.decode('utf-8', errors='ignore') if res.stderr else "Unknown error")

