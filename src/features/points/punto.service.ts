import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import {
  puntoInteresImagenes,
  puntosInteres,
  puntoPublicaciones,
  type PuntoInteresRow,
} from "@core/db/schema";
import {
  type CreatePuntoInput,
  type PuntoImagenItem,
  type PuntoInteres,
  type UpdatePuntoInput,
} from "./punto.types";

export type { PuntoInteres, PuntoImagenItem, CreatePuntoInput, UpdatePuntoInput } from "./punto.types";
export { MAX_IMAGENES_POR_PUNTO, comparablePuntos } from "./punto.types";

async function getImagenesMap(): Promise<Map<number, PuntoImagenItem[]>> {
  const rows = await db
    .select()
    .from(puntoInteresImagenes)
    .orderBy(asc(puntoInteresImagenes.orden), asc(puntoInteresImagenes.id));
  const map = new Map<number, PuntoImagenItem[]>();
  for (const row of rows) {
    const arr = map.get(row.puntoId) ?? [];
    arr.push({ id: row.id, path: row.path });
    map.set(row.puntoId, arr);
  }
  return map;
}

function toPunto(
  row: PuntoInteresRow,
  imagenes: Map<number, PuntoImagenItem[]>,
): PuntoInteres {
  return { ...row, imagenes: imagenes.get(row.id) ?? [] };
}

export async function getPuntos(): Promise<PuntoInteres[]> {
  const rows = await db
    .select()
    .from(puntosInteres)
    .orderBy(asc(puntosInteres.nombre), asc(puntosInteres.id));
  const imagenes = await getImagenesMap();
  return rows.map((r) => toPunto(r, imagenes));
}

export async function getPuntoById(id: number): Promise<PuntoInteres | null> {
  const row = (
    await db.select().from(puntosInteres).where(eq(puntosInteres.id, id)).limit(1)
  )[0];
  if (!row) return null;
  const imagenes = await db
    .select()
    .from(puntoInteresImagenes)
    .where(eq(puntoInteresImagenes.puntoId, id))
    .orderBy(asc(puntoInteresImagenes.orden), asc(puntoInteresImagenes.id));
  return toPunto(
    row,
    new Map([[id, imagenes.map((i) => ({ id: i.id, path: i.path }))]]),
  );
}

export async function createPunto(input: CreatePuntoInput): Promise<PuntoInteres> {
  const [row] = await db
    .insert(puntosInteres)
    .values({
      nombre: input.nombre,
      informacion: input.informacion ?? "",
      x: input.x,
      y: input.y,
    })
    .returning({ id: puntosInteres.id });
  if (!row) throw new Error("No se pudo recuperar el punto de interés recién creado");
  const created = await getPuntoById(row.id);
  if (!created) throw new Error("No se pudo recuperar el punto de interés recién creado");
  return created;
}

export async function updatePunto(
  id: number,
  input: UpdatePuntoInput,
): Promise<PuntoInteres | null> {
  const current = (
    await db.select().from(puntosInteres).where(eq(puntosInteres.id, id)).limit(1)
  )[0];
  if (!current) return null;

  const updates: Partial<PuntoInteresRow> = {};
  if (input.nombre !== undefined) updates.nombre = input.nombre;
  if (input.informacion !== undefined) updates.informacion = input.informacion;
  if (input.x !== undefined) updates.x = input.x;
  if (input.y !== undefined) updates.y = input.y;

  if (Object.keys(updates).length > 0) {
    const updated = await db
      .update(puntosInteres)
      .set(updates)
      .where(eq(puntosInteres.id, id))
      .returning({ id: puntosInteres.id });
    if (updated.length === 0) return null;
  }
  return getPuntoById(id);
}

export async function deletePunto(id: number): Promise<boolean> {
  const deleted = await db
    .delete(puntosInteres)
    .where(eq(puntosInteres.id, id))
    .returning({ id: puntosInteres.id });
  return deleted.length > 0;
}

export async function addPuntoImagen(
  puntoId: number,
  path: string,
): Promise<PuntoImagenItem> {
  const [row] = await db
    .insert(puntoInteresImagenes)
    .values({ puntoId, path, orden: 0 })
    .returning();
  if (!row) throw new Error("No se pudo guardar la imagen del punto de interés");
  return { id: row.id, path: row.path };
}

export async function deletePuntoImagen(
  puntoId: number,
  imagenId: number,
): Promise<string | null> {
  const row = (
    await db
      .select()
      .from(puntoInteresImagenes)
      .where(
        and(
          eq(puntoInteresImagenes.id, imagenId),
          eq(puntoInteresImagenes.puntoId, puntoId),
        ),
      )
      .limit(1)
  )[0];
  if (!row) return null;
  await db.delete(puntoInteresImagenes).where(eq(puntoInteresImagenes.id, imagenId));
  return row.path;
}

// ============ Publicación ============

export type PublicacionPuntosResumen = {
  id: number;
  totalPuntos: number;
  createdAt: number;
};

function parseSnapshot(json: string): PuntoInteres[] {
  try {
    const parsed = JSON.parse(json) as PuntoInteres[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Publica el borrador de puntos reemplazando la publicación anterior. */
export async function publicarPuntos(): Promise<PublicacionPuntosResumen> {
  const draft = await getPuntos();
  await db.delete(puntoPublicaciones);
  const [row] = await db
    .insert(puntoPublicaciones)
    .values({ snapshotJson: JSON.stringify(draft), totalPuntos: draft.length })
    .returning();
  if (!row) throw new Error("No se pudo crear la publicación de puntos de interés");
  return { id: row.id, totalPuntos: row.totalPuntos, createdAt: row.createdAt };
}

export async function getPuntosPublicados(): Promise<PuntoInteres[] | null> {
  try {
    const row = (
      await db
        .select()
        .from(puntoPublicaciones)
        .orderBy(desc(puntoPublicaciones.createdAt), desc(puntoPublicaciones.id))
        .limit(1)
    )[0];
    if (!row) return null;
    return parseSnapshot(row.snapshotJson);
  } catch {
    return null;
  }
}

/** Crea la publicación inicial de puntos si aún no existe. */
export async function asegurarPublicacionPuntos(): Promise<void> {
  try {
    if ((await getPuntosPublicados()) !== null) return;
    const draft = await getPuntos();
    if (draft.length === 0) return;
    await publicarPuntos();
  } catch {
    /* si la tabla aún no existe, no bloquear la página */
  }
}
