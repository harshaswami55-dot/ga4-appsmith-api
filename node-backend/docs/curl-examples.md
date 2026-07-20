# Curl examples

Set variables once:

```bash
BASE_URL="https://sumlink-analytics-api.onrender.com"
API_KEY="your-render-api-key"
FILTERS="startDate=30daysAgo&endDate=yesterday&appVersion=&osVersion=&deviceModel=&newReturning="
```

Every analytics request requires `x-api-key`:

```bash
curl "$BASE_URL/health"
curl -H "x-api-key: $API_KEY" "$BASE_URL/ready"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/executive-health?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/acquisition-churn?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/onboarding-funnel?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/tutorial-frustration?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/gameplay-balancing?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/level-difficulty?$FILTERS&page=1&pageSize=20"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/retention?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/dau-mau?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/tutorial-skip?$FILTERS"
curl -H "x-api-key: $API_KEY" "$BASE_URL/api/never-played?$FILTERS"
```

