import { pgTable, bigserial, bigint, doublePrecision, text } from "drizzle-orm/pg-core";
import { modelos } from "./modelos";

export const lotes = pgTable("lotes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  numeroLote: text("numero_lote").notNull(),
  estado: text("estado", {
    enum: ["disponible", "reservado", "vendido"],
  })
    .notNull()
    .default("disponible"),
  poligonoJson: text("poligono_json").notNull(),
  modeloId: bigint("modelo_id", { mode: "number" }).references(() => modelos.id, {
    onDelete: "set null",
  }),
  terrenoM2: doublePrecision("terreno_m2"),
  dimensionesLote: text("dimensiones_lote"),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export type Lote = typeof lotes.$inferSelect;
export type NewLote = typeof lotes.$inferInsert;
export type LoteEstado = "disponible" | "reservado" | "vendido";
