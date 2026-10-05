import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@core/db/client";
import {
  lotes,
  loteImagenes,
  lotePublicaciones,
  loteRespaldos,
  modelos,
  torres,
  type Lote,
  type Modelo,
} from "@core/db/schema";
import { parsePoligonoJson } from "@core/geometry";
import { listJsonBackups, saveJsonBackup } from "@core/storage";
import { parse } from "@core/validation/parse";
import { modeloExiste } from "@features/catalog/modelo.service";
import { parseModelo } from "@features/catalog/modelo.types";
import {
  comparablePuntos,
  getPuntos,
  getPuntosPublicados,
} from "@features/points/punto.service";
import { documentoBackupSchema, type DocumentoBackup } from "./documento.types";
import { getTorres, validarPerimetroApartamento } from "./torre.service";
import type { Torre } from "./torre.types";
import { claveGrupo, type GrupoViviendas } from "@features/lots/grupo.types";
import { validarUbicacion, type UbicacionVivienda } from "./altura.types";
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
  if (!row) throw new Error("No se pudo guardar la imagen de la vivienda");
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
  grupo: GrupoViviendas | null,
  ubicacion: Pick<UbicacionVivienda, "tipoVivienda" | "nivel">,
  excluirId?: number,
): Promise<boolean> {
  const conditions = [
    eq(lotes.numeroLote, numeroLote),
    eq(lotes.tipoVivienda, ubicacion.tipoVivienda),
    grupo === null ? isNull(lotes.grupo) : eq(lotes.grupo, grupo),
  ];
  if (ubicacion.tipoVivienda === "apartamento" && ubicacion.nivel !== null) conditions.push(eq(lotes.nivel, ubicacion.nivel));
  // Conserva la regla histórica para viviendas todavía sin grupo.
  if (grupo === null) conditions.push(modeloId === null ? isNull(lotes.modeloId) : eq(lotes.modeloId, modeloId));
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
  const ubicacionError = validarUbicacion({ ...input, grupo: input.grupo ?? null });
  if (ubicacionError) throw new Error(ubicacionError);
  const torre = input.tipoVivienda === "apartamento" ? await validarPerimetroApartamento(input.grupo!, input.poligono, input.nivel!) : null;
  if (modeloId !== null) {
    const modelo = (await db.select().from(modelos).where(eq(modelos.id, modeloId)).limit(1))[0];
    if (modelo?.tipo !== input.tipoVivienda) throw new Error("El modelo debe corresponder al tipo de vivienda");
  }
  if (await numeroLoteEnUso(modeloId, input.numeroLote, input.grupo ?? null, input)) {
    throw new Error(
      `El número de vivienda ${input.numeroLote} ya existe en este grupo y planta/nivel o modelo sin grupo`,
    );
  }

  const [row] = await db
    .insert(lotes)
    .values({
      numeroLote: input.numeroLote,
      grupo: input.grupo ?? null,
      torreId: torre?.id ?? null,
      tipoVivienda: input.tipoVivienda,
      nivel: input.nivel,
      nombreNivel: torre?.nombreNivel ?? input.nombreNivel,
      estado: input.estado,
      poligonoJson: JSON.stringify(input.poligono),
      modeloId: input.modeloId ?? null,
      terrenoM2: input.terrenoM2 ?? null,
      dimensionesLote: input.dimensionesLote ?? null,
      plantaArquitectonicaPath: input.plantaArquitectonicaPath ?? null,
    })
    .returning({ id: lotes.id });

  if (!row) {
    throw new Error("No se pudo recuperar la vivienda recién creada");
  }
  const created = await getLoteById(row.id);
  if (!created) {
    throw new Error("No se pudo recuperar la vivienda recién creada");
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
  const effectiveGrupo = input.grupo !== undefined ? input.grupo : current.grupo;
  const ubicacion = { tipoVivienda: input.tipoVivienda ?? current.tipoVivienda, nivel: input.nivel !== undefined ? input.nivel : current.nivel, grupo: effectiveGrupo };
  const ubicacionError = validarUbicacion(ubicacion);
  if (ubicacionError) throw new Error(ubicacionError);
  const torre = ubicacion.tipoVivienda === "apartamento" ? await validarPerimetroApartamento(effectiveGrupo!, input.poligono ?? parsePoligonoJson(current.poligonoJson), ubicacion.nivel!) : null;
  if (effectiveModeloId !== null && (input.modeloId !== undefined || input.tipoVivienda !== undefined)) {
    const modelo = (await db.select().from(modelos).where(eq(modelos.id, effectiveModeloId)).limit(1))[0];
    if (modelo?.tipo !== ubicacion.tipoVivienda) throw new Error("El modelo debe corresponder al tipo de vivienda");
  }
  if (await numeroLoteEnUso(effectiveModeloId, effectiveNumero, effectiveGrupo, ubicacion, id)) {
    throw new Error(
      `El número de vivienda ${effectiveNumero} ya existe en este grupo o modelo sin grupo`,
    );
  }

  const updates: Partial<Lote> = {};
  updates.torreId = torre?.id ?? null;
  if (input.tipoVivienda !== undefined) updates.tipoVivienda = input.tipoVivienda;
  if (input.nivel !== undefined) updates.nivel = input.nivel;
  if (input.nombreNivel !== undefined) updates.nombreNivel = input.nombreNivel;
  if (torre) updates.nombreNivel = torre.nombreNivel;
  if (input.grupo !== undefined) updates.grupo = input.grupo;
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
  if (input.plantaArquitectonicaPath !== undefined) updates.plantaArquitectonicaPath = input.plantaArquitectonicaPath;

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
      grupo: l.grupo ?? null,
      tipoVivienda: l.tipoVivienda ?? "casa",
      nivel: l.nivel ?? null,
      nombreNivel: l.nombreNivel ?? "Planta",
      estado: l.estado,
      poligono: l.poligono,
      modeloId: l.modeloId,
      terrenoM2: l.terrenoM2,
      dimensionesLote: l.dimensionesLote,
      plantaArquitectonicaPath: l.plantaArquitectonicaPath ?? null,
      imagenes: l.imagenes.map((i) => i.path),
    })),
  );
}

function parsePublicacionSnapshot(json: string): LoteConModelo[] {
  try {
    const raw = JSON.parse(json);
    const parsed = (Array.isArray(raw) ? raw : raw.lotes) as LoteConModelo[];
    return Array.isArray(parsed) ? parsed.map((l) => ({ ...l, grupo: l.grupo ?? null, tipoVivienda: l.tipoVivienda ?? "casa", nivel: l.nivel ?? null, nombreNivel: l.nombreNivel ?? "Planta", plantaArquitectonicaPath: l.plantaArquitectonicaPath ?? null })) : [];
  } catch {
    return [];
  }
}

export async function publicarLotes(): Promise<PublicacionResumen> {
  const draft = await getLotes();
  const edificios = await getTorres();
  const [row] = await db
    .insert(lotePublicaciones)
    .values({ snapshotJson: JSON.stringify({ version: 2, lotes: draft, torres: edificios }), totalLotes: draft.length })
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
  const [lotesPublicados, puntosPublicados, draft, puntosDraft, edificios, edificiosPublicados] = await Promise.all([
    getLotesPublicados(),
    getPuntosPublicados(),
    getLotes(),
    getPuntos(),
    getTorres(),
    getTorresPublicadas(),
  ]);
  if (lotesPublicados === null && puntosPublicados === null) {
    return { tienePublicacion: false, pendiente: false };
  }
  const pendienteLotes =
    comparableLotes(draft) !== comparableLotes(lotesPublicados ?? []);
  const pendientePuntos =
    comparablePuntos(puntosDraft) !== comparablePuntos(puntosPublicados ?? []);
  return {
    tienePublicacion: true,
    pendiente: pendienteLotes || pendientePuntos || comparableTorres(edificios) !== comparableTorres(edificiosPublicados),
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

function comparableTorres(edificios: DocumentoBackup["torres"]): string {
  return JSON.stringify(edificios.map((t) => ({ grupo: claveGrupo(t.grupo), poligono: t.poligono, nombreNivel: t.nombreNivel, nombrePersonalizado: t.nombrePersonalizado, cantidadNiveles: t.cantidadNiveles, imagenesNivel: Object.entries(t.imagenesNivel).sort((a, b) => Number(a[0]) - Number(b[0])), perimetrosNivel: Object.entries(t.perimetrosNivel ?? {}).sort((a, b) => Number(a[0]) - Number(b[0])) })).sort((a, b) => a.grupo.localeCompare(b.grupo)));
}

export async function getTorresPublicadas(): Promise<Torre[]> {
  const row = (await db.select().from(lotePublicaciones).orderBy(desc(lotePublicaciones.createdAt), desc(lotePublicaciones.id)).limit(1))[0];
  if (!row) return [];
  const raw = JSON.parse(row.snapshotJson);
  const edificios = parse(raw, documentoBackupSchema).torres;
  return edificios.map((t, i) => ({ ...t, id: raw.torres?.[i]?.id ?? i + 1, createdAt: raw.torres?.[i]?.createdAt ?? 0, updatedAt: raw.torres?.[i]?.updatedAt ?? 0 }));
}

export type ResultadoRestauracion = {
  lotes: LoteConModelo[];
  torres: Torre[];
  pendiente: boolean;
  tienePublicacion: boolean;
};

async function reemplazarBorrador(snapshot: DocumentoBackup): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(lotes);
    await tx.delete(torres);
    const edificios = new Map<string, number>();
    for (const t of snapshot.torres) {
      const { poligono, ...fields } = t;
      const [created] = await tx.insert(torres).values({ ...fields, poligonoJson: JSON.stringify(poligono) }).returning({ id: torres.id });
      edificios.set(claveGrupo(t.grupo), created.id);
    }
    for (const l of snapshot.lotes) {
      const [created] = await tx
        .insert(lotes)
        .values({
          numeroLote: l.numeroLote,
          grupo: l.grupo ?? null,
          torreId: l.tipoVivienda === "apartamento" && l.grupo ? edificios.get(claveGrupo(l.grupo)) : null,
          tipoVivienda: l.tipoVivienda ?? "casa",
          nivel: l.nivel ?? null,
          nombreNivel: l.nombreNivel ?? "Planta",
          estado: l.estado,
          poligonoJson: JSON.stringify(l.poligono),
          modeloId: l.modeloId,
          terrenoM2: l.terrenoM2,
          dimensionesLote: l.dimensionesLote,
          plantaArquitectonicaPath: l.plantaArquitectonicaPath,
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
  const edificios = await getTorres();
  const edificiosPublicados = await getTorresPublicadas();
  return {
    lotes: restaurados,
    torres: edificios,
    tienePublicacion: publicados !== null,
    pendiente:
      publicados !== null && (comparableLotes(restaurados) !== comparableLotes(publicados) || comparableTorres(edificios) !== comparableTorres(edificiosPublicados)),
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
  await reemplazarBorrador(parse(JSON.parse(row.snapshotJson), documentoBackupSchema));
  return resultadoRestauracion();
}

export async function restaurarDesdeRespaldo(
  snapshot: DocumentoBackup,
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
  const edificios = await getTorres();
  const fecha = new Date().toISOString().slice(0, 10);
  const url = await saveJsonBackup({ version: 2, lotes: draft, torres: edificios }, `respaldo-viviendas-${fecha}.json`);
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
          else if (data && typeof data === "object" && "lotes" in data && Array.isArray(data.lotes)) totalLotes = data.lotes.length;
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
  const snapshot = parse(json, documentoBackupSchema);
  await reemplazarBorrador(snapshot);
  return resultadoRestauracion();
}
