import { pgTable, bigserial, bigint, doublePrecision, text, jsonb, uniqueIndex, integer, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { GrupoViviendas } from "@features/lots/grupo.types";
import { modelos } from "./modelos";
import { torres } from "./torres";

export const lotes = pgTable("lotes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  numeroLote: text("numero_lote").notNull(),
  grupo: jsonb("grupo").$type<GrupoViviendas>(),
  torreId: bigint("torre_id", { mode: "number" }).references(() => torres.id, { onDelete: "restrict" }),
  tipoVivienda: text("tipo_vivienda", { enum: ["casa", "apartamento"] }).notNull().default("casa"),
  nivel: integer("nivel"),
  nombreNivel: text("nombre_nivel", { enum: ["Planta", "Piso", "Nivel"] }).notNull().default("Planta"),
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
  plantaArquitectonicaPath: text("planta_arquitectonica_path"),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
}, (table) => [
  uniqueIndex("lotes_grupo_numero_unique").on(table.grupo, table.numeroLote).where(sql`${table.grupo} IS NOT NULL AND ${table.tipoVivienda} = 'casa'`),
  uniqueIndex("apartamentos_torre_nivel_numero_unique").on(table.grupo, table.nivel, table.numeroLote).where(sql`${table.tipoVivienda} = 'apartamento'`),
  check("lotes_ubicacion_check", sql`(${table.tipoVivienda} = 'casa' AND ${table.nivel} IS NULL) OR (${table.tipoVivienda} = 'apartamento' AND ${table.grupo} IS NOT NULL AND ${table.nivel} IS NOT NULL AND ${table.nivel} > 0)`),
  check("lotes_torre_check", sql`(${table.tipoVivienda} = 'casa' AND ${table.torreId} IS NULL) OR (${table.tipoVivienda} = 'apartamento' AND ${table.torreId} IS NOT NULL)`),
]);

export type Lote = typeof lotes.$inferSelect;
export type NewLote = typeof lotes.$inferInsert;
export type LoteEstado = "disponible" | "reservado" | "vendido";
