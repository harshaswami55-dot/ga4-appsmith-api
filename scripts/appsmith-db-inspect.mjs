const { MongoClient } = require("/opt/appsmith/rts/node_modules/mongodb");

async function main() {
  const user = process.env.APPSMITH_MONGODB_USER || "appsmith";
  const password = process.env.APPSMITH_MONGODB_PASSWORD || "";
  const candidates = [
    `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith?authSource=admin`,
    `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith?authSource=appsmith`,
    `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith`,
    "mongodb://localhost:27017/appsmith",
  ];
  let client;
  for (const uri of candidates) {
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      console.log("CONNECTED", uri.replace(password, "***"));
      break;
    } catch (error) {
      console.log("FAILED", uri.replace(password, "***"), error.message);
      client = null;
    }
  }
  if (!client) throw new Error("Could not connect to MongoDB");
  const db = client.db("appsmith");
  const collections = await db.listCollections().toArray();
  console.log(JSON.stringify(collections.map((c) => c.name).sort(), null, 2));
  for (const name of ["application", "newPage", "newAction", "datasource"]) {
    const count = await db.collection(name).countDocuments().catch(() => null);
    console.log("COUNT", name, count);
  }
  const app = await db.collection("application").findOne({ _id: "6a5df3c2bc8e5f3b81feb820" });
  console.log("APP", app && { _id: app._id, name: app.name, deleted: app.deleted });
  const pages = await db.collection("newPage").find({ applicationId: "6a5df3c2bc8e5f3b81feb820", deleted: { $ne: true } }).project({ _id: 1, "unpublishedPage.name": 1, "publishedPage.name": 1, layouts: 1 }).toArray();
  console.log("PAGES", JSON.stringify(pages.map((p) => ({ id: p._id, unpublished: p.unpublishedPage?.name, published: p.publishedPage?.name, layouts: p.layouts?.length })), null, 2));
  const actions = await db.collection("newAction").find({ applicationId: "6a5df3c2bc8e5f3b81feb820", deleted: { $ne: true } }).project({ _id: 1, "unpublishedAction.name": 1, "publishedAction.name": 1, "unpublishedAction.pageId": 1, "actionConfiguration.path": 1 }).toArray();
  console.log("ACTIONS", JSON.stringify(actions.map((a) => ({ id: a._id, name: a.unpublishedAction?.name || a.publishedAction?.name, pageId: a.unpublishedAction?.pageId, path: a.unpublishedAction?.actionConfiguration?.path })), null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
