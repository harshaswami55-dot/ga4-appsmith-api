import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "appsmith", "sumlink-analytics-dashboard-restored.appsmith.json");
const outputPath = path.join(ROOT, "appsmith", "sumlink-analytics-dashboard-cloud-fixed.json");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const stripCloudUnsafeFields = (value) => {
  if (Array.isArray(value)) return value.map(stripCloudUnsafeFields);
  if (!value || typeof value !== "object") return value;

  const cleaned = {};
  for (const [key, child] of Object.entries(value)) {
    if (
      key === "userPermissions" ||
      key === "policies" ||
      key === "policyMap" ||
      key === "userPermissionsForCreate"
    ) {
      continue;
    }
    cleaned[key] = stripCloudUnsafeFields(child);
  }
  return cleaned;
};

const pages = stripCloudUnsafeFields(source.pageList ?? []);
const actions = stripCloudUnsafeFields(source.actionList ?? []);
const datasources = stripCloudUnsafeFields(source.datasourceList ?? []);
const actionCollections = stripCloudUnsafeFields(source.actionCollectionList ?? []);
const customJSLibs = stripCloudUnsafeFields(source.customJSLibList ?? []);

const defaultUnpublishedPage = pages.find(
  (page) => page.unpublishedPage?.name === source.unpublishedDefaultPageName,
)?.unpublishedPage;
const defaultPublishedPage = pages.find(
  (page) => page.publishedPage?.name === source.publishedDefaultPageName,
)?.publishedPage;

const exportedApplication = stripCloudUnsafeFields({
  ...source.exportedApplication,
  name: "Sumlink Analytics Dashboard",
  isPublic: false,
  appIsExample: false,
  unreadCommentThreads: 0,
  color: "#1565C0",
  icon: "line-chart",
  slug: "sumlink-analytics-dashboard",
  pages: pages.map((page) => ({
    id: page.id ?? page.unpublishedPage?.basePageId,
    baseId: page.baseId ?? page.unpublishedPage?.basePageId,
    basePageId: page.unpublishedPage?.basePageId,
    name: page.unpublishedPage?.name ?? page.publishedPage?.name,
    slug: (page.unpublishedPage?.name ?? page.publishedPage?.name ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  })),
  viewMode: false,
  unpublishedApplicationDetail: {
    themeSetting: {
      sizing: 1,
      density: 1,
      appMaxWidth: "LARGE",
    },
  },
  unpublishedCustomJSLibs: customJSLibs.map((lib) => ({
    uidString: lib.uidString ?? lib.name ?? lib.url,
  })).filter((lib) => lib.uidString),
  publishedCustomJSLibs: [],
  applicationVersion: 1,
  isManualUpdate: false,
  deleted: false,
  publishedDefaultPageName: source.publishedDefaultPageName,
  unpublishedDefaultPageName: source.unpublishedDefaultPageName,
  publishedDefaultPageId: defaultPublishedPage?.basePageId ?? defaultPublishedPage?.id,
  unpublishedDefaultPageId: defaultUnpublishedPage?.basePageId ?? defaultUnpublishedPage?.id,
});

const cloudExport = {
  artifactJsonType: "APPLICATION",
  clientSchemaVersion: 2,
  serverSchemaVersion: 12,
  exportedApplication,
  datasourceList: datasources,
  customJSLibList: customJSLibs,
  pageList: pages,
  actionList: actions,
  actionCollectionList: actionCollections,
  editModeTheme: {
    name: "Classic",
    displayName: "Classic",
    properties: {
      colors: {
        primaryColor: "#553DE9",
        backgroundColor: "#F8FAFC",
      },
      borderRadius: {
        appBorderRadius: "0px",
      },
    },
  },
  publishedTheme: {
    name: "Classic",
    displayName: "Classic",
    properties: {
      colors: {
        primaryColor: "#553DE9",
        backgroundColor: "#F8FAFC",
      },
      borderRadius: {
        appBorderRadius: "0px",
      },
    },
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(cloudExport, null, 2)}\n`);

console.log(`Created ${outputPath}`);
console.log(`Pages: ${cloudExport.pageList.length}`);
console.log(`Actions: ${cloudExport.actionList.length}`);
console.log(`Datasources: ${cloudExport.datasourceList.length}`);
console.log(`Default page: ${cloudExport.exportedApplication.unpublishedDefaultPageId}`);
