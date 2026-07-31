import os
import json
from pathlib import Path

ROOT = Path(r"d:\XORSTACK\Sumlink dashboard appsmith")
BASE_URL = "https://sumlink-analytics-api.onrender.com"
API_KEY = "UB9c9YFakU4h8+eFZGalibxAJH+c4s2SBu0NJxux0HQ="

ENDPOINT_MAP = {
    "ExecutiveSummary": "/api/v1/executive/summary",
    "AcquisitionSummary": "/api/v1/acquisition/summary",
    "OnboardingSummary": "/api/v1/onboarding/summary",
    "GameplaySummary": "/api/v1/gameplay/summary",
    "RetentionSummary": "/api/v1/retention/summary",
}

FILES = [
    ROOT / "appsmith" / "sumlink-analytics-dashboard.appsmith.json",
    ROOT / "appsmith" / "sumlink-analytics-dashboard-cloud-import.appsmith.json",
    ROOT / "sumlink-analytics-dashboard.appsmith.json",
]

def patch_action(action):
    name = action.get("unpublishedAction", {}).get("name") or action.get("publishedAction", {}).get("name") or action.get("name")
    endpoint = ENDPOINT_MAP.get(name)
    if not endpoint:
        return

    full_url = f"{BASE_URL}{endpoint}"
    headers = [{"key": "x-api-key", "value": API_KEY}]

    for act_key in ["unpublishedAction", "publishedAction"]:
        if act_key in action and isinstance(action[act_key], dict):
            act = action[act_key]
            if "actionConfiguration" not in act:
                act["actionConfiguration"] = {}
            config = act["actionConfiguration"]
            config["path"] = endpoint
            config["url"] = full_url
            config["headers"] = headers
            config["httpMethod"] = "GET"
            if "datasource" in act and isinstance(act["datasource"], dict):
                act["datasource"]["datasourceConfiguration"] = {
                    "url": BASE_URL,
                    "headers": headers
                }

def process_file(path):
    if not path.exists():
        print(f"File not found: {path}")
        return
    
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Patch root actionList
    if "actionList" in data and isinstance(data["actionList"], list):
        for action in data["actionList"]:
            patch_action(action)

    # Recursive walk for any embedded action objects
    def walk(node):
        if isinstance(node, dict):
            if "actionConfiguration" in node:
                node["actionConfiguration"]["headers"] = [{"key": "x-api-key", "value": API_KEY}]
            for k, v in node.items():
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(data)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Successfully patched: {path}")

if __name__ == "__main__":
    for f in FILES:
        process_file(f)
