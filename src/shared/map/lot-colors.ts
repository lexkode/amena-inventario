import type { LoteEstado } from "@features/lots/lote.types";

export const ESTADO_FILL: Record<LoteEstado, string> = {
  disponible: "rgba(34, 197, 94, 0.7)",
  reservado: "rgba(234, 179, 8, 0.7)",
  vendido: "rgba(239, 68, 68, 0.7)",
};

export const ESTADO_STROKE: Record<LoteEstado, string> = {
  disponible: "#16a34a",
  reservado: "#ca8a04",
  vendido: "#dc2626",
};

export const ESTADO_LABEL: Record<LoteEstado, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};