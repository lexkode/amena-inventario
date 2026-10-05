import { z } from "zod";
import type { Lote, Modelo } from "@db/schema";
import type { Punto } from "@core/geometry";
import { grupoViviendasSchema } from "./grupo.types";
import { tipoViviendaSchema, nivelSchema, nombreNivelSchema, validarUbicacion } from "./altura.types";

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
    .max(64, "Dimensiones del terreno demasiado largas (máx 64)")
    .nullable(),
);

export const plantaArquitectonicaSchema = z.url()
  .refine((value) => new URL(value).protocol === "https:", "La planta debe usar una URL HTTPS")
  .nullable();

export const loteCreateSchema = z.object({
  tipoVivienda: tipoViviendaSchema.default("casa"),
  nivel: nivelSchema.nullable().default(null),
  nombreNivel: nombreNivelSchema.default("Planta"),
  grupo: grupoViviendasSchema.nullable().optional(),
  numeroLote: z
    .string()
    .trim()
    .min(1, "El número de vivienda es obligatorio")
    .max(64, "Número de vivienda demasiado largo (máx 64)"),
  estado: loteEstadoSchema.default("disponible"),
  poligono: poligonoSchema,
  modeloId: modeloIdOpcional.optional(),
  terrenoM2: numeroOpcional.optional(),
  dimensionesLote: dimensionesOpcional.optional(),
  plantaArquitectonicaPath: plantaArquitectonicaSchema.optional(),
}).superRefine((vivienda, ctx) => {
  const error = validarUbicacion({ ...vivienda, grupo: vivienda.grupo ?? null });
  if (error) ctx.addIssue({ code: "custom", message: error });
});
export type CreateLoteInput = z.infer<typeof loteCreateSchema>;

export const loteUpdateSchema = z.object({
  tipoVivienda: tipoViviendaSchema.optional(),
  nivel: nivelSchema.nullable().optional(),
  nombreNivel: nombreNivelSchema.optional(),
  grupo: grupoViviendasSchema.nullable().optional(),
  numeroLote: z
    .string()
    .trim()
    .min(1, "El número de vivienda no puede estar vacío")
    .max(64, "Número de vivienda demasiado largo (máx 64)")
    .optional(),
  estado: loteEstadoSchema.optional(),
  poligono: poligonoSchema.optional(),
  modeloId: modeloIdOpcional.optional(),
  terrenoM2: numeroOpcional.optional(),
  dimensionesLote: dimensionesOpcional.optional(),
  plantaArquitectonicaPath: plantaArquitectonicaSchema.optional(),
});
export type UpdateLoteInput = z.infer<typeof loteUpdateSchema>;

const backupImagenSchema = z.object({ path: z.string().min(1) });

export const loteBackupItemSchema = z.object({
  tipoVivienda: tipoViviendaSchema.default("casa"),
  nivel: nivelSchema.nullable().default(null),
  nombreNivel: nombreNivelSchema.default("Planta"),
  grupo: grupoViviendasSchema.nullable().default(null),
  numeroLote: z
    .string()
    .trim()
    .min(1, "El número de vivienda es obligatorio")
    .max(64, "Número de vivienda demasiado largo (máx 64)"),
  estado: loteEstadoSchema.default("disponible"),
  poligono: poligonoSchema,
  modeloId: z.number().int().positive().nullable().default(null),
  terrenoM2: z.number().nonnegative().nullable().default(null),
  dimensionesLote: z.string().max(64).nullable().default(null),
  plantaArquitectonicaPath: plantaArquitectonicaSchema.default(null),
  imagenes: z.array(backupImagenSchema).default([]),
}).superRefine((vivienda, ctx) => {
  const error = validarUbicacion(vivienda);
  if (error) ctx.addIssue({ code: "custom", message: error });
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
