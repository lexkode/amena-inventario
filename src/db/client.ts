import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { DATABASE_URL } from "astro:env/server";
import * as schema from "./schema";

const url = DATABASE_URL ?? "sqlite.db";
const sqlite = new Database(url);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
export type DB = typeof db;
