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

def patch_appsmith_json(filepath):
    if not filepath.exists():
        print(f"File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Ensure datasourceList has SumlinkAPI with restapi-plugin
    datasource_entry = {
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
    data["datasourceList"] = [datasource_entry]

    # 2. Patch actionList
    if "actionList" in data and isinstance(data["actionList"], list):
        for action in data["actionList"]:
            action["pluginId"] = REST_PLUGIN_ID
            action["pluginPackageName"] = REST_PACKAGE_NAME

            for act_key in ["unpublishedAction", "publishedAction"]:
                if act_key in action and isinstance(action[act_key], dict):
                    act = action[act_key]
                    act["pluginId"] = REST_PLUGIN_ID
                    act["pluginPackageName"] = REST_PACKAGE_NAME

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

    # 3. Recursive replacement for any remaining old pluginId
    def walk_replace(node):
        if isinstance(node, dict):
            if "pluginId" in node and (node["pluginId"] == "6a5ddaad9403d7ed01a7986d" or not node["pluginId"]):
                node["pluginId"] = REST_PLUGIN_ID
                node["pluginPackageName"] = REST_PACKAGE_NAME
            for v in node.values():
                walk_replace(v)
        elif isinstance(node, list):
            for item in node:
                walk_replace(item)

    walk_replace(data)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Successfully fixed plugin IDs and datasources in: {filepath}")

if __name__ == "__main__":
    for f in FILES:
        patch_appsmith_json(f)
