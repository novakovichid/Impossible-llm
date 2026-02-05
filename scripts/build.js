import { mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const dist = resolve(root, "dist");

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

cpSync(resolve(root, "public"), dist, { recursive: true });
cpSync(resolve(root, "src"), resolve(dist, "src"), { recursive: true });
cpSync(resolve(root, "models"), resolve(dist, "models"), { recursive: true });

console.log("Built to", dist);
