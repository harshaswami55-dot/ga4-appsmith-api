import os
import json
from pathlib import Path
from google.cloud import bigquery
from google.oauth2 import service_account

cred_path = Path(r"C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json")

def test_bq():
    print("Testing BigQuery direct connectivity...")
    if not cred_path.exists():
        print(f"Credential file not found at {cred_path}")
        return

    credentials = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    
    # Initialize BigQuery client
    client = bigquery.Client(project="ga-biquery-analytics", credentials=credentials)
    print(f"Client project: {client.project}")

    # List datasets
    try:
        datasets = list(client.list_datasets())
        print(f"Datasets found in {client.project}: {[d.dataset_id for d in datasets]}")
    except Exception as e:
        print(f"Error listing datasets in ga-biquery-analytics: {e}")

    # Try listing datasets in default project from credential
    try:
        with open(cred_path) as f:
            cred_json = json.load(f)
        default_project = cred_json.get("project_id")
        print(f"Service Account default project: {default_project}")
        client_default = bigquery.Client(project=default_project, credentials=credentials)
        datasets_default = list(client_default.list_datasets())
        print(f"Datasets found in default project {default_project}: {[d.dataset_id for d in datasets_default]}")
    except Exception as e:
        print(f"Error listing datasets in default project: {e}")

if __name__ == "__main__":
    test_bq()
