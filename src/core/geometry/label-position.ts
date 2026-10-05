import type { Punto } from "./index";
import { puntoDentroPoligono } from "./perimeter";

/** Signed distance to the closest edge, positive inside the polygon. */
function edgeDistance(point: Punto, polygon: readonly Punto[]): number {
  let squared = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
    squared = Math.min(squared, (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2);
  }
  return Math.sqrt(squared) * (puntoDentroPoligono(point, polygon) ? 1 : -1);
}

/** Area-weighted center, with an interior fallback for concave shapes. */
export function polygonLabelPoint(polygon: readonly Punto[]): Punto | null {
  if (!polygon.length) return null;
  const minX = Math.min(...polygon.map((p) => p.x)), maxX = Math.max(...polygon.map((p) => p.x));
  const minY = Math.min(...polygon.map((p) => p.y)), maxY = Math.max(...polygon.map((p) => p.y));
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  // Local coordinates avoid cancellation when a small lot is far from the origin.
  const origin = polygon[0];
  let area = 0, x = 0, y = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const ax = a.x - origin.x, ay = a.y - origin.y;
    const bx = b.x - origin.x, by = b.y - origin.y;
    const cross = ax * by - bx * ay;
    area += cross;
    x += (ax + bx) * cross;
    y += (ay + by) * cross;
  }
  // Incomplete/flat polygons can occur while editing.
  if (Math.abs(area) <= Number.EPSILON * (maxX - minX) * (maxY - minY)) return center;
  const centroid = { x: origin.x + x / (3 * area), y: origin.y + y / (3 * area) };
  if (edgeDistance(centroid, polygon) > 0) return centroid;

  // A U/C-shaped polygon can have its centroid in the empty notch. Search for
  // the interior point with maximum edge clearance using bounded subdivision.
  type Cell = { point: Punto; halfW: number; halfH: number; distance: number; upper: number };
  const cell = (point: Punto, halfW: number, halfH: number): Cell => {
    const distance = edgeDistance(point, polygon);
    return { point, halfW, halfH, distance, upper: distance + Math.hypot(halfW, halfH) };
  };
  const queue: Cell[] = [];
  const enqueue = (item: Cell): void => {
    let low = 0, high = queue.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (queue[mid].upper < item.upper) low = mid + 1;
      else high = mid;
    }
    queue.splice(low, 0, item);
  };
  let best = cell(origin, 0, 0);
  enqueue(cell(center, (maxX - minX) / 2, (maxY - minY) / 2));
  const precision = Math.max(maxX - minX, maxY - minY) * 0.0001;
  while (queue.length) {
    const current = queue.pop()!;
    if (current.distance > best.distance) best = current;
    if (current.upper - best.distance <= precision) continue;
    const { point, halfW, halfH } = current;
    if (halfW >= halfH) {
      enqueue(cell({ x: point.x - halfW / 2, y: point.y }, halfW / 2, halfH));
      enqueue(cell({ x: point.x + halfW / 2, y: point.y }, halfW / 2, halfH));
    } else {
      enqueue(cell({ x: point.x, y: point.y - halfH / 2 }, halfW, halfH / 2));
      enqueue(cell({ x: point.x, y: point.y + halfH / 2 }, halfW, halfH / 2));
    }
  }
  return best.point;
}
