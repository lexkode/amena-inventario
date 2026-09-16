import { defineConfig, envField } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  env: {
    schema: {
      DATABASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      SESSION_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_ACCOUNT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_ACCESS_KEY_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_SECRET_ACCESS_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_BUCKET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_PUBLIC_BASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
    validateSecrets: false,
  },
});
