import type { PuntoInteres } from "@features/points/punto.types";
import { PUNTO_ICONO_TAMANO_DEFAULT, PUNTO_ICONO_TAMANO_MIN, PUNTO_ICONO_TAMANO_MAX } from "@features/points/punto.types";
import { SVG_NS } from "./svg-utils";

/**
 * Tamaño compartido del marcador de punto de interés, en unidades del plano,
 * para que editor y sitio público se vean igual.
 */
export const PUNTO_MARKER_RATIO = 0.01;

export function puntoMarkerRadius(planAncho: number, planAlto: number, tamano = PUNTO_ICONO_TAMANO_DEFAULT): number {
  const percent = Number.isFinite(tamano) ? Math.max(PUNTO_ICONO_TAMANO_MIN, Math.min(PUNTO_ICONO_TAMANO_MAX, tamano)) : PUNTO_ICONO_TAMANO_DEFAULT;
  return Math.max(planAncho, planAlto) * PUNTO_MARKER_RATIO * percent / PUNTO_ICONO_TAMANO_DEFAULT;
}

/** Shared icon rendering: preserve proportions, hit area and the original fallback. */
export function createPuntoMarker(
  punto: Pick<PuntoInteres, "x" | "y"> & Partial<Pick<PuntoInteres, "iconoPath" | "tamanoIcono">>,
  planAncho: number,
  planAlto: number,
  opts: { fill?: string } = {},
): SVGGElement {
  const r = puntoMarkerRadius(planAncho, planAlto, punto.tamanoIcono);
  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("punto-marker");
  const fallback = document.createElementNS(SVG_NS, "g");
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", String(punto.x));
  circle.setAttribute("cy", String(punto.y));
  circle.setAttribute("r", String(r));
  circle.setAttribute("fill", opts.fill ?? "var(--c-accent)");
  circle.setAttribute("stroke", "#ffffff");
  circle.setAttribute("stroke-width", String(r * 0.22));
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("cx", String(punto.x));
  dot.setAttribute("cy", String(punto.y));
  dot.setAttribute("r", String(r * 0.3));
  dot.setAttribute("fill", "#ffffff");
  fallback.append(circle, dot);
  group.appendChild(fallback);
  if (punto.iconoPath) {
    fallback.style.display = "none";
    // Transparent pixels in a PNG must still allow selecting/dragging the icon.
    const hit = document.createElementNS(SVG_NS, "rect");
    const image = document.createElementNS(SVG_NS, "image");
    for (const element of [hit, image]) {
      element.setAttribute("x", String(punto.x - r));
      element.setAttribute("y", String(punto.y - r));
      element.setAttribute("width", String(r * 2));
      element.setAttribute("height", String(r * 2));
    }
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("stroke", "none");
    image.setAttribute("href", punto.iconoPath);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    image.setAttribute("pointer-events", "none");
    image.addEventListener("error", () => {
      image.remove();
      hit.remove();
      fallback.style.removeProperty("display");
    }, { once: true });
    group.append(hit, image);
  }
  return group;
}
