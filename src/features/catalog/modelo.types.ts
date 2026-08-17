import { z } from "zod";
import type { Modelo } from "@db/schema";

export const modeloFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "Nombre demasiado largo"),
  tipo: z.enum(["casa", "apartamento"], { error: "Tipo inválido" }),
  precioBase: z.coerce.number().positive("Precio base inválido"),
  terrenoM2: z.coerce.number().nonnegative("Terreno inválido"),
  construccionM2: z.coerce.number().positive("Construcción inválida"),
  habitaciones: z.coerce.number().int().nonnegative("Habitaciones inválidas"),
  banos: z.coerce.number().nonnegative("Baños inválidos"),
  parqueos: z.coerce
    .number()
    .int()
    .nonnegative("Parqueos inválidos")
    .default(1),
  dimensionesLote: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(64, "Dimensiones demasiado largas").nullable().optional(),
  ),
  caracteristicas: z.preprocess(
    (v) => {
      if (typeof v === "string") {
        return v
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return v;
    },
    z.array(z.string()).default([]),
  ),
  orden: z.coerce.number().int("Orden inválido").default(0),
});
export type ModeloFormInput = z.infer<typeof modeloFormSchema>;

export type ModeloConCaracteristicas = Omit<Modelo, "caracteristicasJson"> & {
  caracteristicas: string[];
};

export function parseCaracteristicas(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function parseModelo(row: Modelo): ModeloConCaracteristicas {
  const { caracteristicasJson, ...rest } = row;
  return { ...rest, caracteristicas: parseCaracteristicas(caracteristicasJson) };
}