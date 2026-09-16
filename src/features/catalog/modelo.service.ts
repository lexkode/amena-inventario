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

export async function getModelos(): Promise<ModeloConCaracteristicas[]> {
  const rows = await db
    .select()
    .from(modelos)
    .orderBy(asc(modelos.orden), asc(modelos.id));
  return rows.map(parseModelo);
}

export async function getModeloById(id: number): Promise<ModeloConCaracteristicas | null> {
  const row = (
    await db.select().from(modelos).where(eq(modelos.id, id)).limit(1)
  )[0];
  return row ? parseModelo(row) : null;
}

/** Lectura angosta para otras features: evita que accedan a la tabla directamente. */
export async function modeloExiste(id: number): Promise<boolean> {
  return (
    (await db
      .select({ id: modelos.id })
      .from(modelos)
      .where(eq(modelos.id, id))
      .limit(1))[0] !== undefined
  );
}

export async function createModelo(input: ModeloFormInput): Promise<ModeloConCaracteristicas> {
  const [row] = await db
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
    .returning();

  if (!row) throw new Error("No se pudo recuperar el modelo recién creado");
  return parseModelo(row);
}

export async function updateModelo(
  id: number,
  input: ModeloFormInput,
): Promise<ModeloConCaracteristicas | null> {
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

  const [row] = await db
    .update(modelos)
    .set(updates)
    .where(eq(modelos.id, id))
    .returning();
  return row ? parseModelo(row) : null;
}

export async function deleteModelo(id: number): Promise<boolean> {
  const deleted = await db
    .delete(modelos)
    .where(eq(modelos.id, id))
    .returning({ id: modelos.id });
  return deleted.length > 0;
}
