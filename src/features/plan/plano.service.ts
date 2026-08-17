import { desc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import { planos, type Plano } from "@core/db/schema";

export function getPlanoActivo(): Plano | null {
  return (
    db
      .select()
      .from(planos)
      .orderBy(desc(planos.createdAt))
      .limit(1)
      .get() ?? null
  );
}

export type UpsertPlanoInput = {
  nombre?: string;
  imagenPath: string;
  anchoPx: number;
  altoPx: number;
};

export function upsertPlano(input: UpsertPlanoInput): Plano {
  const current = getPlanoActivo();
  if (current) {
    const updated = db
      .update(planos)
      .set({
        nombre: input.nombre ?? current.nombre,
        imagenPath: input.imagenPath,
        anchoPx: input.anchoPx,
        altoPx: input.altoPx,
      })
      .where(eq(planos.id, current.id))
      .returning()
      .get();
    if (updated) return updated;
  }
  return db
    .insert(planos)
    .values({
      nombre: input.nombre,
      imagenPath: input.imagenPath,
      anchoPx: input.anchoPx,
      altoPx: input.altoPx,
    })
    .returning()
    .get();
}