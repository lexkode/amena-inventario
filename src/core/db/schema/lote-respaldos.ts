import { pgTable, bigserial, integer, bigint, text, index } from "drizzle-orm/pg-core";

export const loteRespaldos = pgTable(
  "lote_respaldos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    url: text("url").notNull(),
    totalLotes: integer("total_lotes").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    index("lote_respaldos_created_at_idx").on(table.createdAt, table.id),
  ],
);

export type LoteRespaldo = typeof loteRespaldos.$inferSelect;
export type NewLoteRespaldo = typeof loteRespaldos.$inferInsert;
