import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { modelos } from "./modelos";

export const lotes = sqliteTable("lotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numeroLote: text("numero_lote").notNull(),
  estado: text("estado", {
    enum: ["disponible", "reservado", "vendido"],
  })
    .notNull()
    .default("disponible"),
  poligonoJson: text("poligono_json").notNull(),
  modeloId: integer("modelo_id").references(() => modelos.id, {
    onDelete: "set null",
  }),
  terrenoM2: real("terreno_m2"),
  dimensionesLote: text("dimensiones_lote"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export type Lote = typeof lotes.$inferSelect;
export type NewLote = typeof lotes.$inferInsert;
export type LoteEstado = "disponible" | "reservado" | "vendido";