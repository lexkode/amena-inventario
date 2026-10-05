import assert from "node:assert/strict";
import { test } from "node:test";
import { polygonLabelPoint } from "./label-position";
import { puntoDentroPoligono } from "./perimeter";

const points = (coords: number[][]) => coords.map(([x, y]) => ({ x, y }));

test("centrar no depende de cuántos vértices se dibujaron en cada lado", () => {
  const rectangle = points([[0, 0], [10, 0], [20, 0], [30, 0], [100, 0], [100, 60], [0, 60]]);
  assert.deepEqual(polygonLabelPoint(rectangle), { x: 50, y: 30 });
  assert.deepEqual(polygonLabelPoint([...rectangle].reverse()), { x: 50, y: 30 });
  assert.deepEqual(polygonLabelPoint([...rectangle, rectangle[0]]), { x: 50, y: 30 });
});

test("usa el centro del área de una figura irregular, no el de sus límites", () => {
  const trapezoid = points([[0, 0], [100, 0], [60, 60], [0, 60]]);
  const center = polygonLabelPoint(trapezoid)!;
  assert.ok(Math.abs(center.x - 245 / 6) < 1e-10);
  assert.ok(Math.abs(center.y - 27.5) < 1e-10);
  const translated = polygonLabelPoint(trapezoid.map(({ x, y }) => ({ x: x + 1e9, y: y + 1e9 })))!;
  assert.ok(Math.abs(translated.x - 1e9 - center.x) < 1e-6);
  assert.ok(Math.abs(translated.y - 1e9 - center.y) < 1e-6);
});

test("mantiene la etiqueta dentro de figuras cóncavas con el centro fuera", () => {
  const shapes = [
    points([[0, 0], [100, 0], [100, 100], [70, 100], [70, 30], [30, 30], [30, 100], [0, 100]]),
    points([[0, 0], [100, 0], [100, 20], [20, 20], [20, 100], [0, 100]]),
  ];
  for (const shape of shapes) {
    for (const polygon of [shape, [...shape].reverse()]) {
      const center = polygonLabelPoint(polygon)!;
      assert.ok(puntoDentroPoligono(center, polygon));
      // Leave actual room for text instead of placing it on a wall/notch.
      for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8], [0, 8]]) {
        assert.ok(puntoDentroPoligono({ x: center.x + dx, y: center.y + dy }, polygon));
      }
    }
  }
});

test("tolera polígonos incompletos durante la edición", () => {
  assert.equal(polygonLabelPoint([]), null);
  assert.deepEqual(polygonLabelPoint(points([[5, 8]])), { x: 5, y: 8 });
  assert.deepEqual(polygonLabelPoint(points([[0, 0], [20, 20], [40, 40]])), { x: 20, y: 20 });
});
