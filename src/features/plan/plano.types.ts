import { z } from "zod";

export const planoUpsertSchema = z.object({
  nombre: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(120, "Nombre demasiado largo").optional(),
  ),
  anchoPx: z.coerce
    .number()
    .int("Ancho inválido (debe ser entero positivo)")
    .positive("Ancho inválido (debe ser entero positivo)"),
  altoPx: z.coerce
    .number()
    .int("Alto inválido (debe ser entero positivo)")
    .positive("Alto inválido (debe ser entero positivo)"),
  opacidad: z.coerce
    .number()
    .int("La opacidad debe ser un número entero")
    .min(0, "La opacidad mínima es 0%")
    .max(100, "La opacidad máxima es 100%")
    .default(80),
});
export type PlanoUpsertInput = z.infer<typeof planoUpsertSchema>;