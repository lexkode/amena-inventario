import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL } from "astro:env/server";
import * as schema from "./schema";

const url = DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/amena_dev";

export const sql = postgres(url, { prepare: false });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
