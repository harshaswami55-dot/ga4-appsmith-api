import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parents[1]
backend_dir = root_dir / "backend"
sys.path.insert(0, str(backend_dir))

from app.config import get_settings
from app.schemas.filters import DashboardFilters
from app.services.bigquery_retention_service import BigQueryRetentionService

def validate_bq():
    settings = get_settings()
    project_id = settings.bigquery_project_id or "ga-biquery-analytics"
    dataset = settings.bigquery_dataset or "analytics_516899630"
    print("=" * 65)
    print(f"DIRECT BIGQUERY DATA VALIDATION ({project_id}.{dataset})")
    print("=" * 65)

    client = BigQueryRetentionService(settings)._build_client()

    # 1. Query total tables / events count
    query_tables = f"""
    SELECT table_id, row_count, TIMESTAMP_MILLIS(creation_time) AS created_at
    FROM `{project_id}.{dataset}.__TABLES__`
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

    # 2. Query the same exact rolling-retention logic used by the backend.
    print("\n[2] BigQuery Exact Rolling Retention Query Output:")
    try:
        service = BigQueryRetentionService(settings, client=client)
        filters = DashboardFilters()
        results = service.rolling_retention_table(filters)
        print(f"  {'Cohort':<15} {'Users':<10} {'D1+':<10} {'D3+':<10} {'D7+':<10} {'D15+':<10} {'Method'}")
        print("  " + "-" * 95)
        for r in results:
            print(
                f"  {r['cohort']:<15} {r['users']:<10} "
                f"{r['rolling_day_1_pct']!s:<10} {r['rolling_day_3_pct']!s:<10} "
                f"{r['rolling_day_7_pct']!s:<10} {r['rolling_day_15_pct']!s:<10} "
                f"{r['method']}"
            )
    except Exception as e:
        print(f"  BigQuery Query execution error: {e}")

    print("\n" + "=" * 65)

if __name__ == "__main__":
    validate_bq()
