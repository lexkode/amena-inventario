import assert from "node:assert/strict";
import { test } from "node:test";
import { duplicateBuilding, type BuildingCopy } from "./building-copy";
import { validarCambioTorre } from "@features/lots/torre.types";

const square = (x: number, y: number, size: number) => [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }];
const source: BuildingCopy = {
  torre: {
    id: 8, grupo: { nombre: "Torre", identificador: "A", tipoIdentificador: "alfabetico" },
    nombrePersonalizado: "Amelia", nombreNivel: "Planta", cantidadNiveles: 5,
    poligono: square(0, 0, 100), perimetrosNivel: { "2": square(0, 0, 120) },
    imagenesNivel: { "1": "https://example.com/planta.png", "2": "https://example.com/planta2.png" },
    createdAt: 1, updatedAt: 1,
  },
  apartamentos: [1, 2, 5].map((nivel) => ({
    id: 70 + nivel, torreId: 8,
    grupo: { nombre: "Torre", identificador: "A", tipoIdentificador: "alfabetico" },
    tipoVivienda: "apartamento", nivel, nombreNivel: "Planta", numeroLote: "1", estado: "reservado",
    poligono: square(10, 10, 20), modeloId: null, modelo: null, terrenoM2: null, dimensionesLote: null,
    plantaArquitectonicaPath: "https://example.com/apartamento.png",
    imagenes: [{ id: nivel, path: "https://example.com/galeria.png" }], createdAt: 1, updatedAt: 1,
  })),
};

test("copia todos los niveles y traslada juntos los perímetros y apartamentos", () => {
  let id = -1;
  const copy = duplicateBuilding(source, { ...source.torre.grupo, identificador: "B" }, "Amelia copia", { x: 260, y: 360 }, () => id--);
  assert.deepEqual(copy.torre.poligono, square(200, 300, 100));
  assert.deepEqual(copy.torre.perimetrosNivel["2"], square(200, 300, 120));
  assert.deepEqual(copy.apartamentos.map((a) => a.nivel), [1, 2, 5]);
  for (const lote of copy.apartamentos) {
    assert.deepEqual(lote.poligono, square(210, 310, 20));
    assert.equal(lote.torreId, copy.torre.id);
    assert.equal(lote.grupo?.identificador, "B");
    assert.equal(lote.numeroLote, "1");
    assert.equal(lote.estado, "reservado");
  }
  assert.equal(validarCambioTorre(copy.torre, copy.apartamentos), null);
});

test("copia imágenes por URL con IDs independientes y sin mutar el original", () => {
  const original = structuredClone(source);
  let id = -1;
  const create = () => duplicateBuilding(source, { ...source.torre.grupo, identificador: "B" }, "Copia", { x: 260, y: 360 }, () => id--);
  const first = create(), second = create();
  const ids = [first, second].flatMap((copy) => [copy.torre.id, ...copy.apartamentos.flatMap((a) => [a.id, ...a.imagenes.map((image) => image.id)])]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => id < 0));
  assert.deepEqual(first.torre.imagenesNivel, source.torre.imagenesNivel);
  assert.equal(first.imageSources.get(first.apartamentos[0].imagenes[0].id), source.apartamentos[0].imagenes[0].id);
  assert.equal(first.apartamentos[0].plantaArquitectonicaPath, source.apartamentos[0].plantaArquitectonicaPath);
  first.torre.perimetrosNivel["2"][0].x = -999;
  first.torre.imagenesNivel["1"] = "https://example.com/cambio.png";
  first.apartamentos[0].imagenes[0].path = "https://example.com/cambio.png";
  first.apartamentos[0].grupo!.identificador = "C";
  assert.deepEqual(source, original);
  assert.equal(second.apartamentos[0].grupo?.identificador, "B");
});

test("permite copiar un edificio vacío", () => {
  let id = -1;
  const copy = duplicateBuilding({ torre: source.torre, apartamentos: [] }, { ...source.torre.grupo, identificador: "B" }, null, { x: 60, y: 60 }, () => id--);
  assert.deepEqual(copy.torre.poligono, source.torre.poligono);
  assert.equal(copy.apartamentos.length, 0);
  assert.equal(copy.imageSources.size, 0);
});
