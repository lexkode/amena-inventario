import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";

export const modelos = sqliteTable("modelos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["casa", "apartamento"] }).notNull(),
  precioBase: real("precio_base").notNull(),
  terrenoM2: real("terreno_m2").notNull(),
  construccionM2: real("construccion_m2").notNull(),
  habitaciones: integer("habitaciones").notNull(),
  banos: real("banos").notNull(),
  parqueos: integer("parqueos").notNull().default(1),
  dimensionesLote: text("dimensiones_lote"),
  caracteristicasJson: text("caracteristicas_json"),
  orden: integer("orden").notNull().default(0),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type Modelo = typeof modelos.$inferSelect;
export type NewModelo = typeof modelos.$inferInsert;
export type ModeloTipo = "casa" | "apartamento";