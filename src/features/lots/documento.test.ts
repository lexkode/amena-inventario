import assert from "node:assert/strict";
import { test } from "node:test";
import { documentoBackupSchema } from "./documento.types";

const grupo = { nombre: "Torre", tipoIdentificador: "alfabetico", identificador: "A" };
const torre = { grupo, nombreNivel: "Planta", poligono: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] };
const apartamento = { tipoVivienda: "apartamento", grupo, nivel: 1, numeroLote: "1", poligono: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 10, y: 20 }] };

test("un edificio vacío conserva su perímetro al respaldar/restaurar", () => {
  const restaurado = documentoBackupSchema.parse({ version: 2, lotes: [], torres: [torre] });
  assert.deepEqual(restaurado.torres, [{ ...torre, cantidadNiveles: 1, nombrePersonalizado: null, imagenesNivel: {}, perimetrosNivel: {} }]);
});

test("respaldo con edificio y apartamentos conserva la geometría separada", () => {
  const restaurado = documentoBackupSchema.parse({ version: 2, lotes: [apartamento], torres: [torre] });
  assert.deepEqual(restaurado.torres[0].poligono, torre.poligono);
  assert.deepEqual(restaurado.lotes[0].poligono, apartamento.poligono);
});

test("rechaza apartamentos sin edificio o fuera de su perímetro", () => {
  assert.equal(documentoBackupSchema.safeParse({ lotes: [apartamento], torres: [] }).success, false);
  assert.equal(documentoBackupSchema.safeParse({ lotes: [{ ...apartamento, poligono: [{ x: 90, y: 90 }, { x: 110, y: 90 }, { x: 90, y: 110 }] }], torres: [torre] }).success, false);
});

test("convierte respaldos antiguos, incluidos los anteriores al perímetro", () => {
  const restaurado = documentoBackupSchema.parse([apartamento, { ...apartamento, nivel: 2 }]);
  assert.equal(restaurado.torres.length, 1);
  assert.equal(restaurado.torres[0].cantidadNiveles, 2);
  assert.deepEqual(restaurado.torres[0].poligono, [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }, { x: 10, y: 20 }]);
  assert.deepEqual(documentoBackupSchema.parse([]), { lotes: [], torres: [] });
});

test("conserva nombre, niveles e imágenes independientes al respaldar", () => {
  const edificio = { ...torre, nombrePersonalizado: "Mirador", cantidadNiveles: 3, imagenesNivel: { "1": "https://media.example.com/planta-1.webp", "3": "https://media.example.com/planta-3.webp" } };
  const restaurado = documentoBackupSchema.parse({ version: 2, lotes: [{ ...apartamento, nivel: 3 }], torres: [edificio] });
  assert.deepEqual(restaurado.torres[0], { ...edificio, perimetrosNivel: {} });
});

test("respaldos conservan perímetros por nivel y apartamentos fuera de la base pero dentro de su planta", () => {
  const perimetro = torre.poligono.map((p) => ({ x: p.x + 200, y: p.y }));
  const edificio = { ...torre, cantidadNiveles: 2, perimetrosNivel: { "2": perimetro } };
  const vivienda = { ...apartamento, nivel: 2, poligono: apartamento.poligono.map((p) => ({ x: p.x + 200, y: p.y })) };
  const restaurado = documentoBackupSchema.parse({ lotes: [vivienda], torres: [edificio] });
  assert.deepEqual(restaurado.torres[0].perimetrosNivel, edificio.perimetrosNivel);
  assert.deepEqual(restaurado.lotes[0].poligono, vivienda.poligono);
});

test("publicaciones anteriores sin cantidad de niveles infieren la planta más alta", () => {
  assert.equal(documentoBackupSchema.parse({ version: 2, lotes: [{ ...apartamento, nivel: 4 }], torres: [torre] }).torres[0].cantidadNiveles, 4);
});

test("rechaza una planta inexistente si la cantidad está definida", () => {
  assert.equal(documentoBackupSchema.safeParse({ lotes: [{ ...apartamento, nivel: 2 }], torres: [{ ...torre, cantidadNiveles: 1 }] }).success, false);
});

test("datos malformados fallan la validación sin lanzar excepciones", () => {
  assert.equal(documentoBackupSchema.safeParse({ lotes: [null], torres: [null] }).success, false);
});
