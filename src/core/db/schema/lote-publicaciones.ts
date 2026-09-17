import { pgTable, bigserial, integer, bigint, text, index } from "drizzle-orm/pg-core";

export const lotePublicaciones = pgTable(
  "lote_publicaciones",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    snapshotJson: text("snapshot_json").notNull(),
    totalLotes: integer("total_lotes").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    index("lote_publicaciones_created_at_idx").on(table.createdAt, table.id),
  ],
);

export type LotePublicacion = typeof lotePublicaciones.$inferSelect;
export type NewLotePublicacion = typeof lotePublicaciones.$inferInsert;
