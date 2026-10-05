import assert from "node:assert/strict";
import { test } from "node:test";
import { mismaUbicacion, torreSchema, validarUbicacion } from "./altura.types";
import { loteBackupSchema, loteCreateSchema, loteUpdateSchema } from "./lote.types";

const grupo = { nombre: "Torre", tipoIdentificador: "alfabetico" as const, identificador: "A" };
const apartamento = {
  tipoVivienda: "apartamento" as const, grupo, nivel: 1, nombreNivel: "Planta",
  numeroLote: "1", estado: "disponible",
  poligono: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }],
};

test("apartamento con torre y planta válida", () => {
  assert.equal(loteCreateSchema.parse(apartamento).nivel, 1);
  assert.equal(torreSchema.parse({ ...grupo, identificador: " a " }).identificador, "A");
  for (const nombre of ["Torre", "Edificio", "Complejo", "Condominio"]) {
    assert.equal(torreSchema.safeParse({ ...grupo, nombre }).success, true);
  }
});

test("rechaza apartamentos sin torre, con grupo unifamiliar o planta inválida", () => {
  for (const data of [
    { ...apartamento, grupo: null }, { ...apartamento, grupo: { ...grupo, nombre: "Polígono" } },
    { ...apartamento, nivel: null }, { ...apartamento, nivel: 0 },
    { ...apartamento, nivel: -1 }, { ...apartamento, nivel: 1.5 },
  ]) assert.equal(loteCreateSchema.safeParse(data).success, false);
});

test("permite repetir el número en otra planta o torre, no en la misma ubicación", () => {
  assert.equal(mismaUbicacion(apartamento, { ...apartamento, nivel: 2 }), false);
  assert.equal(mismaUbicacion(apartamento, { ...apartamento, grupo: { ...grupo, identificador: "B" } }), false);
  assert.equal(mismaUbicacion(apartamento, structuredClone(apartamento)), true);
  assert.equal(mismaUbicacion(apartamento, { ...apartamento, tipoVivienda: "casa", nivel: null }), false);
});

test("edición parcial conserva los campos no enviados; valida la ubicación efectiva", () => {
  assert.deepEqual(loteUpdateSchema.parse({ nivel: 2 }), { nivel: 2 });
  assert.equal(validarUbicacion({ ...apartamento, grupo: null }), "El apartamento debe pertenecer a una torre válida");
  assert.equal(validarUbicacion({ ...apartamento, tipoVivienda: "casa" }), "Las casas no tienen planta/nivel de torre");
});

test("respaldos conservan torre, planta, nomenclatura, estado y galería", () => {
  const data = [{ ...apartamento, nombreNivel: "Piso", estado: "reservado", imagenes: [{ path: "https://example.com/apartamento.webp" }] }];
  const restaurado = loteBackupSchema.parse(JSON.parse(JSON.stringify(data)))[0];
  assert.equal(restaurado.tipoVivienda, "apartamento");
  assert.deepEqual(restaurado.grupo, grupo);
  assert.equal(restaurado.nivel, 1);
  assert.equal(restaurado.nombreNivel, "Piso");
  assert.equal(restaurado.estado, "reservado");
  assert.deepEqual(restaurado.imagenes, data[0].imagenes);
});

test("respaldos antiguos siguen siendo casas sin planta", () => {
  const { tipoVivienda, grupo: _grupo, nivel, nombreNivel, ...antiguo } = apartamento;
  const restaurado = loteBackupSchema.parse([antiguo])[0];
  assert.equal(restaurado.tipoVivienda, "casa");
  assert.equal(restaurado.nivel, null);
  assert.equal(restaurado.nombreNivel, "Planta");
  assert.equal(restaurado.plantaArquitectonicaPath, null);
});

test("casas y apartamentos conservan una planta independiente de su galería", () => {
  const plantaArquitectonicaPath = "https://example.com/planta.webp";
  for (const vivienda of [apartamento, { ...apartamento, tipoVivienda: "casa", grupo: null, nivel: null }]) {
    const created = loteCreateSchema.parse({ ...vivienda, plantaArquitectonicaPath });
    assert.equal(created.plantaArquitectonicaPath, plantaArquitectonicaPath);
    const restored = loteBackupSchema.parse([{ ...created, imagenes: [{ path: "https://example.com/foto.webp" }] }])[0];
    assert.equal(restored.plantaArquitectonicaPath, plantaArquitectonicaPath);
    assert.equal(restored.imagenes.length, 1);
  }
  assert.deepEqual(loteUpdateSchema.parse({ plantaArquitectonicaPath: null }), { plantaArquitectonicaPath: null });
  assert.equal(loteUpdateSchema.safeParse({ plantaArquitectonicaPath: "javascript:alert(1)" }).success, false);
});
