import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: true,
  },
  env: {
    schema: {
      DATABASE_URL: envField.string({
        context: "server",
        access: "public",
        default: "sqlite.db",
        optional: true,
      }),
      SESSION_SECRET: envField.string({
        context: "server",
        access: "secret",
      }),
    },
    validateSecrets: false,
  },
  vite: {
    optimizeDeps: {
      exclude: ["better-sqlite3"],
    },
    ssr: {
      external: ["better-sqlite3"],
    },
  },
});
