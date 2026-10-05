import assert from "node:assert/strict";
import { test } from "node:test";
import { puntoMarkerRadius } from "./punto-marker";

test("100% conserva exactamente el radio original en editor y mapa público", () => {
  assert.equal(puntoMarkerRadius(1000, 800), 10);
  assert.equal(puntoMarkerRadius(1000, 800, 100), 10);
  assert.equal(puntoMarkerRadius(800, 1000, 100), 10);
});

test("el tamaño escala proporcionalmente y tolera valores incompletos en la previsualización", () => {
  assert.equal(puntoMarkerRadius(1000, 800, 150), 15);
  assert.equal(puntoMarkerRadius(1000, 800, 25), 2.5);
  assert.equal(puntoMarkerRadius(1000, 800, 300), 30);
  assert.equal(puntoMarkerRadius(1000, 800, NaN), 10);
  assert.equal(puntoMarkerRadius(1000, 800, 0), 2.5);
  assert.equal(puntoMarkerRadius(1000, 800, 400), 30);
});
