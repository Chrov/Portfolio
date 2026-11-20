// Copy the static export into ../apps so GitHub Pages (deploying from main) serves it.
import fs from "node:fs";
import path from "node:path";

const out = path.resolve("out");
const dest = path.resolve("..", "apps");
if (!fs.existsSync(path.join(out, "index.html"))) {
  console.error("out/ is missing — run `next build` first");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(out, dest, { recursive: true });
console.log(`Published ${out} -> ${dest}`);
