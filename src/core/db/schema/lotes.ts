import { pgTable, bigserial, bigint, doublePrecision, text, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { GrupoViviendas } from "@features/lots/grupo.types";
import { modelos } from "./modelos";

export const lotes = pgTable("lotes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  numeroLote: text("numero_lote").notNull(),
  grupo: jsonb("grupo").$type<GrupoViviendas>(),
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
}, (table) => [
  uniqueIndex("lotes_grupo_numero_unique").on(table.grupo, table.numeroLote).where(sql`${table.grupo} IS NOT NULL`),
]);

export type Lote = typeof lotes.$inferSelect;
export type NewLote = typeof lotes.$inferInsert;
export type LoteEstado = "disponible" | "reservado" | "vendido";
