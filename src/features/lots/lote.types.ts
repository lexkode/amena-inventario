import { z } from "zod";
import type { Lote, Modelo } from "@db/schema";
import type { Punto } from "@core/geometry";

export { type Punto } from "@core/geometry";

export const puntoSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const poligonoSchema = z
  .array(puntoSchema)
  .min(3, "polígono debe tener al menos 3 puntos");

export const loteEstadoSchema = z.enum(["disponible", "reservado", "vendido"]);
export type LoteEstado = z.infer<typeof loteEstadoSchema>;
export const ESTADOS_LOTE = loteEstadoSchema.options as readonly LoteEstado[];

const numeroOpcional = z.preprocess(
  (v) => (v === "" ? null : v),
  z.number().nonnegative().nullable(),
);

const modeloIdOpcional = z.preprocess(
  (v) => (v === "" ? null : v),
  z.number().int().positive().nullable(),
);

const dimensionesOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .max(64, "dimensionesLote demasiado largo (máx 64)")
    .nullable(),
);

export const loteCreateSchema = z.object({
  numeroLote: z
    .string()
    .trim()
    .min(1, "numeroLote es obligatorio")
    .max(64, "numeroLote demasiado largo (máx 64)"),
  estado: loteEstadoSchema.default("disponible"),
  poligono: poligonoSchema,
  modeloId: modeloIdOpcional.optional(),
  terrenoM2: numeroOpcional.optional(),
  dimensionesLote: dimensionesOpcional.optional(),
});
export type CreateLoteInput = z.infer<typeof loteCreateSchema>;

export const loteUpdateSchema = z.object({
  numeroLote: z
    .string()
    .trim()
    .min(1, "numeroLote no puede estar vacío")
    .max(64, "numeroLote demasiado largo (máx 64)")
    .optional(),
  estado: loteEstadoSchema.optional(),
  poligono: poligonoSchema.optional(),
  modeloId: modeloIdOpcional.optional(),
  terrenoM2: numeroOpcional.optional(),
  dimensionesLote: dimensionesOpcional.optional(),
});
export type UpdateLoteInput = z.infer<typeof loteUpdateSchema>;

const backupImagenSchema = z.object({ path: z.string().min(1) });

export const loteBackupItemSchema = z.object({
  numeroLote: z
    .string()
    .trim()
    .min(1, "numeroLote es obligatorio")
    .max(64, "numeroLote demasiado largo (máx 64)"),
  estado: loteEstadoSchema.default("disponible"),
  poligono: poligonoSchema,
  modeloId: z.number().int().positive().nullable().default(null),
  terrenoM2: z.number().nonnegative().nullable().default(null),
  dimensionesLote: z.string().max(64).nullable().default(null),
  imagenes: z.array(backupImagenSchema).default([]),
});
export type LoteBackupItem = z.infer<typeof loteBackupItemSchema>;

export const loteBackupSchema = z.array(loteBackupItemSchema);

export type ModeloConCaracteristicas = Omit<Modelo, "caracteristicasJson"> & {
  caracteristicas: string[];
};

export const MAX_IMAGENES_POR_LOTE = 10;

export type LoteImagenItem = { id: number; path: string };

export type LoteConModelo = Omit<Lote, "poligonoJson"> & {
  poligono: Punto[];
  modelo: ModeloConCaracteristicas | null;
  imagenes: LoteImagenItem[];
};