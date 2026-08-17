import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const planos = sqliteTable("planos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre")
    .notNull()
    .$defaultFn(() => "Plano General Residencial Amena"),
  imagenPath: text("imagen_path").notNull(),
  anchoPx: integer("ancho_px").notNull(),
  altoPx: integer("alto_px").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type Plano = typeof planos.$inferSelect;
export type NewPlano = typeof planos.$inferInsert;