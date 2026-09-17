import { z } from "zod";
import type { PuntoInteresRow } from "@core/db/schema";

export const MAX_IMAGENES_POR_PUNTO = 8;

export const puntoCreateSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre es demasiado largo (máx 120)"),
  informacion: z.string().trim().max(2000, "La información es demasiado larga").default(""),
  x: z.coerce.number(),
  y: z.coerce.number(),
});
export type CreatePuntoInput = z.infer<typeof puntoCreateSchema>;

export const puntoUpdateSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede estar vacío").max(120).optional(),
  informacion: z.string().trim().max(2000).optional(),
  x: z.coerce.number().optional(),
  y: z.coerce.number().optional(),
});
export type UpdatePuntoInput = z.infer<typeof puntoUpdateSchema>;

export type PuntoImagenItem = { id: number; path: string };

export type PuntoInteres = PuntoInteresRow & {
  imagenes: PuntoImagenItem[];
};

export function puntoComparable(punto: PuntoInteres): string {
  return JSON.stringify({
    nombre: punto.nombre,
    informacion: punto.informacion,
    x: punto.x,
    y: punto.y,
    imagenes: punto.imagenes.map((i) => i.path),
  });
}

export function comparablePuntos(puntos: PuntoInteres[]): string {
  return JSON.stringify(puntos.map(puntoComparable));
}
