import { pgTable, bigserial, integer, bigint, doublePrecision, text } from "drizzle-orm/pg-core";

export const modelos = pgTable("modelos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["casa", "apartamento"] }).notNull(),
  precioBase: doublePrecision("precio_base").notNull(),
  terrenoM2: doublePrecision("terreno_m2").notNull(),
  construccionM2: doublePrecision("construccion_m2").notNull(),
  habitaciones: integer("habitaciones").notNull(),
  banos: doublePrecision("banos").notNull(),
  parqueos: integer("parqueos").notNull().default(1),
  dimensionesLote: text("dimensiones_lote"),
  caracteristicasJson: text("caracteristicas_json"),
  orden: integer("orden").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type Modelo = typeof modelos.$inferSelect;
export type NewModelo = typeof modelos.$inferInsert;
export type ModeloTipo = "casa" | "apartamento";
