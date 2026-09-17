import { pgTable, bigserial, bigint, text } from "drizzle-orm/pg-core";

export const marca = pgTable("marca", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  coloresJson: text("colores_json")
    .notNull()
    .$defaultFn(() => "{}"),
  logoFrontPath: text("logo_front_path"),
  logoAdminPath: text("logo_admin_path"),
  logoAdminColapsadoPath: text("logo_admin_colapsado_path"),
  tipografia: text("tipografia"),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export type Marca = typeof marca.$inferSelect;
export type NewMarca = typeof marca.$inferInsert;
