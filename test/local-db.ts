import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Integration tests write to the database. They run ONLY against a local
 * Postgres (localhost / 127.0.0.1); any other host — above all production
 * Neon — makes the suite skip instead of touching it.
 */
export function localDbUrl(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" ? url : null;
  } catch {
    return null;
  }
}
