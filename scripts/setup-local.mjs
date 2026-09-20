import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const examplePath = resolve(root, ".env.example");
const localPath = resolve(root, ".env.local");

if (existsSync(localPath)) {
  console.log(".env.local already exists; leaving it unchanged.");
} else {
  copyFileSync(examplePath, localPath);
  console.log("Created .env.local from .env.example.");
}

console.log("Add your Firebase project values to .env.local, then run npm run check:env.");