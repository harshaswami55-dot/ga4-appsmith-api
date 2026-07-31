import json

def clean_fallbacks(file_path):
    print(f"Cleaning fallbacks in {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace unicode replacement characters in JS return statements
    cleaned = content.replace('return "\\ufffd"', 'return "-"')
    cleaned = cleaned.replace('return "\\u00fd"', 'return "-"')
    cleaned = cleaned.replace('return ""', 'return "-"')
    cleaned = cleaned.replace('return "â€”"', 'return "-"')

    try:
        json.loads(cleaned)
        print(f"  Successfully parsed JSON after fallback cleanup for {file_path}")
    except Exception as e:
        print(f"  Error parsing JSON: {e}")
        return

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(cleaned)

if __name__ == "__main__":
    clean_fallbacks('appsmith/sumlink-analytics-dashboard.appsmith.json')
    clean_fallbacks('appsmith/sumlink-analytics-dashboard-cloud-import.appsmith.json')
