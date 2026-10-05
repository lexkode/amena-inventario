import { pgTable, bigserial, bigint, text, integer, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const marca = pgTable("marca", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  coloresJson: text("colores_json")
    .notNull()
    .$defaultFn(() => "{}"),
  logoFrontPath: text("logo_front_path"),
  logoAdminPath: text("logo_admin_path"),
  logoAdminColapsadoPath: text("logo_admin_colapsado_path"),
  tipografia: text("tipografia"),
  nombreGrupo: text("nombre_grupo").notNull().default("Polígono"),
  tipoIdentificadorGrupo: text("tipo_identificador_grupo", { enum: ["numerico", "alfabetico"] }).notNull().default("alfabetico"),
  nombreTorre: text("nombre_torre", { enum: ["Torre", "Edificio", "Complejo", "Condominio"] }).notNull().default("Torre"),
  tipoIdentificadorTorre: text("tipo_identificador_torre", { enum: ["numerico", "alfabetico"] }).notNull().default("alfabetico"),
  nombreNivel: text("nombre_nivel", { enum: ["Planta", "Piso", "Nivel"] }).notNull().default("Planta"),
  opacidadPlanosNivel: integer("opacidad_planos_nivel").notNull().default(50),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
}, (table) => [check("marca_opacidad_planos_nivel_check", sql`${table.opacidadPlanosNivel} BETWEEN 0 AND 100`)]);

export type Marca = typeof marca.$inferSelect;
export type NewMarca = typeof marca.$inferInsert;
