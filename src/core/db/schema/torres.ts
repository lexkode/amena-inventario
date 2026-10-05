import { pgTable, bigserial, bigint, text, jsonb, uniqueIndex, integer, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { GrupoViviendas } from "@features/lots/grupo.types";
import type { Punto } from "@core/geometry";

export const torres = pgTable("torres", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  grupo: jsonb("grupo").$type<GrupoViviendas>().notNull(),
  nombreNivel: text("nombre_nivel", { enum: ["Planta", "Piso", "Nivel"] }).notNull().default("Planta"),
  nombrePersonalizado: text("nombre_personalizado"),
  cantidadNiveles: integer("cantidad_niveles").notNull().default(1),
  imagenesNivel: jsonb("imagenes_nivel").$type<Record<string, string>>().notNull().default({}),
  perimetrosNivel: jsonb("perimetros_nivel").$type<Record<string, Punto[]>>().notNull().default({}),
  poligonoJson: text("poligono_json").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()).$onUpdateFn(() => Date.now()),
}, (table) => [uniqueIndex("torres_grupo_unique").on(table.grupo), check("torres_niveles_check", sql`${table.cantidadNiveles} BETWEEN 1 AND 200`)]);
