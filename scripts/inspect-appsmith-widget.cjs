const { MongoClient } = require("/opt/appsmith/rts/node_modules/mongodb");

function findWidget(node, widgetName) {
  if (!node) return null;
  if (node.widgetName === widgetName) return node;
  for (const child of node.children || []) {
    const found = findWidget(child, widgetName);
    if (found) return found;
  }
  return null;
}

async function main() {
  const user = process.env.APPSMITH_MONGODB_USER || "appsmith";
  const password = process.env.APPSMITH_MONGODB_PASSWORD || "";
  const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith?authSource=appsmith`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("appsmith");
  const applicationId = process.env.APPSMITH_APP_ID || "6a5df3c2bc8e5f3b81feb820";
  const page = await db.collection("newPage").findOne({
    applicationId,
    "unpublishedPage.name": "Gameplay",
    deleted: { $ne: true },
  });
  const widget = findWidget(page?.unpublishedPage?.layouts?.[0]?.dsl, "LevelPerformanceTable");
  console.log(JSON.stringify({
    widgetName: widget?.widgetName,
    type: widget?.type,
    tableData: widget?.tableData,
    dynamicBindingPathList: widget?.dynamicBindingPathList,
    primaryColumns: widget?.primaryColumns,
  }, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
