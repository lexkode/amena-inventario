import { pgTable, bigserial, bigint, integer, text } from "drizzle-orm/pg-core";
import { lotes } from "./lotes";

export const loteImagenes = pgTable("lote_imagenes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  loteId: bigint("lote_id", { mode: "number" })
    .notNull()
    .references(() => lotes.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type LoteImagen = typeof loteImagenes.$inferSelect;
export type NewLoteImagen = typeof loteImagenes.$inferInsert;
