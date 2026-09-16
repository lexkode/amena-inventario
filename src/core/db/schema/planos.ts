import { pgTable, bigserial, integer, bigint, text } from "drizzle-orm/pg-core";

export const planos = pgTable("planos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  nombre: text("nombre")
    .notNull()
    .$defaultFn(() => "Plano General Residencial Amena"),
  imagenPath: text("imagen_path").notNull(),
  anchoPx: integer("ancho_px").notNull(),
  altoPx: integer("alto_px").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type Plano = typeof planos.$inferSelect;
export type NewPlano = typeof planos.$inferInsert;
