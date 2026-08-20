import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { lotes } from "./lotes";

export const loteImagenes = sqliteTable("lote_imagenes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loteId: integer("lote_id")
    .notNull()
    .references(() => lotes.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type LoteImagen = typeof loteImagenes.$inferSelect;
export type NewLoteImagen = typeof loteImagenes.$inferInsert;
