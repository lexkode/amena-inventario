export type Punto = { x: number; y: number };

export const POLIGONO_MIN_PUNTOS = 3;

export function isValidPunto(value: unknown): value is Punto {
  if (typeof value !== "object" || value === null) return false;
  const { x, y } = value as Record<string, unknown>;
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y)
  );
}

export function parsePunto(raw: unknown): Punto | null {
  if (!isValidPunto(raw)) return null;
  return { x: raw.x, y: raw.y };
}

export function parsePoligono(raw: unknown): Punto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parsePunto)
    .filter((p): p is Punto => p !== null);
}

export function parsePoligonoJson(json: string): Punto[] {
  try {
    return parsePoligono(JSON.parse(json));
  } catch {
    return [];
  }
}

export function poligonoEsValido(poligono: readonly Punto[]): boolean {
  return poligono.length >= POLIGONO_MIN_PUNTOS && poligono.every(isValidPunto);
}