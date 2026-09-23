import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "..", ".env.local");
const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

if (!existsSync(envPath)) {
  console.error("Missing .env.local. Run npm run setup first.");
  process.exit(1);
}

const values = new Map(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

const missing = requiredKeys.filter((key) => {
  const value = values.get(key);
  return !value || value.startsWith("your_") || value.includes("your-project");
});

if (missing.length > 0) {
  console.error("Environment is incomplete. Set these values in .env.local:");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

console.log("Firebase and Supabase browser environment are configured.");
