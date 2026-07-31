import json
import re

def clean_content(text):
    # Replacements for damaged arrow/dash sequences
    replacements = {
        '\ufffd': '-',
        'â€”': '-',
        'â€': '-',
        '—': '-',
        '–': '-',
        '→': '->',
        '…': '...',
        '“': '"',
        '”': '"',
        '‘': "'",
        '’': "'",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    # Convert any remaining non-ASCII characters to ASCII hyphens
    clean_chars = []
    for char in text:
        if ord(char) < 128:
            clean_chars.append(char)
        else:
            clean_chars.append('-')
            
    return "".join(clean_chars)

def process_file(file_path):
    print(f"Processing {file_path}...")
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    cleaned = clean_content(content)
    
    # Validate JSON syntax
    try:
        json.loads(cleaned)
        print(f"  Valid JSON verified for {file_path}")
    except Exception as e:
        print(f"  ERROR parsing JSON for {file_path}: {e}")
        return

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(cleaned)
    print(f"  Successfully cleaned and saved {file_path}")

if __name__ == "__main__":
    process_file('appsmith/sumlink-analytics-dashboard.appsmith.json')
    process_file('appsmith/sumlink-analytics-dashboard-cloud-import.appsmith.json')
