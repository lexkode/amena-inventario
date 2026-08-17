import { asc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import { modelos, type Modelo } from "@core/db/schema";
import {
  parseModelo,
  type ModeloConCaracteristicas,
  type ModeloFormInput,
} from "@features/catalog/modelo.types";

export type {
  ModeloConCaracteristicas,
  ModeloFormInput as CreateModeloInput,
} from "@features/catalog/modelo.types";

export function getModelos(): ModeloConCaracteristicas[] {
  const rows = db
    .select()
    .from(modelos)
    .orderBy(asc(modelos.orden), asc(modelos.id))
    .all();
  return rows.map(parseModelo);
}

export function getModeloById(id: number): ModeloConCaracteristicas | null {
  const row = db.select().from(modelos).where(eq(modelos.id, id)).get();
  return row ? parseModelo(row) : null;
}

export function createModelo(input: ModeloFormInput): ModeloConCaracteristicas {
  const inserted = db
    .insert(modelos)
    .values({
      nombre: input.nombre,
      tipo: input.tipo,
      precioBase: input.precioBase,
      terrenoM2: input.terrenoM2,
      construccionM2: input.construccionM2,
      habitaciones: input.habitaciones,
      banos: input.banos,
      parqueos: input.parqueos,
      dimensionesLote: input.dimensionesLote ?? null,
      caracteristicasJson:
        input.caracteristicas.length > 0
          ? JSON.stringify(input.caracteristicas)
          : null,
      orden: input.orden,
    })
    .returning()
    .get();
  return parseModelo(inserted);
}

export function updateModelo(
  id: number,
  input: ModeloFormInput,
): ModeloConCaracteristicas | null {
  const updates: Partial<Modelo> = {
    nombre: input.nombre,
    tipo: input.tipo,
    precioBase: input.precioBase,
    terrenoM2: input.terrenoM2,
    construccionM2: input.construccionM2,
    habitaciones: input.habitaciones,
    banos: input.banos,
    parqueos: input.parqueos,
    dimensionesLote: input.dimensionesLote ?? null,
    caracteristicasJson:
      input.caracteristicas.length > 0
        ? JSON.stringify(input.caracteristicas)
        : null,
    orden: input.orden,
  };

  const updated = db
    .update(modelos)
    .set(updates)
    .where(eq(modelos.id, id))
    .returning()
    .get();
  return updated ? parseModelo(updated) : null;
}

export function deleteModelo(id: number): boolean {
  const result = db.delete(modelos).where(eq(modelos.id, id)).run();
  return result.changes > 0;
}