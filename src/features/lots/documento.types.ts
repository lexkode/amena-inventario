import { z } from "zod";
import { loteBackupSchema, type LoteBackupItem } from "./lote.types";
import { claveGrupo } from "./grupo.types";
import { torreCreateSchema, perimetroNivel, type TorreInput } from "./torre.types";
import { poligonoDentroPoligono } from "@core/geometry/perimeter";

/** Legacy apartments did not have a building boundary; preserve them in a bounding rectangle. */
export function inferirTorres(lotes: LoteBackupItem[]): TorreInput[] {
  const grupos = new Map<string, LoteBackupItem[]>();
  for (const lote of lotes) {
    if (lote.tipoVivienda !== "apartamento" || !lote.grupo) continue;
    const key = claveGrupo(lote.grupo);
    grupos.set(key, [...(grupos.get(key) ?? []), lote]);
  }
  return [...grupos.values()].map((arr) => {
    const puntos = arr.flatMap((l) => l.poligono);
    const xs = puntos.map((p) => p.x), ys = puntos.map((p) => p.y);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
    return { grupo: arr[0].grupo!, nombreNivel: arr[0].nombreNivel, nombrePersonalizado: null, cantidadNiveles: Math.max(...arr.map((a) => a.nivel ?? 1)), imagenesNivel: {}, perimetrosNivel: {}, poligono: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] };
  });
}

const documentoSchema = z.union([
  loteBackupSchema.transform((lotes) => ({ lotes, torres: inferirTorres(lotes) })),
  z.object({ version: z.literal(2).optional(), lotes: loteBackupSchema, torres: z.array(torreCreateSchema).optional() })
    .transform((data) => ({ lotes: data.lotes, torres: data.torres ?? inferirTorres(data.lotes) })),
]).superRefine((data, ctx) => {
  const torres = new Map(data.torres.map((t) => [claveGrupo(t.grupo), t]));
  if (torres.size !== data.torres.length) ctx.addIssue({ code: "custom", message: "El respaldo contiene edificios duplicados" });
  for (const torre of data.torres) {
    if (!torreCreateSchema.safeParse(torre).success) ctx.addIssue({ code: "custom", message: "Perímetro de edificio inválido" });
  }
  for (const lote of data.lotes) {
    if (lote.tipoVivienda !== "apartamento") continue;
    const torre = torres.get(claveGrupo(lote.grupo));
    if (!torre || !poligonoDentroPoligono(lote.poligono, perimetroNivel(torre, lote.nivel ?? 1))) ctx.addIssue({ code: "custom", message: "El respaldo contiene un apartamento fuera del perímetro de su nivel" });
    if (torre && (lote.nivel ?? 1) > torre.cantidadNiveles) ctx.addIssue({ code: "custom", message: "El respaldo contiene un apartamento en un nivel inexistente" });
  }
});
export const documentoBackupSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const doc = raw as { lotes?: LoteBackupItem[]; torres?: (TorreInput & { cantidadNiveles?: number })[] };
  if (!Array.isArray(doc.torres) || !Array.isArray(doc.lotes)) return raw;
  if (doc.torres.some((t) => !t || typeof t !== "object") || doc.lotes.some((l) => !l || typeof l !== "object")) return raw;
  return { ...doc, torres: doc.torres.map((t) => ({ ...t, cantidadNiveles: t.cantidadNiveles ?? Math.max(1, ...doc.lotes!.filter((a) => a.tipoVivienda === "apartamento" && claveGrupo(a.grupo) === claveGrupo(t.grupo)).map((a) => a.nivel ?? 1)) })) };
}, documentoSchema);
export type DocumentoBackup = z.infer<typeof documentoBackupSchema>;
