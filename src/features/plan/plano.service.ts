import { desc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import { planos, type Plano } from "@core/db/schema";

export async function getPlanoActivo(): Promise<Plano | null> {
  return (
    (await db
      .select()
      .from(planos)
      .orderBy(desc(planos.createdAt))
      .limit(1))[0] ?? null
  );
}

export type UpsertPlanoInput = {
  nombre?: string;
  imagenPath: string;
  anchoPx: number;
  altoPx: number;
};

export async function upsertPlano(input: UpsertPlanoInput): Promise<Plano> {
  const current = await getPlanoActivo();
  if (current) {
    const [updated] = await db
      .update(planos)
      .set({
        nombre: input.nombre ?? current.nombre,
        imagenPath: input.imagenPath,
        anchoPx: input.anchoPx,
        altoPx: input.altoPx,
      })
      .where(eq(planos.id, current.id))
      .returning();
    if (updated) return updated;
  }
  const [created] = await db
    .insert(planos)
    .values({
      nombre: input.nombre,
      imagenPath: input.imagenPath,
      anchoPx: input.anchoPx,
      altoPx: input.altoPx,
    })
    .returning();
  if (!created) throw new Error("No se pudo recuperar el plano recién creado");
  return created;
}
