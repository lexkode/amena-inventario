import { asc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import { lotes, torres } from "@core/db/schema";
import { parsePoligonoJson } from "@core/geometry";
import { poligonoDentroPoligono } from "@core/geometry/perimeter";
import type { GrupoViviendas } from "./grupo.types";
import { torreCreateSchema, validarCambioTorre, perimetroNivel, type Torre, type TorreInput, type UpdateTorreInput } from "./torre.types";

function parseTorre(row: typeof torres.$inferSelect): Torre {
  const { poligonoJson, ...rest } = row;
  return { ...rest, poligono: parsePoligonoJson(poligonoJson) };
}

export async function getTorres(): Promise<Torre[]> {
  return (await db.select().from(torres).orderBy(asc(torres.id))).map(parseTorre);
}

export async function getTorreByGrupo(grupo: GrupoViviendas): Promise<Torre | null> {
  const row = (await db.select().from(torres).where(eq(torres.grupo, grupo)).limit(1))[0];
  return row ? parseTorre(row) : null;
}

export async function createTorre(input: TorreInput): Promise<Torre> {
  if (await getTorreByGrupo(input.grupo)) throw new Error("Ya existe un edificio con esta nomenclatura y numeración");
  const { poligono, ...fields } = input;
  const [row] = await db.insert(torres).values({ ...fields, poligonoJson: JSON.stringify(poligono) }).returning();
  if (!row) throw new Error("No se pudo crear el edificio");
  return parseTorre(row);
}

export async function deleteTorre(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const row = (await tx.select().from(torres).where(eq(torres.id, id)).limit(1).for("update"))[0];
    if (!row) return false;
    await tx.delete(lotes).where(eq(lotes.torreId, id));
    await tx.delete(torres).where(eq(torres.id, id));
    return true;
  });
}

export async function updateTorre(id: number, input: UpdateTorreInput): Promise<Torre | null> {
  return db.transaction(async (tx) => {
    const row = (await tx.select().from(torres).where(eq(torres.id, id)).limit(1).for("update"))[0];
    if (!row) return null;
    const effective = { ...parseTorre(row), ...input };
    torreCreateSchema.parse(effective);
    const apartamentos = (await tx.select().from(lotes).where(eq(lotes.torreId, id))).map((a) => ({ nivel: a.nivel, poligono: parsePoligonoJson(a.poligonoJson) }));
    const error = validarCambioTorre(effective, apartamentos);
    if (error) throw new Error(error);
    const { poligono, ...fields } = input;
    const [updated] = await tx.update(torres).set({ ...fields, ...(poligono ? { poligonoJson: JSON.stringify(poligono) } : {}) }).where(eq(torres.id, id)).returning();
    return parseTorre(updated);
  });
}

export async function validarPerimetroApartamento(grupo: GrupoViviendas, poligono: TorreInput["poligono"], nivel: number): Promise<Torre> {
  const torre = await getTorreByGrupo(grupo);
  if (!torre) throw new Error("Primero debes crear el perímetro del edificio");
  if (nivel > torre.cantidadNiveles) throw new Error("El nivel supera la cantidad de niveles del edificio");
  if (!poligonoDentroPoligono(poligono, perimetroNivel(torre, nivel))) throw new Error("El apartamento debe quedar completamente dentro del perímetro de su nivel");
  return torre;
}
