const fs = require("fs");
const { MongoClient, ObjectId } = require("/opt/appsmith/rts/node_modules/mongodb");

const APP_ID = process.env.APPSMITH_APP_ID || "6a5df3c2bc8e5f3b81feb820";
const IMPORT_PATH = process.env.APPSMITH_IMPORT_PATH || "/tmp/sumlink-analytics-dashboard.appsmith.json";

function actionName(action) {
  return action.unpublishedAction?.name || action.publishedAction?.name || action.name;
}

function pageName(page) {
  return page.unpublishedPage?.name || page.publishedPage?.name || page.name;
}

function rewriteOnLoad(layout, actionIdByName) {
  const groups = layout.layoutOnLoadActions || [];
  return groups.map((group) =>
    group.map((entry) => ({
      ...entry,
      id: actionIdByName.get(entry.name) || entry.id,
    })),
  );
}

async function main() {
  const user = process.env.APPSMITH_MONGODB_USER || "appsmith";
  const password = process.env.APPSMITH_MONGODB_PASSWORD || "";
  const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith?authSource=appsmith`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("appsmith");

  const imported = JSON.parse(fs.readFileSync(IMPORT_PATH, "utf8"));
  const pagesInImport = imported.pageList || imported.pages || [];
  const actionsInImport = imported.actionList || imported.actions || [];

  const realPages = await db.collection("newPage")
    .find({ applicationId: APP_ID, deleted: { $ne: true } })
    .toArray();
  const pageByName = new Map(realPages.map((page) => [page.unpublishedPage?.name || page.publishedPage?.name, page]));

  const realActions = await db.collection("newAction")
    .find({ applicationId: APP_ID, deleted: { $ne: true } })
    .toArray();
  const actionByName = new Map(realActions.map((action) => [action.unpublishedAction?.name || action.publishedAction?.name, action]));
  const actionIdByName = new Map(realActions.map((action) => [action.unpublishedAction?.name || action.publishedAction?.name, String(action._id)]));

  for (const importedAction of actionsInImport) {
    const name = actionName(importedAction);
    const existing = actionByName.get(name);
    if (!existing) {
      console.log("SKIP_ACTION_MISSING", name);
      continue;
    }
    const importedPageName = importedAction.unpublishedAction?.pageId || importedAction.publishedAction?.pageId;
    const page = pageByName.get(importedPageName);
    if (!page) {
      console.log("SKIP_ACTION_PAGE_MISSING", name, importedPageName);
      continue;
    }

    const update = {
      pluginType: importedAction.pluginType || "API",
      pluginId: importedAction.pluginId || existing.pluginId,
      updatedAt: new Date(),
      "unpublishedAction.name": name,
      "publishedAction.name": name,
      "unpublishedAction.pageId": String(page._id),
      "publishedAction.pageId": String(page._id),
      "unpublishedAction.executeOnLoad": true,
      "publishedAction.executeOnLoad": true,
      "unpublishedAction.actionConfiguration": importedAction.unpublishedAction.actionConfiguration,
      "publishedAction.actionConfiguration": importedAction.publishedAction?.actionConfiguration || importedAction.unpublishedAction.actionConfiguration,
      "unpublishedAction.dynamicBindingPathList": importedAction.unpublishedAction.dynamicBindingPathList || [],
      "publishedAction.dynamicBindingPathList": importedAction.publishedAction?.dynamicBindingPathList || importedAction.unpublishedAction.dynamicBindingPathList || [],
      "unpublishedAction.jsonPathKeys": importedAction.unpublishedAction.jsonPathKeys || [],
      "publishedAction.jsonPathKeys": importedAction.publishedAction?.jsonPathKeys || importedAction.unpublishedAction.jsonPathKeys || [],
      "unpublishedAction.isValid": true,
      "publishedAction.isValid": true,
      "unpublishedAction.invalids": [],
      "publishedAction.invalids": [],
    };
    await db.collection("newAction").updateOne({ _id: existing._id }, { $set: update });
    console.log("UPDATED_ACTION", name, String(existing._id));
  }

  for (const importedPage of pagesInImport) {
    const name = pageName(importedPage);
    const existing = pageByName.get(name);
    if (!existing) {
      console.log("SKIP_PAGE_MISSING", name);
      continue;
    }

    const unpublishedLayouts = (importedPage.unpublishedPage?.layouts || []).map((layout) => ({
      ...layout,
      id: existing.unpublishedPage?.layouts?.[0]?.id || layout.id,
      layoutOnLoadActions: rewriteOnLoad(layout, actionIdByName),
      validOnPageLoadActions: true,
      layoutOnLoadActionErrors: [],
    }));
    const publishedLayouts = (importedPage.publishedPage?.layouts || importedPage.unpublishedPage?.layouts || []).map((layout) => ({
      ...layout,
      id: existing.publishedPage?.layouts?.[0]?.id || layout.id,
      layoutOnLoadActions: rewriteOnLoad(layout, actionIdByName),
      validOnPageLoadActions: true,
      layoutOnLoadActionErrors: [],
    }));

    await db.collection("newPage").updateOne(
      { _id: existing._id },
      {
        $set: {
          updatedAt: new Date(),
          id: importedPage.id || existing.id,
          baseId: importedPage.baseId || importedPage.unpublishedPage?.baseId || existing.baseId,
          basePageId: importedPage.basePageId || importedPage.unpublishedPage?.basePageId || existing.basePageId,
          "unpublishedPage.id": importedPage.unpublishedPage?.id || existing.unpublishedPage?.id,
          "publishedPage.id": importedPage.publishedPage?.id || importedPage.unpublishedPage?.id || existing.publishedPage?.id,
          "unpublishedPage.baseId": importedPage.unpublishedPage?.baseId || importedPage.baseId || existing.unpublishedPage?.baseId,
          "publishedPage.baseId": importedPage.publishedPage?.baseId || importedPage.unpublishedPage?.baseId || existing.publishedPage?.baseId,
          "unpublishedPage.basePageId": importedPage.unpublishedPage?.basePageId || importedPage.basePageId || existing.unpublishedPage?.basePageId,
          "publishedPage.basePageId": importedPage.publishedPage?.basePageId || importedPage.unpublishedPage?.basePageId || existing.publishedPage?.basePageId,
          "unpublishedPage.name": name,
          "publishedPage.name": name,
          "unpublishedPage.slug": importedPage.unpublishedPage?.slug,
          "publishedPage.slug": importedPage.publishedPage?.slug || importedPage.unpublishedPage?.slug,
          "unpublishedPage.layouts": unpublishedLayouts,
          "publishedPage.layouts": publishedLayouts,
        },
      },
    );
    console.log("UPDATED_PAGE", name, String(existing._id));
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
