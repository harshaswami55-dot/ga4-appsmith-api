import json
from pathlib import Path

ROOT = Path(r"d:\XORSTACK\Sumlink dashboard appsmith")
BASE_URL = "https://sumlink-analytics-api.onrender.com"
API_KEY = "UB9c9YFakU4h8+eFZGalibxAJH+c4s2SBu0NJxux0HQ="

FILES = [
    ROOT / "appsmith" / "sumlink-analytics-dashboard.appsmith.json",
    ROOT / "appsmith" / "sumlink-analytics-dashboard-cloud-import.appsmith.json",
]

REST_PLUGIN_ID = "restapi-plugin"
REST_PACKAGE_NAME = "restapi-plugin"

PAGE_ID_MAP = {
    "Executive Health": "64a5df3c2bc8e5f3b81f0001",
    "Acquisition": "64a5df3c2bc8e5f3b81f0002",
    "Onboarding": "64a5df3c2bc8e5f3b81f0003",
    "Gameplay": "64a5df3c2bc8e5f3b81f0004",
    "Retention": "64a5df3c2bc8e5f3b81f0005",
}

ACTION_PAGE_MAP = {
    "ExecutiveSummary": "Executive Health",
    "AcquisitionSummary": "Acquisition",
    "OnboardingSummary": "Onboarding",
    "GameplaySummary": "Gameplay",
    "RetentionSummary": "Retention",
}

ENDPOINT_MAP = {
    "ExecutiveSummary": "/api/v1/executive/summary",
    "AcquisitionSummary": "/api/v1/acquisition/summary",
    "OnboardingSummary": "/api/v1/onboarding/summary",
    "GameplaySummary": "/api/v1/gameplay/summary",
    "RetentionSummary": "/api/v1/retention/summary",
}

def patch_all(filepath):
    if not filepath.exists():
        print(f"File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Top-level DTO arrays
    data["pluginList"] = [
        {
            "id": REST_PLUGIN_ID,
            "name": "REST API",
            "type": "API",
            "packageName": REST_PACKAGE_NAME
        }
    ]
    data["actionCollectionList"] = []
    data["customJSLibList"] = []
    data["decryptedFields"] = {}
    data["publishedDefaultPageName"] = "Executive Health"
    data["unpublishedDefaultPageName"] = "Executive Health"

    # 2. Exported Application
    exp_app = data.get("exportedApplication", {})
    exp_app["publishedDefaultPageName"] = "Executive Health"
    exp_app["unpublishedDefaultPageName"] = "Executive Health"
    exp_app["publishedDefaultPageId"] = PAGE_ID_MAP["Executive Health"]
    exp_app["unpublishedDefaultPageId"] = PAGE_ID_MAP["Executive Health"]

    # 3. Datasource List
    data["datasourceList"] = [
        {
            "name": "SumlinkAPI",
            "pluginId": REST_PLUGIN_ID,
            "pluginPackageName": REST_PACKAGE_NAME,
            "datasourceConfiguration": {
                "url": BASE_URL,
                "headers": [
                    {
                        "key": "x-api-key",
                        "value": API_KEY
                    }
                ]
            },
            "invalids": [],
            "isValid": True,
            "isConfigured": True
        }
    ]

    # 4. Page List with basePageId & IDs
    if "pageList" in data and isinstance(data["pageList"], list):
        for page in data["pageList"]:
            p_name = page.get("unpublishedPage", {}).get("name") or page.get("publishedPage", {}).get("name")
            p_id = PAGE_ID_MAP.get(p_name, "64a5df3c2bc8e5f3b81f0001")

            page["id"] = p_id
            page["baseId"] = p_id

            for p_key in ["unpublishedPage", "publishedPage"]:
                if p_key in page and isinstance(page[p_key], dict):
                    p_obj = page[p_key]
                    p_obj["id"] = p_id
                    p_obj["baseId"] = p_id
                    p_obj["basePageId"] = p_id
                    p_obj["isDefault"] = (p_name == "Executive Health")

    # 5. Action List with endpoints, headers, pluginPackageName, and basePageId
    if "actionList" in data and isinstance(data["actionList"], list):
        for action in data["actionList"]:
            a_name = action.get("unpublishedAction", {}).get("name") or action.get("publishedAction", {}).get("name") or action.get("name")
            target_pname = ACTION_PAGE_MAP.get(a_name, "Executive Health")
            target_pid = PAGE_ID_MAP.get(target_pname, "64a5df3c2bc8e5f3b81f0001")
            endpoint = ENDPOINT_MAP.get(a_name, "/api/v1/executive/summary")
            full_url = f"{BASE_URL}{endpoint}"

            action["pluginId"] = REST_PLUGIN_ID
            action["pluginPackageName"] = REST_PACKAGE_NAME
            action["pluginType"] = "API"

            for act_key in ["unpublishedAction", "publishedAction"]:
                if act_key in action and isinstance(action[act_key], dict):
                    act = action[act_key]
                    act["pluginId"] = REST_PLUGIN_ID
                    act["pluginPackageName"] = REST_PACKAGE_NAME
                    act["pluginType"] = "API"
                    act["pageId"] = target_pname
                    act["basePageId"] = target_pid

                    if "actionConfiguration" not in act:
                        act["actionConfiguration"] = {}
                    config = act["actionConfiguration"]
                    config["path"] = endpoint
                    config["url"] = full_url
                    config["headers"] = [{"key": "x-api-key", "value": API_KEY}]
                    config["httpMethod"] = "GET"

                    if "datasource" in act and isinstance(act["datasource"], dict):
                        ds = act["datasource"]
                        ds["pluginId"] = REST_PLUGIN_ID
                        ds["pluginPackageName"] = REST_PACKAGE_NAME
                        ds["name"] = "SumlinkAPI"
                        ds["datasourceConfiguration"] = {
                            "url": BASE_URL,
                            "headers": [
                                {
                                    "key": "x-api-key",
                                    "value": API_KEY
                                }
                            ]
                        }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Successfully processed all Appsmith schema fields for: {filepath}")

if __name__ == "__main__":
    for f in FILES:
        patch_all(f)
