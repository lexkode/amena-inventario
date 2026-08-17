import type { LoteConModelo } from "@features/lots/lote.types";
import { SVG_NS } from "./svg-utils";

export type LotPolygonOptions = {
  selected?: boolean;
  dimmed?: boolean;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  strokeOpacity?: number;
};

export function createLotPolygon(
  lote: LoteConModelo,
  opts: LotPolygonOptions,
): SVGPolygonElement {
  const polygon = document.createElementNS(SVG_NS, "polygon");
  polygon.setAttribute(
    "points",
    lote.poligono.map((p) => `${p.x},${p.y}`).join(" "),
  );
  polygon.setAttribute("fill", opts.fill);
  polygon.setAttribute("stroke", opts.stroke);
  polygon.setAttribute("stroke-width", String(opts.strokeWidth ?? 2));
  if (opts.strokeOpacity !== undefined) {
    polygon.setAttribute("stroke-opacity", String(opts.strokeOpacity));
  }
  polygon.setAttribute("data-lote-id", String(lote.id));
  polygon.classList.add("lote-polygon");
  if (opts.selected) polygon.classList.add("selected");
  if (opts.dimmed) polygon.classList.add("dimmed");
  return polygon;
}

export function createLotLabel(
  lote: LoteConModelo,
  opts: { fontSize?: number; fontWeight?: string; strokeWidth?: number } = {},
): SVGTextElement | null {
  if (lote.poligono.length === 0) return null;
  const cx = lote.poligono.reduce((s, p) => s + p.x, 0) / lote.poligono.length;
  const cy = lote.poligono.reduce((s, p) => s + p.y, 0) / lote.poligono.length;
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(cx));
  text.setAttribute("y", String(cy));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("fill", "#fff");
  text.setAttribute("stroke", "#000");
  text.setAttribute("stroke-width", String(opts.strokeWidth ?? 0.6));
  text.setAttribute("paint-order", "stroke fill");
  text.setAttribute("font-size", String(opts.fontSize ?? 20));
  text.setAttribute("font-weight", opts.fontWeight ?? "700");
  text.setAttribute("pointer-events", "none");
  text.textContent = lote.numeroLote;
  return text;
}