import { perimetroNivel, type Torre } from "@features/lots/torre.types";
import type { LoteEstado } from "@features/lots/lote.types";
import { SVG_NS } from "./svg-utils";
import { ESTADO_FILL, ESTADO_STROKE } from "./lot-colors";
import { LOT_BORDER_WIDTH, LOT_LABEL_FONT_SIZE } from "./lot-renderer";

/** Compact status tags below the building name, in the same map coordinates. */
export function createBuildingCountTags(counts: Record<LoteEstado, number>, x: number, y: number): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("building-count-tags");
  group.setAttribute("pointer-events", "none");
  group.setAttribute("aria-hidden", "true");
  const statuses = ["disponible", "reservado", "vendido"] as const;
  const gap = 7;
  const width = Math.max(34, ...statuses.map((status) => String(counts[status]).length * LOT_LABEL_FONT_SIZE * 0.65 + 16));
  const height = LOT_LABEL_FONT_SIZE + 10;
  const left = x - (width * statuses.length + gap * (statuses.length - 1)) / 2;
  for (const [index, status] of statuses.entries()) {
    const tagX = left + index * (width + gap);
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(tagX));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", ESTADO_FILL[status]);
    rect.setAttribute("stroke", ESTADO_STROKE[status]);
    rect.setAttribute("stroke-width", String(LOT_BORDER_WIDTH));
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(tagX + width / 2));
    text.setAttribute("y", String(y + height / 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", "var(--c-white)");
    text.setAttribute("font-size", String(LOT_LABEL_FONT_SIZE));
    text.setAttribute("stroke", "#000");
    text.setAttribute("stroke-width", "0.6");
    text.setAttribute("paint-order", "stroke fill");
    text.setAttribute("font-weight", "700");
    text.style.fontVariantNumeric = "tabular-nums";
    text.setAttribute("data-building-count", status);
    text.textContent = String(counts[status]);
    group.append(rect, text);
  }
  return group;
}

/** Floor plans share the building's coordinates and are clipped to its perimeter. */
export function createBuildingImage(torre: Torre, nivel: number, prefix: string, opacity = 50): SVGGElement | null {
  const path = torre.imagenesNivel[String(nivel)];
  const perimetro = perimetroNivel(torre, nivel);
  if (!path || !perimetro.length) return null;
  const xs = perimetro.map((p) => p.x), ys = perimetro.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  const group = document.createElementNS(SVG_NS, "g");
  group.style.pointerEvents = "none";
  group.setAttribute("data-floor-image", String(nivel));
  const defs = document.createElementNS(SVG_NS, "defs");
  const clip = document.createElementNS(SVG_NS, "clipPath");
  const id = `${prefix}-torre-image-${torre.id}`;
  clip.id = id;
  const polygon = document.createElementNS(SVG_NS, "polygon");
  polygon.setAttribute("points", perimetro.map((p) => `${p.x},${p.y}`).join(" "));
  clip.appendChild(polygon);
  defs.appendChild(clip);
  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", path);
  for (const [key, val] of Object.entries({ x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y })) image.setAttribute(key, String(val));
  image.setAttribute("preserveAspectRatio", "xMidYMid meet");
  image.setAttribute("opacity", String(Math.max(0, Math.min(100, opacity)) / 100));
  image.setAttribute("clip-path", `url(#${id})`);
  group.append(defs, image);
  return group;
}
