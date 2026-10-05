import {
  pgTable,
  bigserial,
  bigint,
  integer,
  doublePrecision,
  text,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const puntosInteres = pgTable("puntos_interes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  nombre: text("nombre").notNull(),
  informacion: text("informacion")
    .notNull()
    .$defaultFn(() => ""),
  x: doublePrecision("x").notNull(),
  y: doublePrecision("y").notNull(),
  iconoPath: text("icono_path"),
  tamanoIcono: integer("tamano_icono").notNull().default(100),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
}, (table) => [
  check("puntos_interes_tamano_icono_check", sql`${table.tamanoIcono} BETWEEN 25 AND 300`),
]);

export const puntoInteresImagenes = pgTable("punto_interes_imagenes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  puntoId: bigint("punto_id", { mode: "number" })
    .notNull()
    .references(() => puntosInteres.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const puntoPublicaciones = pgTable("punto_publicaciones", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  snapshotJson: text("snapshot_json").notNull(),
  totalPuntos: integer("total_puntos").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type PuntoInteresRow = typeof puntosInteres.$inferSelect;
export type NewPuntoInteres = typeof puntosInteres.$inferInsert;
export type PuntoInteresImagen = typeof puntoInteresImagenes.$inferSelect;
export type PuntoPublicacion = typeof puntoPublicaciones.$inferSelect;
