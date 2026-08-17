const fs = require("fs");
const { MongoClient } = require("/opt/appsmith/rts/node_modules/mongodb");

const APP_ID = process.env.APPSMITH_APP_ID || "6a5df3c2bc8e5f3b81feb820";
const IMPORT_PATH = process.env.APPSMITH_IMPORT_PATH || "/tmp/sumlink-analytics-dashboard.appsmith.json";

function actionName(action) {
  return action.unpublishedAction?.name || action.publishedAction?.name || action.name;
}

function pageName(page) {
  return page.unpublishedPage?.name || page.publishedPage?.name || page.name;
}

function rewriteOnLoad(layout, actionIdByName) {
  const groups = Array.isArray(layout.layoutOnLoadActions) ? layout.layoutOnLoadActions : [];
  return groups.map((group) =>
    (Array.isArray(group) ? group : []).map((entry) => ({
      ...entry,
      id: actionIdByName.get(entry.name) || entry.id,
    })),
  );
}

function normalizeLayout(layout) {
  const next = { ...layout };
  next.layoutOnLoadActions = Array.isArray(next.layoutOnLoadActions) ? next.layoutOnLoadActions : [];
  next.layoutOnLoadActionErrors = Array.isArray(next.layoutOnLoadActionErrors) ? next.layoutOnLoadActionErrors : [];
  next.dynamicBindingPathList = Array.isArray(next.dynamicBindingPathList) ? next.dynamicBindingPathList : [];
  next.widgetNames = Array.isArray(next.widgetNames) ? next.widgetNames : [];
  next.deleted = false;
  return next;
}

async function main() {
  const user = process.env.APPSMITH_MONGODB_USER || "appsmith";
  const password = process.env.APPSMITH_MONGODB_PASSWORD || "";
  const uri = process.env.APPSMITH_DB_URL
    || `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:27017/appsmith?authSource=appsmith`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("appsmith");

  const imported = JSON.parse(fs.readFileSync(IMPORT_PATH, "utf8"));
  const pagesInImport = imported.pageList || imported.pages || [];
  const actionsInImport = imported.actionList || imported.actions || [];
  const importedPageNameById = new Map();
  for (const importedPage of pagesInImport) {
    const name = pageName(importedPage);
    const candidateIds = [
      importedPage.id,
      importedPage.baseId,
      importedPage.basePageId,
      importedPage.unpublishedPage?.id,
      importedPage.unpublishedPage?.baseId,
      importedPage.unpublishedPage?.basePageId,
      importedPage.publishedPage?.id,
      importedPage.publishedPage?.baseId,
      importedPage.publishedPage?.basePageId,
    ].filter(Boolean);
    for (const id of candidateIds) {
      importedPageNameById.set(String(id), name);
    }
  }

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
    const importedPageRef = importedAction.unpublishedAction?.pageId || importedAction.publishedAction?.pageId;
    const importedPageName = importedPageNameById.get(String(importedPageRef)) || importedPageRef;
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

    const unpublishedLayouts = (importedPage.unpublishedPage?.layouts || []).map((layout) => normalizeLayout({
      ...layout,
      id: existing.unpublishedPage?.layouts?.[0]?.id || layout.id,
      layoutOnLoadActions: rewriteOnLoad(layout, actionIdByName),
      validOnPageLoadActions: true,
      layoutOnLoadActionErrors: [],
    }));
    const publishedLayouts = (importedPage.publishedPage?.layouts || importedPage.unpublishedPage?.layouts || []).map((layout) => normalizeLayout({
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
          id: String(existing._id),
          baseId: String(existing._id),
          basePageId: String(existing._id),
          "unpublishedPage.id": String(existing._id),
          "publishedPage.id": String(existing._id),
          "unpublishedPage.baseId": String(existing._id),
          "publishedPage.baseId": String(existing._id),
          "unpublishedPage.basePageId": String(existing._id),
          "publishedPage.basePageId": String(existing._id),
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
