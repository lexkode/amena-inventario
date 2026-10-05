import type { Punto } from "./index";

const EPS = 1e-7;
const cross = (a: Punto, b: Punto) => a.x * b.y - a.y * b.x;
const sub = (a: Punto, b: Punto): Punto => ({ x: a.x - b.x, y: a.y - b.y });
const at = (a: Punto, b: Punto, t: number): Punto => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function sobreSegmento(p: Punto, a: Punto, b: Punto): boolean {
  return Math.abs(cross(sub(b, a), sub(p, a))) < EPS
    && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS
    && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
}

/** Includes the boundary: apartments may touch the building's walls. */
export function puntoDentroPoligono(p: Punto, perimetro: readonly Punto[]): boolean {
  let dentro = false;
  for (let i = 0; i < perimetro.length; i++) {
    const a = perimetro[i], b = perimetro[(i + 1) % perimetro.length];
    if (sobreSegmento(p, a, b)) return true;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

function intersecciones(a: Punto, b: Punto, c: Punto, d: Punto): number[] {
  const r = sub(b, a), s = sub(d, c), ca = sub(c, a);
  const denominador = cross(r, s);
  if (Math.abs(denominador) > EPS) {
    const t = cross(ca, s) / denominador, u = cross(ca, r) / denominador;
    return t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS ? [Math.max(0, Math.min(1, t))] : [];
  }
  if (Math.abs(cross(ca, r)) > EPS) return [];
  const longitud = r.x * r.x + r.y * r.y;
  if (longitud < EPS) return sobreSegmento(a, c, d) ? [0] : [];
  const tc = (ca.x * r.x + ca.y * r.y) / longitud;
  const da = sub(d, a), td = (da.x * r.x + da.y * r.y) / longitud;
  const inicio = Math.max(0, Math.min(tc, td)), fin = Math.min(1, Math.max(tc, td));
  return inicio <= fin + EPS ? [inicio, fin] : [];
}

/** Check every interval, not just vertices/midpoints (concave buildings). */
export function segmentoDentroPoligono(a: Punto, b: Punto, perimetro: readonly Punto[]): boolean {
  if (!puntoDentroPoligono(a, perimetro) || !puntoDentroPoligono(b, perimetro)) return false;
  const cortes = [0, 1];
  for (let i = 0; i < perimetro.length; i++) cortes.push(...intersecciones(a, b, perimetro[i], perimetro[(i + 1) % perimetro.length]));
  cortes.sort((x, y) => x - y);
  return cortes.every((t, i) => i === 0 || t - cortes[i - 1] < EPS || puntoDentroPoligono(at(a, b, (t + cortes[i - 1]) / 2), perimetro));
}

export function poligonoSimple(poligono: readonly Punto[]): boolean {
  if (poligono.length < 3 || poligono.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
  let area = 0;
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i], b = poligono[(i + 1) % poligono.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < EPS) return false;
    area += cross(a, b);
    const anterior = poligono[(i + poligono.length - 1) % poligono.length];
    if (sobreSegmento(b, anterior, a) || sobreSegmento(anterior, a, b)) return false;
    for (let j = i + 2; j < poligono.length; j++) {
      if (i === 0 && j === poligono.length - 1) continue;
      if (intersecciones(a, b, poligono[j], poligono[(j + 1) % poligono.length]).length) return false;
    }
  }
  return Math.abs(area) > EPS;
}

export function poligonoDentroPoligono(poligono: readonly Punto[], perimetro: readonly Punto[]): boolean {
  return poligonoSimple(poligono) && poligonoSimple(perimetro)
    && poligono.every((a, i) => segmentoDentroPoligono(a, poligono[(i + 1) % poligono.length], perimetro));
}
