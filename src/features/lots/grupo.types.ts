import { z } from "zod";

export const NOMENCLATURAS_GRUPO = ["Polígono", "Etapa", "Sector", "Fase", "Cluster"] as const;
export const tipoIdentificadorSchema = z.enum(["numerico", "alfabetico"]);
export const nombreGrupoSchema = z.string().trim().min(1).max(64);
export const grupoViviendasSchema = z.object({
  nombre: nombreGrupoSchema,
  tipoIdentificador: tipoIdentificadorSchema,
  identificador: z.string().trim().toUpperCase().min(1).max(16),
}).superRefine((grupo, ctx) => {
  const valido = grupo.tipoIdentificador === "numerico"
    ? /^[0-9]+$/.test(grupo.identificador)
    : /^[A-ZÑ]+$/.test(grupo.identificador);
  if (!valido) ctx.addIssue({ code: "custom", path: ["identificador"], message: "El identificador debe contener solo números o solo letras según el tipo elegido" });
}).transform((grupo) => ({
  ...grupo,
  identificador: grupo.tipoIdentificador === "numerico"
    ? grupo.identificador.replace(/^0+(?=\d)/, "")
    : grupo.identificador,
}));

export type GrupoViviendas = z.infer<typeof grupoViviendasSchema>;
export function nombreGrupo(grupo: GrupoViviendas | null | undefined): string {
  return grupo ? `${grupo.nombre} ${grupo.identificador}` : "Sin grupo";
}
export function claveGrupo(grupo: GrupoViviendas | null | undefined): string {
  return grupo ? JSON.stringify([grupo.nombre, grupo.tipoIdentificador, grupo.identificador]) : "";
}
