import { desc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import {
  lotes,
  loteImagenes,
  lotePublicaciones,
  marca,
  planos,
  puntoInteresImagenes,
  puntoPublicaciones,
  puntosInteres,
} from "@core/db/schema";
import { deleteUpload } from "@core/storage";

export type UploadUsage = { used: boolean; labels: string[] };

/** Revisa si una URL de R2 está referenciada por contenido activo o publicado. */
export async function getUploadUsage(url: string): Promise<UploadUsage> {
  const labels: string[] = [];

  const plano = await db
    .select({ id: planos.id })
    .from(planos)
    .where(eq(planos.imagenPath, url))
    .limit(1);
  if (plano.length > 0) labels.push("el plano activo");

  const lote = (
    await db
      .select({ numeroLote: lotes.numeroLote })
      .from(loteImagenes)
      .innerJoin(lotes, eq(loteImagenes.loteId, lotes.id))
      .where(eq(loteImagenes.path, url))
      .limit(1)
  )[0];
  if (lote) labels.push(`el lote ${lote.numeroLote}`);

  const punto = (
    await db
      .select({ nombre: puntosInteres.nombre })
      .from(puntoInteresImagenes)
      .innerJoin(
        puntosInteres,
        eq(puntoInteresImagenes.puntoId, puntosInteres.id),
      )
      .where(eq(puntoInteresImagenes.path, url))
      .limit(1)
  )[0];
  if (punto) labels.push(`el punto de interés "${punto.nombre}"`);

  const marcaRow = (await db.select().from(marca).limit(1))[0];
  if (marcaRow) {
    const logos = [
      marcaRow.logoFrontPath,
      marcaRow.logoAdminPath,
      marcaRow.logoAdminColapsadoPath,
    ];
    if (logos.includes(url)) labels.push("los logos de la marca");
  }

  const [lotePub] = await db
    .select({ snapshotJson: lotePublicaciones.snapshotJson })
    .from(lotePublicaciones)
    .orderBy(desc(lotePublicaciones.createdAt), desc(lotePublicaciones.id))
    .limit(1);
  if (lotePub?.snapshotJson.includes(url)) labels.push("la publicación vigente de lotes");

  const [puntoPub] = await db
    .select({ snapshotJson: puntoPublicaciones.snapshotJson })
    .from(puntoPublicaciones)
    .orderBy(desc(puntoPublicaciones.createdAt), desc(puntoPublicaciones.id))
    .limit(1);
  if (puntoPub?.snapshotJson.includes(url)) labels.push("la publicación vigente de puntos");

  return { used: labels.length > 0, labels };
}

/**
 * Elimina un objeto de R2 solo si no está en uso. Devuelve un mensaje de error
 * legible cuando está referenciado por contenido activo o la publicación vigente.
 */
export async function deleteUploadIfUnused(
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const usage = await getUploadUsage(url);
  if (usage.used) {
    return {
      ok: false,
      error: `No se puede eliminar: la imagen está en uso en ${usage.labels.join(", ")}.`,
    };
  }
  await deleteUpload(url);
  return { ok: true };
}
