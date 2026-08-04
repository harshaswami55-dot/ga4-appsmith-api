import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "appsmith", "sumlink-analytics-dashboard-cloud-fixed.json");
const outputPath = path.join(ROOT, "appsmith", "sumlink-dashboard-fast-import.json");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const clone = (value) => JSON.parse(JSON.stringify(value));

const slimPages = clone(source.pageList ?? []).map((page) => ({
  ...page,
  publishedPage: undefined,
  new: true,
}));

const slimActions = clone(source.actionList ?? []).map((action) => ({
  ...action,
  publishedAction: undefined,
  new: true,
}));

const fastImport = {
  artifactJsonType: "APPLICATION",
  clientSchemaVersion: source.clientSchemaVersion,
  serverSchemaVersion: source.serverSchemaVersion,
  exportedApplication: {
    ...clone(source.exportedApplication),
    viewMode: false,
    applicationVersion: 1,
    isManualUpdate: false,
    deleted: false,
  },
  datasourceList: clone(source.datasourceList ?? []),
  customJSLibList: clone(source.customJSLibList ?? []),
  pageList: slimPages,
  actionList: slimActions,
  actionCollectionList: clone(source.actionCollectionList ?? []),
  editModeTheme: clone(source.editModeTheme),
  publishedTheme: clone(source.publishedTheme),
};

fs.writeFileSync(outputPath, `${JSON.stringify(fastImport, null, 2)}\n`);

console.log(`Created ${outputPath}`);
console.log(`Size: ${fs.statSync(outputPath).size}`);
console.log(`Pages: ${fastImport.pageList.length}`);
console.log(`Actions: ${fastImport.actionList.length}`);
console.log(`Datasources: ${fastImport.datasourceList.length}`);
