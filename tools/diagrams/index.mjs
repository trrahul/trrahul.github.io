// Diagrams build pipeline.
//
// Discovers every scene module in ./scenes, runs it once per theme defined
// in ./themes.mjs, writes the Excalidraw JSON to _diagrams/, and renders
// background-stripped SVGs to assets/img/diagrams/<name>.<theme>.svg.
//
// Run from repo root:  node tools/diagrams/index.mjs

import { readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { renderToSvg } from "@moona3k/excalidraw-export";

import { themes } from "./themes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const sceneDir = path.join(__dirname, "scenes");
const srcOutDir = path.join(repoRoot, "_diagrams");
const svgOutDir = path.join(repoRoot, "assets", "img", "diagrams");

await mkdir(srcOutDir, { recursive: true });
await mkdir(svgOutDir, { recursive: true });

const sceneFiles = (await readdir(sceneDir))
  .filter((f) => f.endsWith(".mjs"))
  .sort();

if (sceneFiles.length === 0) {
  console.log("No scenes in tools/diagrams/scenes/. Nothing to do.");
  process.exit(0);
}

const variants = Object.entries(themes);
let failed = 0;

for (const file of sceneFiles) {
  const mod = await import(pathToFileURL(path.join(sceneDir, file)).href);
  if (typeof mod.build !== "function" || typeof mod.name !== "string") {
    console.error(`SKIP ${file}: missing exported \`name\` or \`build\``);
    failed += 1;
    continue;
  }
  for (const [variantName, palette] of variants) {
    try {
      const built = mod.build(palette);
      const baseName = `${mod.name}.${variantName}`;
      const srcPath = path.join(srcOutDir, `${baseName}.excalidraw`);
      const svgPath = path.join(svgOutDir, `${baseName}.svg`);
      await writeFile(
        srcPath,
        JSON.stringify(built.body, null, 2) + "\n",
        "utf-8",
      );
      const svg = stripViewportBackground(renderToSvg(built.body));
      await writeFile(svgPath, svg, "utf-8");
      console.log(`OK  ${baseName}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${mod.name} (${variantName}): ${err.message}`);
    }
  }
}

if (failed > 0) process.exit(1);

// The exporter always paints a hard-coded white viewport rectangle. Strip it
// so the SVG has a transparent background and adapts to light/dark page bg.
function stripViewportBackground(svg) {
  return svg.replace(
    /<rect\s+width="100%"\s+height="100%"\s+fill="#ffffff"\/>\s*/i,
    "",
  );
}
