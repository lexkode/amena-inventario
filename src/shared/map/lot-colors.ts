import type { LoteEstado } from "@features/lots/lote.types";

export const ESTADO_FILL: Record<LoteEstado, string> = {
  disponible: "rgba(35, 161, 87, 0.7)",
  reservado: "rgba(199, 147, 31, 0.7)",
  vendido: "rgba(211, 60, 60, 0.7)",
};

export const ESTADO_STROKE: Record<LoteEstado, string> = {
  disponible: "#23a157",
  reservado: "#c7931f",
  vendido: "#d33c3c",
};

export const ESTADO_LABEL: Record<LoteEstado, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};