import assert from "node:assert/strict";
import { test } from "node:test";
import { puntoDentroPoligono, segmentoDentroPoligono, poligonoDentroPoligono, poligonoSimple } from "./perimeter";

const puntos = (coords: number[][]) => coords.map(([x, y]) => ({ x, y }));
const edificio = puntos([[0, 0], [100, 0], [100, 100], [0, 100]]);
const concavo = puntos([[0, 0], [100, 0], [100, 100], [70, 100], [70, 30], [30, 30], [30, 100], [0, 100]]);

test("el borde del edificio forma parte del perímetro permitido", () => {
  assert.equal(puntoDentroPoligono({ x: 0, y: 40 }, edificio), true);
  assert.equal(poligonoDentroPoligono(edificio, edificio), true);
  assert.equal(poligonoDentroPoligono(puntos([[0, 10], [50, 10], [50, 50], [0, 50]]), edificio), true);
});

test("rechaza vértices o lados fuera del edificio", () => {
  assert.equal(puntoDentroPoligono({ x: 101, y: 40 }, edificio), false);
  assert.equal(poligonoDentroPoligono(puntos([[10, 10], [120, 10], [10, 50]]), edificio), false);
  assert.equal(segmentoDentroPoligono({ x: 10, y: 80 }, { x: 90, y: 80 }, concavo), false);
  // All vertices are inside, but the top edge crosses the courtyard.
  assert.equal(poligonoDentroPoligono(puntos([[10, 10], [90, 10], [90, 80], [10, 80]]), concavo), false);
});

test("comprueba cada intervalo aunque el punto medio esté dentro", () => {
  const dobleEntrante = puntos([[0, 0], [100, 0], [100, 100], [80, 100], [80, 30], [70, 30], [70, 100], [30, 100], [30, 30], [20, 30], [20, 100], [0, 100]]);
  assert.equal(puntoDentroPoligono({ x: 50, y: 80 }, dobleEntrante), true);
  assert.equal(segmentoDentroPoligono({ x: 10, y: 80 }, { x: 90, y: 80 }, dobleEntrante), false);
});

test("edificios cóncavos, sentido inverso y lados colineales válidos", () => {
  assert.equal(poligonoSimple(concavo), true);
  assert.equal(poligonoDentroPoligono(puntos([[0, 0], [20, 0], [20, 80], [0, 80]]), [...concavo].reverse()), true);
  assert.equal(poligonoSimple(puntos([[0, 0], [50, 0], [100, 0], [100, 100], [0, 100]])), true);
});

test("rechaza cruces, área nula, vértices repetidos y retrocesos", () => {
  for (const poligono of [
    puntos([[0, 0], [100, 100], [0, 100], [100, 0]]),
    puntos([[0, 0], [10, 0], [20, 0]]),
    puntos([[0, 0], [10, 0], [10, 0], [0, 10]]),
    puntos([[0, 0], [20, 0], [10, 0], [10, 10], [0, 10]]),
  ]) assert.equal(poligonoSimple(poligono), false);
});
