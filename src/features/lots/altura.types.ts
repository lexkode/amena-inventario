import { z } from "zod";
import { claveGrupo, grupoViviendasSchema, type GrupoViviendas } from "./grupo.types";

export const NOMENCLATURAS_TORRE = ["Torre", "Edificio", "Complejo", "Condominio"] as const;
export const NOMENCLATURAS_NIVEL = ["Planta", "Piso", "Nivel"] as const;
export const nombreTorreSchema = z.enum(NOMENCLATURAS_TORRE);
export const nombreNivelSchema = z.enum(NOMENCLATURAS_NIVEL);
export const tipoViviendaSchema = z.enum(["casa", "apartamento"]);
export const nivelSchema = z.number().int().positive();
export const torreSchema = grupoViviendasSchema.refine(
  (grupo) => NOMENCLATURAS_TORRE.some((nombre) => nombre === grupo.nombre),
  "La nomenclatura debe ser Torre, Edificio, Complejo o Condominio",
);

export type UbicacionVivienda = {
  tipoVivienda: "casa" | "apartamento";
  grupo: GrupoViviendas | null;
  nivel: number | null;
};

export function mismaUbicacion(a: UbicacionVivienda, b: UbicacionVivienda): boolean {
  return a.tipoVivienda === b.tipoVivienda && claveGrupo(a.grupo) === claveGrupo(b.grupo)
    && (a.tipoVivienda === "casa" || a.nivel === b.nivel);
}

export function validarUbicacion(vivienda: UbicacionVivienda): string | null {
  if (vivienda.tipoVivienda === "apartamento") {
    if (!torreSchema.safeParse(vivienda.grupo).success) return "El apartamento debe pertenecer a una torre válida";
    if (!nivelSchema.safeParse(vivienda.nivel).success) return "El apartamento debe tener una planta/nivel mayor que cero";
  } else if (vivienda.nivel !== null) return "Las casas no tienen planta/nivel de torre";
  return null;
}
