import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const planos = sqliteTable("planos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre")
    .notNull()
    .$defaultFn(() => "Plano General Residencial Amena"),
  imagenPath: text("imagen_path").notNull(),
  anchoPx: integer("ancho_px").notNull(),
  altoPx: integer("alto_px").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Plano = typeof planos.$inferSelect;
export type NewPlano = typeof planos.$inferInsert;
export type Modelo = typeof modelos.$inferSelect;
export type NewModelo = typeof modelos.$inferInsert;
export type ModeloTipo = "casa" | "apartamento";
export type Lote = typeof lotes.$inferSelect;
export type NewLote = typeof lotes.$inferInsert;
export type LoteEstado = "disponible" | "reservado" | "vendido";
