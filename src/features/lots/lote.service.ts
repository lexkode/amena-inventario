import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@core/db/client";
import {
  lotes,
  loteImagenes,
  lotePublicaciones,
  loteRespaldos,
  modelos,
  type Lote,
  type Modelo,
} from "@core/db/schema";
import { parsePoligonoJson } from "@core/geometry";
import { listJsonBackups, saveJsonBackup } from "@core/storage";
import { parse } from "@core/validation/parse";
import { modeloExiste } from "@features/catalog/modelo.service";
import { parseModelo } from "@features/catalog/modelo.types";
import { loteBackupSchema } from "@features/lots/lote.types";
import type {
  CreateLoteInput,
  LoteConModelo,
  LoteImagenItem,
  UpdateLoteInput,
} from "@features/lots/lote.types";

export type {
  Punto,
  LoteEstado,
  CreateLoteInput,
  UpdateLoteInput,
  LoteConModelo,
  LoteImagenItem,
} from "@features/lots/lote.types";
export { ESTADOS_LOTE, MAX_IMAGENES_POR_LOTE } from "@features/lots/lote.types";

type JoinRow = { lote: Lote; modelo: Modelo | null };

async function getImagenesMap(): Promise<Map<number, LoteImagenItem[]>> {
  const rows = await db
    .select()
    .from(loteImagenes)
    .orderBy(asc(loteImagenes.orden), asc(loteImagenes.id));
  const map = new Map<number, LoteImagenItem[]>();
  for (const row of rows) {
    const arr = map.get(row.loteId) ?? [];
    arr.push({ id: row.id, path: row.path });
    map.set(row.loteId, arr);
  }
  return map;
}

function toLoteConModelo(
  row: JoinRow,
  imagenes: Map<number, LoteImagenItem[]> = new Map(),
): LoteConModelo {
  const { poligonoJson, ...rest } = row.lote;
  return {
    ...rest,
    poligono: parsePoligonoJson(poligonoJson),
    modelo: row.modelo ? parseModelo(row.modelo) : null,
    imagenes: imagenes.get(row.lote.id) ?? [],
  };
}

export async function getLotes(): Promise<LoteConModelo[]> {
  const rows = await db
    .select({ lote: lotes, modelo: modelos })
    .from(lotes)
    .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
    .orderBy(asc(lotes.numeroLote), asc(lotes.id));
  const imagenes = await getImagenesMap();
  return rows.map((r) => toLoteConModelo(r, imagenes));
}

export async function getLoteById(id: number): Promise<LoteConModelo | null> {
  const row = (
    await db
      .select({ lote: lotes, modelo: modelos })
      .from(lotes)
      .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
      .where(eq(lotes.id, id))
      .limit(1)
  )[0];
  if (!row) return null;
  const imagenes = await getImagenesByLote(id);
  return toLoteConModelo(row, new Map([[id, imagenes]]));
}

export async function getImagenesByLote(loteId: number): Promise<LoteImagenItem[]> {
  const rows = await db
    .select()
    .from(loteImagenes)
    .where(eq(loteImagenes.loteId, loteId))
    .orderBy(asc(loteImagenes.orden), asc(loteImagenes.id));
  return rows.map((r) => ({ id: r.id, path: r.path }));
}

export async function addLoteImagen(
  loteId: number,
  path: string,
  orden?: number,
): Promise<LoteImagenItem> {
  const [row] = await db
    .insert(loteImagenes)
    .values({ loteId, path, orden: orden ?? 0 })
    .returning();
  if (!row) throw new Error("No se pudo guardar la imagen del lote");
  return { id: row.id, path: row.path };
}

export async function deleteLoteImagen(
  loteId: number,
  imagenId: number,
): Promise<string | null> {
  const row = (
    await db
      .select()
      .from(loteImagenes)
      .where(and(eq(loteImagenes.id, imagenId), eq(loteImagenes.loteId, loteId)))
      .limit(1)
  )[0];
  if (!row) return null;
  await db.delete(loteImagenes).where(eq(loteImagenes.id, imagenId));
  return row.path;
}

async function assertModeloExists(modeloId: number | null): Promise<string | null> {
  if (modeloId === null) return null;
  return (await modeloExiste(modeloId)) ? null : `modeloId ${modeloId} no existe`;
}

async function numeroLoteEnUso(
  modeloId: number | null,
  numeroLote: string,
  excluirId?: number,
): Promise<boolean> {
  const conditions = [
    eq(lotes.numeroLote, numeroLote),
    modeloId === null ? isNull(lotes.modeloId) : eq(lotes.modeloId, modeloId),
  ];
  if (excluirId !== undefined) {
    conditions.push(ne(lotes.id, excluirId));
  }
  const row = (
    await db
      .select({ id: lotes.id })
      .from(lotes)
      .where(and(...conditions))
      .limit(1)
  )[0];
  return row !== undefined;
}

export async function createLote(input: CreateLoteInput): Promise<LoteConModelo> {
  const modeloId = input.modeloId ?? null;
  const modeloError = await assertModeloExists(modeloId);
  if (modeloError) throw new Error(modeloError);
  if (await numeroLoteEnUso(modeloId, input.numeroLote)) {
    throw new Error(
      `El número de lote ${input.numeroLote} ya existe para este modelo`,
    );
  }

  const [row] = await db
    .insert(lotes)
    .values({
      numeroLote: input.numeroLote,
      estado: input.estado,
      poligonoJson: JSON.stringify(input.poligono),
      modeloId: input.modeloId ?? null,
      terrenoM2: input.terrenoM2 ?? null,
      dimensionesLote: input.dimensionesLote ?? null,
    })
    .returning({ id: lotes.id });

  if (!row) {
    throw new Error("No se pudo recuperar el lote recién creado");
  }
  const created = await getLoteById(row.id);
  if (!created) {
    throw new Error("No se pudo recuperar el lote recién creado");
  }
  return created;
}

export async function updateLote(
  id: number,
  input: UpdateLoteInput,
): Promise<LoteConModelo | null> {
  const current = (
    await db.select().from(lotes).where(eq(lotes.id, id)).limit(1)
  )[0];
  if (!current) return null;

  const effectiveModeloId =
    input.modeloId !== undefined ? input.modeloId : current.modeloId;
  const effectiveNumero =
    input.numeroLote !== undefined ? input.numeroLote : current.numeroLote;
  if (await numeroLoteEnUso(effectiveModeloId, effectiveNumero, id)) {
    throw new Error(
      `El número de lote ${effectiveNumero} ya existe para este modelo`,
    );
  }

  const updates: Partial<Lote> = {};
  if (input.numeroLote !== undefined) updates.numeroLote = input.numeroLote;
  if (input.estado !== undefined) updates.estado = input.estado;
  if (input.poligono !== undefined) {
    updates.poligonoJson = JSON.stringify(input.poligono);
  }
  if (input.modeloId !== undefined) {
    const modeloError = await assertModeloExists(input.modeloId);
    if (modeloError) throw new Error(modeloError);
    updates.modeloId = input.modeloId;
  }
  if (input.terrenoM2 !== undefined) updates.terrenoM2 = input.terrenoM2;
  if (input.dimensionesLote !== undefined) updates.dimensionesLote = input.dimensionesLote;

  if (Object.keys(updates).length > 0) {
    const updated = await db
      .update(lotes)
      .set(updates)
      .where(eq(lotes.id, id))
      .returning({ id: lotes.id });
    if (updated.length === 0) return null;
  }
  return getLoteById(id);
}

export async function deleteLote(id: number): Promise<boolean> {
  const deleted = await db
    .delete(lotes)
    .where(eq(lotes.id, id))
    .returning({ id: lotes.id });
  return deleted.length > 0;
}

// ============ Publicaciones (borrador vs publicado) ============

export type PublicacionResumen = {
  id: number;
  totalLotes: number;
  createdAt: number;
};

export type EstadoPublicacion = {
  tienePublicacion: boolean;
  pendiente: boolean;
};

function comparableLotes(lotesList: LoteConModelo[]): string {
  return JSON.stringify(
    lotesList.map((l) => ({
      numeroLote: l.numeroLote,
      estado: l.estado,
      poligono: l.poligono,
      modeloId: l.modeloId,
      terrenoM2: l.terrenoM2,
      dimensionesLote: l.dimensionesLote,
      imagenes: l.imagenes.map((i) => i.path),
    })),
  );
}

function parsePublicacionSnapshot(json: string): LoteConModelo[] {
  try {
    const parsed = JSON.parse(json) as LoteConModelo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function publicarLotes(): Promise<PublicacionResumen> {
  const draft = await getLotes();
  const [row] = await db
    .insert(lotePublicaciones)
    .values({ snapshotJson: JSON.stringify(draft), totalLotes: draft.length })
    .returning();
  if (!row) throw new Error("No se pudo crear la publicación");
  try {
    await podarPublicaciones();
  } catch {
    /* la poda no debe bloquear la publicación */
  }
  return { id: row.id, totalLotes: row.totalLotes, createdAt: row.createdAt };
}

const DIA_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/El_Salvador",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function diaEnZona(ts: number): string {
  return DIA_FMT.format(new Date(ts));
}

/**
 * Retención: conserva todas las publicaciones del día actual y solo la última
 * de cada día anterior. Devuelve cuántas publicaciones eliminó.
 */
export async function podarPublicaciones(): Promise<number> {
  const rows = await db
    .select({ id: lotePublicaciones.id, createdAt: lotePublicaciones.createdAt })
    .from(lotePublicaciones)
    .orderBy(desc(lotePublicaciones.createdAt), desc(lotePublicaciones.id));
  if (rows.length <= 1) return 0;

  const hoy = diaEnZona(Date.now());
  const diasVistos = new Set<string>();
  const aBorrar: number[] = [];

  for (const row of rows) {
    const dia = diaEnZona(row.createdAt);
    if (dia === hoy) continue;
    if (!diasVistos.has(dia)) {
      diasVistos.add(dia);
      continue;
    }
    aBorrar.push(row.id);
  }

  if (aBorrar.length === 0) return 0;
  await db.delete(lotePublicaciones).where(inArray(lotePublicaciones.id, aBorrar));
  return aBorrar.length;
}

export async function getLotesPublicados(): Promise<LoteConModelo[] | null> {
  try {
    const row = (
      await db
        .select()
        .from(lotePublicaciones)
        .orderBy(desc(lotePublicaciones.createdAt), desc(lotePublicaciones.id))
        .limit(1)
    )[0];
    if (!row) return null;
    return parsePublicacionSnapshot(row.snapshotJson);
  } catch {
    return null;
  }
}

export async function getPublicaciones(): Promise<PublicacionResumen[]> {
  try {
    return await db
      .select({
        id: lotePublicaciones.id,
        totalLotes: lotePublicaciones.totalLotes,
        createdAt: lotePublicaciones.createdAt,
      })
      .from(lotePublicaciones)
      .orderBy(desc(lotePublicaciones.createdAt), desc(lotePublicaciones.id));
  } catch {
    return [];
  }
}

export async function getEstadoPublicacion(): Promise<EstadoPublicacion> {
  const publicados = await getLotesPublicados();
  if (!publicados) return { tienePublicacion: false, pendiente: false };
  const draft = await getLotes();
  return {
    tienePublicacion: true,
    pendiente: comparableLotes(draft) !== comparableLotes(publicados),
  };
}

/**
 * Crea una publicación inicial con el estado actual del borrador si todavía no
 * existe ninguna. Sirve para migrar instalaciones con lotes ya cargados.
 */
export async function asegurarPublicacionInicial(): Promise<void> {
  try {
    if ((await getLotesPublicados()) !== null) return;
    const draft = await getLotes();
    if (draft.length === 0) return;
    await publicarLotes();
  } catch {
    /* si la tabla aún no existe, no bloquear la página */
  }
}

type SnapshotLote = {
  numeroLote: string;
  estado: LoteConModelo["estado"];
  poligono: LoteConModelo["poligono"];
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
  imagenes: { path: string }[];
};

export type ResultadoRestauracion = {
  lotes: LoteConModelo[];
  pendiente: boolean;
  tienePublicacion: boolean;
};

async function reemplazarBorrador(snapshot: SnapshotLote[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(lotes);
    for (const l of snapshot) {
      const [created] = await tx
        .insert(lotes)
        .values({
          numeroLote: l.numeroLote,
          estado: l.estado,
          poligonoJson: JSON.stringify(l.poligono),
          modeloId: l.modeloId,
          terrenoM2: l.terrenoM2,
          dimensionesLote: l.dimensionesLote,
        })
        .returning({ id: lotes.id });
      if (!created) continue;
      let orden = 0;
      for (const img of l.imagenes) {
        await tx
          .insert(loteImagenes)
          .values({ loteId: created.id, path: img.path, orden: orden++ });
      }
    }
  });
}

async function resultadoRestauracion(): Promise<ResultadoRestauracion> {
  const restaurados = await getLotes();
  const publicados = await getLotesPublicados();
  return {
    lotes: restaurados,
    tienePublicacion: publicados !== null,
    pendiente:
      publicados !== null && comparableLotes(restaurados) !== comparableLotes(publicados),
  };
}

export async function restaurarPublicacion(
  id: number,
): Promise<ResultadoRestauracion | null> {
  const row = (
    await db
      .select()
      .from(lotePublicaciones)
      .where(eq(lotePublicaciones.id, id))
      .limit(1)
  )[0];
  if (!row) return null;
  await reemplazarBorrador(parsePublicacionSnapshot(row.snapshotJson));
  return resultadoRestauracion();
}

export async function restaurarDesdeRespaldo(
  snapshot: SnapshotLote[],
): Promise<ResultadoRestauracion> {
  await reemplazarBorrador(snapshot);
  return resultadoRestauracion();
}

export type RespaldoResumen = {
  id: number;
  totalLotes: number;
  createdAt: number;
  url: string;
};

export async function crearRespaldo(): Promise<RespaldoResumen> {
  const draft = await getLotes();
  const fecha = new Date().toISOString().slice(0, 10);
  const url = await saveJsonBackup(draft, `respaldo-lotes-${fecha}.json`);
  const [row] = await db
    .insert(loteRespaldos)
    .values({ url, totalLotes: draft.length })
    .returning();
  if (!row) throw new Error("No se pudo registrar el respaldo");
  return {
    id: row.id,
    totalLotes: row.totalLotes,
    createdAt: row.createdAt,
    url: row.url,
  };
}

export async function getRespaldos(): Promise<RespaldoResumen[]> {
  await sincronizarRespaldosR2();
  try {
    return await db
      .select({
        id: loteRespaldos.id,
        totalLotes: loteRespaldos.totalLotes,
        createdAt: loteRespaldos.createdAt,
        url: loteRespaldos.url,
      })
      .from(loteRespaldos)
      .orderBy(desc(loteRespaldos.createdAt), desc(loteRespaldos.id));
  } catch {
    return [];
  }
}

/**
 * Registra en la BD los respaldos que existen en R2 pero no tienen fila
 * (p. ej. creados antes de guardar metadata o subidos manualmente).
 */
async function sincronizarRespaldosR2(): Promise<void> {
  try {
    const conocidos = new Set(
      (await db.select({ url: loteRespaldos.url }).from(loteRespaldos)).map(
        (r) => r.url,
      ),
    );
    const objetos = await listJsonBackups();
    const faltantes = objetos.filter((o) => !conocidos.has(o.url));
    if (faltantes.length === 0) return;

    const values: { url: string; totalLotes: number; createdAt: number }[] = [];
    for (const o of faltantes) {
      let totalLotes = 0;
      try {
        const res = await fetch(o.url);
        if (res.ok) {
          const data = (await res.json()) as unknown;
          if (Array.isArray(data)) totalLotes = data.length;
        }
      } catch {
        /* sin conteo disponible */
      }
      values.push({ url: o.url, totalLotes, createdAt: o.createdAt });
    }
    await db.insert(loteRespaldos).values(values);
  } catch {
    /* sin R2 o sin tabla: no bloquear el listado */
  }
}

export async function restaurarRespaldo(
  id: number,
): Promise<ResultadoRestauracion | null> {
  const row = (
    await db
      .select()
      .from(loteRespaldos)
      .where(eq(loteRespaldos.id, id))
      .limit(1)
  )[0];
  if (!row) return null;
  const res = await fetch(row.url);
  if (!res.ok) throw new Error("No se pudo descargar el respaldo desde R2");
  const json = (await res.json()) as unknown;
  const snapshot = parse(json, loteBackupSchema);
  await reemplazarBorrador(snapshot);
  return resultadoRestauracion();
}