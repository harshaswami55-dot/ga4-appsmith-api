import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "appsmith", "sumlink-analytics-dashboard-cloud-fixed.json");
const outputPath = path.join(ROOT, "appsmith", "sumlink-one-page-import-test.json");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

const pageName = "Executive Health";
const page = clone(source.pageList.find((item) => item.unpublishedPage?.name === pageName));
const actions = clone(
  source.actionList.filter((item) => item.unpublishedAction?.pageId === pageName),
);

const app = clone(source.exportedApplication);
app.name = "Sumlink Import Test";
app.slug = "sumlink-import-test";
app.pages = [];
app.publishedDefaultPageName = pageName;
app.unpublishedDefaultPageName = pageName;
app.publishedDefaultPageId = page.publishedPage?.basePageId ?? page.unpublishedPage?.basePageId;
app.unpublishedDefaultPageId = page.unpublishedPage?.basePageId;

const onePageImport = {
  artifactJsonType: "APPLICATION",
  clientSchemaVersion: source.clientSchemaVersion,
  serverSchemaVersion: source.serverSchemaVersion,
  exportedApplication: app,
  datasourceList: clone(source.datasourceList),
  customJSLibList: clone(source.customJSLibList ?? []),
  pageList: [page],
  actionList: actions,
  actionCollectionList: [],
  editModeTheme: clone(source.editModeTheme),
  publishedTheme: clone(source.publishedTheme),
};

fs.writeFileSync(outputPath, `${JSON.stringify(onePageImport, null, 2)}\n`);

console.log(`Created ${outputPath}`);
console.log(`Size: ${fs.statSync(outputPath).size}`);
console.log(`Pages: ${onePageImport.pageList.length}`);
console.log(`Actions: ${onePageImport.actionList.length}`);
console.log(`Default: ${onePageImport.exportedApplication.unpublishedDefaultPageId}`);
