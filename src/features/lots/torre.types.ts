import { z } from "zod";
import { nombreNivelSchema, torreSchema } from "./altura.types";
import { poligonoSimple } from "@core/geometry/perimeter";
import { poligonoDentroPoligono } from "@core/geometry/perimeter";
import { nombreGrupo } from "./grupo.types";

const perimetroSchema = z.array(z.object({ x: z.number(), y: z.number() })).min(3).refine(poligonoSimple, "El perímetro debe tener área y no cruzarse a sí mismo");
const torreEditableSchema = z.object({
  nombrePersonalizado: z.string().trim().max(100).nullable().transform((v) => v || null),
  cantidadNiveles: z.number().int().min(1).max(200),
  imagenesNivel: z.record(z.string().regex(/^[1-9][0-9]*$/), z.url().refine((v) => new URL(v).protocol === "https:", "La imagen debe usar una URL HTTPS")),
  poligono: perimetroSchema,
  perimetrosNivel: z.record(z.string().regex(/^[1-9][0-9]*$/), perimetroSchema),
});
export const torreCreateSchema = torreEditableSchema.extend({
  nombrePersonalizado: torreEditableSchema.shape.nombrePersonalizado.default(null),
  cantidadNiveles: torreEditableSchema.shape.cantidadNiveles.default(1),
  imagenesNivel: torreEditableSchema.shape.imagenesNivel.default({}),
  perimetrosNivel: torreEditableSchema.shape.perimetrosNivel.default({}),
  grupo: torreSchema,
  nombreNivel: nombreNivelSchema.default("Planta"),
}).superRefine((t, ctx) => {
  if (Object.keys(t.imagenesNivel).some((nivel) => Number(nivel) > t.cantidadNiveles)) ctx.addIssue({ code: "custom", message: "La imagen debe pertenecer a un nivel existente del edificio" });
  if (Object.keys(t.perimetrosNivel).some((nivel) => Number(nivel) > t.cantidadNiveles)) ctx.addIssue({ code: "custom", message: "El perímetro debe pertenecer a un nivel existente del edificio" });
});
export const torreUpdateSchema = torreEditableSchema.partial();
export type UpdateTorreInput = z.infer<typeof torreUpdateSchema>;
export type TorreInput = z.infer<typeof torreCreateSchema>;
export type Torre = TorreInput & { id: number; createdAt: number; updatedAt: number };

export function nombreEdificio(torre: Pick<TorreInput, "grupo" | "nombrePersonalizado">): string {
  return torre.nombrePersonalizado || nombreGrupo(torre.grupo);
}

export function perimetroNivel(torre: Pick<TorreInput, "poligono"> & { perimetrosNivel?: TorreInput["perimetrosNivel"] }, nivel: number): TorreInput["poligono"] {
  return torre.perimetrosNivel?.[String(nivel)] ?? torre.poligono;
}

/** Keep a stable framing encompassing every floor, even when a floor extends beyond the base. */
export function perimetrosEdificio(torre: Pick<TorreInput, "poligono"> & { perimetrosNivel?: TorreInput["perimetrosNivel"] }): TorreInput["poligono"] {
  return [torre.poligono, ...Object.values(torre.perimetrosNivel ?? {})].flat();
}

export function validarCambioTorre(torre: Pick<TorreInput, "poligono" | "cantidadNiveles"> & { perimetrosNivel?: TorreInput["perimetrosNivel"] }, apartamentos: { poligono: TorreInput["poligono"]; nivel: number | null }[]): string | null {
  if (!poligonoSimple(torre.poligono)) return "El perímetro del edificio debe tener área y no cruzarse a sí mismo";
  if (apartamentos.some((a) => (a.nivel ?? 1) > torre.cantidadNiveles)) return "No puedes reducir los niveles mientras existan apartamentos en las plantas superiores";
  for (const [nivel, poligono] of Object.entries(torre.perimetrosNivel ?? {})) {
    if (Number(nivel) > torre.cantidadNiveles || !poligonoSimple(poligono)) return "Perímetro de nivel inválido";
  }
  if (apartamentos.some((a) => !poligonoDentroPoligono(a.poligono, perimetroNivel(torre, a.nivel ?? 1)))) return "El perímetro debe mantener dentro todos los apartamentos de su nivel";
  return null;
}
