const { MongoClient } = require("/opt/appsmith/rts/node_modules/mongodb");

async function main() {
  const user = process.env.APPSMITH_MONGODB_USER || "appsmith";
  const password = process.env.APPSMITH_MONGODB_PASSWORD || "";
  const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith?authSource=appsmith`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("appsmith");
  const applicationId = process.env.APPSMITH_APP_ID || "6a5df3c2bc8e5f3b81feb820";

  for (const pageName of ["Acquisition", "Onboarding", "Gameplay"]) {
    const page = await db.collection("newPage").findOne({
      applicationId,
      "unpublishedPage.name": pageName,
      deleted: { $ne: true },
    });
    const dsl = JSON.stringify(page?.unpublishedPage?.layouts?.[0]?.dsl || {});
    console.log(JSON.stringify({
      pageName,
      hasBadInstalledNotPlayed: dsl.includes("Installed but Not Played Users"),
      hasManagerFunnel: dsl.includes("Manager Funnel"),
      hasAverageTimeSec: dsl.includes("average_time_sec"),
      hasLevelPerformanceTable: dsl.includes("LevelPerformanceTable"),
      hasCurrentRowLevelBinding: dsl.includes('currentRow["level"]'),
      dslLength: dsl.length,
    }));
  }
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
