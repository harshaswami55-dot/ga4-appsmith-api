import os
import json
from pathlib import Path
from google.cloud import bigquery
from google.oauth2 import service_account

cred_path = Path(r"C:\Users\harsh\credentials\phrasal-clover-493807-m9-4019d33cb4de.json")

def validate_bq():
    print("=" * 65)
    print("DIRECT BIGQUERY DATA VALIDATION (ga-biquery-analytics.analytics_516899630)")
    print("=" * 65)

    credentials = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    client = bigquery.Client(project="ga-biquery-analytics", credentials=credentials)

    # 1. Query total tables / events count
    query_tables = """
    SELECT table_id, row_count, TIMESTAMP_MILLIS(creation_time) AS created_at
    FROM `ga-biquery-analytics.analytics_516899630.__TABLES__`
    ORDER BY table_id DESC
    LIMIT 10
    """
    print("\n[1] BigQuery Event Export Tables Found:")
    try:
        tables = list(client.query(query_tables).result())
        for t in tables:
            print(f"  - Table: {t.table_id} | Rows: {t.row_count} | Created: {t.created_at}")
    except Exception as e:
        print(f"  Error querying __TABLES__: {e}")

    # 2. Query BigQuery Rolling Retention
    query_retention = """
    WITH events AS (
      SELECT
        user_pseudo_id,
        PARSE_DATE('%Y%m%d', event_date) AS activity_date,
        MIN(PARSE_DATE('%Y%m%d', event_date)) OVER(PARTITION BY user_pseudo_id) AS cohort_date
      FROM `ga-biquery-analytics.analytics_516899630.events_*`
      WHERE _TABLE_SUFFIX BETWEEN '20260717' AND '20260730'
    ),
    cohorts AS (
      SELECT
        cohort_date,
        COUNT(DISTINCT user_pseudo_id) AS users,
        COUNT(DISTINCT IF(DATE_DIFF(activity_date, cohort_date, DAY) >= 1, user_pseudo_id, NULL)) AS day_1_plus,
        COUNT(DISTINCT IF(DATE_DIFF(activity_date, cohort_date, DAY) >= 3, user_pseudo_id, NULL)) AS day_3_plus,
        COUNT(DISTINCT IF(DATE_DIFF(activity_date, cohort_date, DAY) >= 7, user_pseudo_id, NULL)) AS day_7_plus
      FROM events
      GROUP BY cohort_date
    )
    SELECT * FROM cohorts ORDER BY cohort_date
    """
    print("\n[2] BigQuery Exact Rolling Retention Query Output:")
    try:
        results = list(client.query(query_retention).result())
        print(f"  {'Cohort Date':<15} {'Users':<10} {'Day 1+':<10} {'Day 3+':<10} {'Day 7+':<10}")
        print("  " + "-" * 55)
        tot_users, tot_d1, tot_d3, tot_d7 = 0, 0, 0, 0
        for r in results:
            tot_users += r.users
            tot_d1 += r.day_1_plus
            tot_d3 += r.day_3_plus
            tot_d7 += r.day_7_plus
            print(f"  {str(r.cohort_date):<15} {r.users:<10} {r.day_1_plus:<10} {r.day_3_plus:<10} {r.day_7_plus:<10}")
        print("  " + "-" * 55)
        d1_pct = round((tot_d1 / tot_users) * 100, 1) if tot_users else 0
        d3_pct = round((tot_d3 / tot_users) * 100, 1) if tot_users else 0
        d7_pct = round((tot_d7 / tot_users) * 100, 1) if tot_users else 0
        print(f"  {'All Users Summary':<15} {tot_users:<10} {tot_d1:<10} {tot_d3:<10} {tot_d7:<10}")
        print(f"  {'Retention %':<15} {'100%':<10} {f'{d1_pct}%':<10} {f'{d3_pct}%':<10} {f'{d7_pct}%':<10}")
    except Exception as e:
        print(f"  BigQuery Query execution error: {e}")

    print("\n" + "=" * 65)

if __name__ == "__main__":
    validate_bq()
