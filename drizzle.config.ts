import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "sqlite.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
