import { writeVersionJson } from "./lib/write-version.js";

// `npm run build:version` — emits dist/version.json from the current git/package
// state (PRD §30). Run after the main/renderer bundles so it sits next to the
// main bundle, where the app reads it at startup.
const path = writeVersionJson("dist");
console.log(`Wrote ${path}`);
