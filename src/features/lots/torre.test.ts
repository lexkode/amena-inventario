import assert from "node:assert/strict";
import { test } from "node:test";
import { nombreEdificio, torreCreateSchema, torreUpdateSchema, validarCambioTorre, perimetroNivel, perimetrosEdificio } from "./torre.types";

const edificio = torreCreateSchema.parse({
  grupo: { nombre: "Torre", tipoIdentificador: "alfabetico", identificador: "A" },
  poligono: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
});
const apartamento = { nivel: 2, poligono: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 10, y: 20 }] };

test("edificio nuevo tiene una planta sin imagen y nombre de nomenclatura", () => {
  assert.equal(edificio.cantidadNiveles, 1);
  assert.deepEqual(edificio.imagenesNivel, {});
  assert.deepEqual(edificio.perimetrosNivel, {});
  assert.equal(nombreEdificio(edificio), "Torre A");
});

test("los niveles heredan el perímetro original salvo que tengan uno propio", () => {
  const custom = edificio.poligono.map((p) => ({ x: p.x + 100, y: p.y }));
  const torre = torreCreateSchema.parse({ ...edificio, cantidadNiveles: 2, perimetrosNivel: { "2": custom } });
  assert.deepEqual(perimetroNivel(torre, 1), edificio.poligono);
  assert.deepEqual(perimetroNivel(torre, 2), custom);
  assert.equal(perimetrosEdificio(torre).length, 8);
  assert.deepEqual(perimetroNivel({ ...torre, perimetrosNivel: {} }, 2), edificio.poligono);
});

test("rechaza perímetros inválidos o en niveles inexistentes", () => {
  for (const perimetrosNivel of [{ "0": edificio.poligono }, { "2": edificio.poligono }, { "1": edificio.poligono.slice(0, 2) }, { "1": [edificio.poligono[0], edificio.poligono[2], edificio.poligono[1], edificio.poligono[3]] }]) {
    assert.equal(torreCreateSchema.safeParse({ ...edificio, perimetrosNivel }).success, false);
  }
});

test("valida apartamentos contra su nivel, sin afectar otros niveles", () => {
  const custom = edificio.poligono.map((p) => ({ x: p.x + 100, y: p.y }));
  const torre = { ...edificio, cantidadNiveles: 2, perimetrosNivel: { "2": custom } };
  assert.equal(validarCambioTorre(torre, [{ ...apartamento, nivel: 1 }, { ...apartamento, poligono: apartamento.poligono.map((p) => ({ x: p.x + 100, y: p.y })) }]), null);
  assert.match(validarCambioTorre(torre, [apartamento])!, /su nivel/);
});

test("nombre personalizado se normaliza y puede quitarse", () => {
  const personalizado = torreCreateSchema.parse({ ...edificio, nombrePersonalizado: "  Mirador  " });
  assert.equal(nombreEdificio(personalizado), "Mirador");
  assert.equal(torreUpdateSchema.parse({ nombrePersonalizado: "  " }).nombrePersonalizado, null);
});

test("cada nivel admite su imagen opcional, solo HTTPS", () => {
  assert.equal(torreCreateSchema.safeParse({ ...edificio, cantidadNiveles: 2, imagenesNivel: { "2": "https://media.example.com/planta2.webp" } }).success, true);
  for (const imagenesNivel of [{ "0": "https://example.com/0.webp" }, { "2": "https://example.com/2.webp" }, { "1": "javascript:alert(1)" }, { "1": "http://example.com/1.webp" }]) {
    assert.equal(torreCreateSchema.safeParse({ ...edificio, imagenesNivel }).success, false);
  }
});

test("cantidad de niveles es un entero entre 1 y 200", () => {
  for (const cantidadNiveles of [0, -1, 1.5, 201]) assert.equal(torreCreateSchema.safeParse({ ...edificio, cantidadNiveles }).success, false);
});

test("edición parcial no rellena ni borra otros campos", () => {
  assert.deepEqual(torreUpdateSchema.parse({ nombrePersonalizado: "Mirador" }), { nombrePersonalizado: "Mirador" });
  assert.deepEqual(torreUpdateSchema.parse({ imagenesNivel: {} }), { imagenesNivel: {} });
});

test("no permite reducir niveles ocupados ni dejar apartamentos fuera", () => {
  assert.match(validarCambioTorre(edificio, [apartamento])!, /plantas superiores/);
  assert.equal(validarCambioTorre({ ...edificio, cantidadNiveles: 2 }, [apartamento]), null);
  const reducido = [{ x: 15, y: 15 }, { x: 100, y: 15 }, { x: 100, y: 100 }, { x: 15, y: 100 }];
  assert.match(validarCambioTorre({ ...edificio, cantidadNiveles: 2, poligono: reducido }, [apartamento])!, /todos los apartamentos/);
  assert.match(validarCambioTorre({ ...edificio, poligono: reducido.slice(0, 2) }, [])!, /perímetro/);
});
