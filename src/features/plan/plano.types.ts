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
});
export type PlanoUpsertInput = z.infer<typeof planoUpsertSchema>;