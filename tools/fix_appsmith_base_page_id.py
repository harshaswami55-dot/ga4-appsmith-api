import json
from pathlib import Path

ROOT = Path(r"d:\XORSTACK\Sumlink dashboard appsmith")

FILES = [
    ROOT / "appsmith" / "sumlink-analytics-dashboard.appsmith.json",
    ROOT / "appsmith" / "sumlink-analytics-dashboard-cloud-import.appsmith.json",
]

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

def patch_base_page_ids(filepath):
    if not filepath.exists():
        print(f"File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Update exportedApplication default page fields
    exp_app = data.get("exportedApplication", {})
    exp_app["publishedDefaultPageName"] = "Executive Health"
    exp_app["unpublishedDefaultPageName"] = "Executive Health"
    exp_app["publishedDefaultPageId"] = PAGE_ID_MAP["Executive Health"]
    exp_app["unpublishedDefaultPageId"] = PAGE_ID_MAP["Executive Health"]

    data["publishedDefaultPageName"] = "Executive Health"
    data["unpublishedDefaultPageName"] = "Executive Health"

    # 2. Patch pageList
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

    # 3. Patch actionList
    if "actionList" in data and isinstance(data["actionList"], list):
        for action in data["actionList"]:
            a_name = action.get("unpublishedAction", {}).get("name") or action.get("publishedAction", {}).get("name") or action.get("name")
            target_pname = ACTION_PAGE_MAP.get(a_name, "Executive Health")
            target_pid = PAGE_ID_MAP.get(target_pname, "64a5df3c2bc8e5f3b81f0001")

            for act_key in ["unpublishedAction", "publishedAction"]:
                if act_key in action and isinstance(action[act_key], dict):
                    act = action[act_key]
                    act["pageId"] = target_pname
                    act["basePageId"] = target_pid

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Successfully injected basePageId and IDs in: {filepath}")

if __name__ == "__main__":
    for f in FILES:
        patch_base_page_ids(f)
