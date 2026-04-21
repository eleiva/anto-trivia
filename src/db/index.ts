import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please add it to your Vercel project settings.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy singleton — only instantiated on first use (not at module load / build time)
let _db: ReturnType<typeof getDb> | null = null;

export function getDatabase() {
  if (!_db) {
    _db = getDb();
  }
  return _db;
}

// Keep `db` as a proxy so existing code that imports `db` continues to work
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDatabase()[prop as keyof ReturnType<typeof getDb>];
  },
});

export * from "./schema";
