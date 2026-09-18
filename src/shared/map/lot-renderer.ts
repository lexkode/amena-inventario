import type { LoteConModelo } from "@features/lots/lote.types";
import { SVG_NS } from "./svg-utils";

export const LOT_BORDER_WIDTH = 3;

export type LotPolygonOptions = {
  selected?: boolean;
  dimmed?: boolean;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  strokeDasharray?: string;
};

export function createLotPolygon(
  lote: LoteConModelo,
  opts: LotPolygonOptions,
): SVGGElement {
  const points = lote.poligono.map((p) => `${p.x},${p.y}`).join(" ");
  const borderWidth = opts.strokeWidth ?? LOT_BORDER_WIDTH;
  const clipId = `clip-lote-${lote.id}`;

  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-lote-id", String(lote.id));
  g.classList.add("lote-polygon", `lote-${lote.estado}`);
  if (opts.selected) g.classList.add("selected");
  if (opts.dimmed) g.classList.add("dimmed");

  const defs = document.createElementNS(SVG_NS, "defs");
  const clipPath = document.createElementNS(SVG_NS, "clipPath");
  clipPath.setAttribute("id", clipId);
  const clipPoly = document.createElementNS(SVG_NS, "polygon");
  clipPoly.setAttribute("points", points);
  clipPath.appendChild(clipPoly);
  defs.appendChild(clipPath);
  g.appendChild(defs);

  const fillPoly = document.createElementNS(SVG_NS, "polygon");
  fillPoly.setAttribute("points", points);
  fillPoly.style.fill = opts.fill;
  fillPoly.setAttribute("stroke", "none");
  if (opts.fillOpacity !== undefined) {
    fillPoly.setAttribute("fill-opacity", String(opts.fillOpacity));
  }
  g.appendChild(fillPoly);

  const border = document.createElementNS(SVG_NS, "polygon");
  border.setAttribute("points", points);
  border.setAttribute("fill", "none");
  border.setAttribute("stroke", opts.stroke);
  border.setAttribute("stroke-width", String(borderWidth * 2));
  border.setAttribute("stroke-linejoin", "round");
  border.setAttribute("clip-path", `url(#${clipId})`);
  border.setAttribute("pointer-events", "none");
  border.classList.add("lote-border");
  if (opts.strokeOpacity !== undefined) {
    border.setAttribute("stroke-opacity", String(opts.strokeOpacity));
  }
  if (opts.strokeDasharray) {
    border.setAttribute("stroke-dasharray", opts.strokeDasharray);
  }
  g.appendChild(border);

  return g;
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