/**
 * Tamaño compartido del marcador de punto de interés, en unidades del plano,
 * para que editor y sitio público se vean igual.
 */
export const PUNTO_MARKER_RATIO = 0.01;

export function puntoMarkerRadius(planAncho: number, planAlto: number): number {
  return Math.max(planAncho, planAlto) * PUNTO_MARKER_RATIO;
}
