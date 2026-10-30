import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "dist");
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, "src"), { recursive: true });
await Promise.all([
  cp(resolve(root, "index.html"), resolve(out, "index.html")),
  cp(resolve(root, "styles.css"), resolve(out, "styles.css")),
  cp(resolve(root, "src"), resolve(out, "src"), { recursive: true })
]);
const apiUrl = process.env.PROSPECTING_API_URL || "";
await writeFile(resolve(out, "config.js"), `window.__IGEHO_CONFIG__ = ${JSON.stringify({ apiUrl })};\n`);
console.log(`Built ${out}${apiUrl ? " with a configured API URL" : " in demo mode"}.`);
