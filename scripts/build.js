import { mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const dist = resolve(root, "dist");

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

cpSync(resolve(root, "index.html"), resolve(dist, "index.html"));
cpSync(resolve(root, "icon.svg"), resolve(dist, "icon.svg"));
cpSync(resolve(root, "manifest.webmanifest"), resolve(dist, "manifest.webmanifest"));
cpSync(resolve(root, "sw.js"), resolve(dist, "sw.js"));
cpSync(resolve(root, "src"), resolve(dist, "src"), { recursive: true });
cpSync(resolve(root, "models"), resolve(dist, "models"), { recursive: true });

console.log("Built to", dist);
