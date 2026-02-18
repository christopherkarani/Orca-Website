import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const OUT_DIR = path.resolve(".parity");
const BASE_URL = "https://ollama.com/";
const LOCAL_URL = process.env.LOCAL_URL || "http://localhost:3003/";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function screenshot(page, url, outPath) {
  await page.setViewportSize({ width: page.viewportSize().width, height: page.viewportSize().height });
  await page.goto(url, { waitUntil: "networkidle" });
  // give layout/fonts a moment to settle
  await page.waitForTimeout(300);
  await page.screenshot({ path: outPath, fullPage: true });
}

function diffPng(aPath, bPath, outPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));

  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);

  const a2 = new PNG({ width, height, fill: true });
  const b2 = new PNG({ width, height, fill: true });
  PNG.bitblt(a, a2, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, b2, 0, 0, b.width, b.height, 0, 0);

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a2.data, b2.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: true,
  });

  fs.writeFileSync(outPath, PNG.sync.write(diff));
  return { diffPixels, width, height, diffPct: diffPixels / (width * height) };
}

async function main() {
  ensureDir(OUT_DIR);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const basePath = path.join(OUT_DIR, `${vp.name}.base.png`);
    const localPath = path.join(OUT_DIR, `${vp.name}.local.png`);
    const diffPath = path.join(OUT_DIR, `${vp.name}.diff.png`);

    await screenshot(page, BASE_URL, basePath);
    await screenshot(page, LOCAL_URL, localPath);

    const r = diffPng(basePath, localPath, diffPath);
    results.push({ viewport: vp, ...r, basePath, localPath, diffPath });
  }

  await browser.close();

  // Print concise report
  for (const r of results) {
    const pct = (r.diffPct * 100).toFixed(3);
    console.log(
      `${r.viewport.name.padEnd(7)}  ${r.width}x${r.height}  diffPixels=${r.diffPixels}  diffPct=${pct}%  diff=${path.relative(process.cwd(), r.diffPath)}`
    );
  }

  // Write JSON summary for tooling
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
