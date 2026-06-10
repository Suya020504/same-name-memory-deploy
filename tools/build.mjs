import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "src");
const outputDir = path.join(root, "dist");

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from, { withFileTypes: true });

  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);

    if (entry.isDirectory()) {
      await copyDir(source, target);
    } else {
      await copyFile(source, target);
    }
  }
}

await rm(outputDir, { recursive: true, force: true });
await copyDir(sourceDir, outputDir);

const overridesLink = '<link rel="stylesheet" href="/deploy-overrides.css">';
const splitScript = '<script src="/page-split.js"></script>';
for (const file of ["index.html", "presentation.html", "map.html"]) {
  const filePath = path.join(outputDir, file);
  let html = await readFile(filePath, "utf8");
  const original = html;
  if (!html.includes(overridesLink)) {
    html = html.replace("</head>", `${overridesLink}\n</head>`);
  }
  if (file === "presentation.html" && !html.includes(splitScript)) {
    html = html.replace("</body>", `${splitScript}\n</body>`);
  }
  if (html !== original) {
    await writeFile(filePath, html);
  }
}

const requiredFiles = ["index.html", "presentation.html", "map.html", "deploy-overrides.css", "page-split.js"];
for (const file of requiredFiles) {
  const filePath = path.join(outputDir, file);
  const info = await stat(filePath);
  if (info.size === 0) {
    throw new Error(`${file} was not copied correctly.`);
  }
}

console.log(`Built static site to ${outputDir}`);
