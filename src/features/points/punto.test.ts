import assert from "node:assert/strict";
import { test } from "node:test";
import { puntoCreateSchema, puntoUpdateSchema, puntoIconoSchema, puntoComparable, type PuntoInteres } from "./punto.types";

test("puntos nuevos y publicaciones anteriores mantienen el marcador y tamaño actuales", () => {
  const punto = puntoCreateSchema.parse({ nombre: "Parque", x: 100, y: 200 });
  assert.equal(punto.iconoPath, null);
  assert.equal(punto.tamanoIcono, 100);
  assert.deepEqual(puntoIconoSchema.parse({ nombre: "Parque" }), { iconoPath: null, tamanoIcono: 100 });
});

test("permite icono HTTPS opcional y un tamaño entero entre 25% y 300%", () => {
  assert.deepEqual(puntoUpdateSchema.parse({ iconoPath: "https://example.com/parque.png", tamanoIcono: "150" }), {
    iconoPath: "https://example.com/parque.png", tamanoIcono: 150,
  });
  assert.deepEqual(puntoUpdateSchema.parse({ iconoPath: null }), { iconoPath: null });
  for (const tamanoIcono of [0, 24, 301, -1, 50.5, NaN, Infinity]) {
    assert.equal(puntoUpdateSchema.safeParse({ tamanoIcono }).success, false);
  }
  for (const iconoPath of ["javascript:alert(1)", "data:image/png;base64,abc", "http://example.com/icon.png", "/icon.png"]) {
    assert.equal(puntoUpdateSchema.safeParse({ iconoPath }).success, false);
  }
});

test("editar texto o posición no elimina la configuración de icono", () => {
  assert.deepEqual(puntoUpdateSchema.parse({ nombre: "Piscina" }), { nombre: "Piscina" });
  assert.deepEqual(puntoUpdateSchema.parse({ x: 15, y: 25 }), { x: 15, y: 25 });
});

test("icono y tamaño participan en la detección de cambios pendientes de publicación", () => {
  const punto: PuntoInteres = {
    id: 1, nombre: "Parque", informacion: "", x: 10, y: 20,
    iconoPath: null, tamanoIcono: 100, createdAt: 0, updatedAt: 0, imagenes: [],
  };
  assert.notEqual(puntoComparable(punto), puntoComparable({ ...punto, tamanoIcono: 125 }));
  assert.notEqual(puntoComparable(punto), puntoComparable({ ...punto, iconoPath: "https://example.com/icon.webp" }));
  const { iconoPath, tamanoIcono, ...old } = punto;
  assert.equal(puntoComparable(punto), puntoComparable(old as PuntoInteres));
});
