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

def patch_dto(filepath):
    if not filepath.exists():
        print(f"File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Add required top-level DTO arrays to prevent NullPointerException (Error: null)
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

    if "datasourceList" not in data or not data["datasourceList"]:
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

    # Ensure actionList items have all fields
    if "actionList" in data and isinstance(data["actionList"], list):
        for action in data["actionList"]:
            action["pluginId"] = REST_PLUGIN_ID
            action["pluginPackageName"] = REST_PACKAGE_NAME
            if "pluginType" not in action:
                action["pluginType"] = "API"

            for act_key in ["unpublishedAction", "publishedAction"]:
                if act_key in action and isinstance(action[act_key], dict):
                    act = action[act_key]
                    act["pluginId"] = REST_PLUGIN_ID
                    act["pluginPackageName"] = REST_PACKAGE_NAME
                    act["pluginType"] = "API"

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
    print(f"Successfully patched DTO fields in: {filepath}")

if __name__ == "__main__":
    for f in FILES:
        patch_dto(f)
