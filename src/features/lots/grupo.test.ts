import assert from "node:assert/strict";
import { test } from "node:test";
import { claveGrupo, grupoViviendasSchema, nombreGrupo } from "./grupo.types";
import { loteBackupSchema, loteCreateSchema, loteUpdateSchema } from "./lote.types";

const vivienda = {
  numeroLote: "1",
  estado: "disponible",
  poligono: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }],
  modeloId: 1,
};

test("nomenclaturas e identificadores de los ejemplos", () => {
  for (const [nombre, tipoIdentificador, identificador] of [
    ["Polígono", "alfabetico", "C"], ["Sector", "numerico", "3"],
    ["Fase", "alfabetico", "A"], ["Cluster", "numerico", "10"],
    ["Jardín", "alfabetico", "Ñ"],
  ]) {
    const grupo = grupoViviendasSchema.parse({ nombre, tipoIdentificador, identificador });
    assert.equal(nombreGrupo(grupo), `${nombre} ${identificador}`);
  }
});

test("normaliza letras, espacios y ceros iniciales", () => {
  assert.equal(grupoViviendasSchema.parse({ nombre: " Fase ", tipoIdentificador: "alfabetico", identificador: " aa " }).identificador, "AA");
  assert.equal(grupoViviendasSchema.parse({ nombre: "Sector", tipoIdentificador: "numerico", identificador: "003" }).identificador, "3");
});

test("rechaza identificadores mezclados, negativos o vacíos", () => {
  for (const [tipoIdentificador, identificador] of [["numerico", "A"], ["alfabetico", "3"], ["alfabetico", "A3"], ["numerico", "-1"], ["numerico", "1.5"], ["alfabetico", ""]]) {
    assert.equal(grupoViviendasSchema.safeParse({ nombre: "Polígono", tipoIdentificador, identificador }).success, false);
  }
});

test("creación, edición y desasignación aceptan el grupo", () => {
  const grupo = grupoViviendasSchema.parse({ nombre: "Polígono", tipoIdentificador: "alfabetico", identificador: "A" });
  assert.deepEqual(loteCreateSchema.parse({ ...vivienda, grupo }).grupo, grupo);
  assert.deepEqual(loteUpdateSchema.parse({ grupo }).grupo, grupo);
  assert.equal(loteUpdateSchema.parse({ grupo: null }).grupo, null);
  assert.equal(loteUpdateSchema.parse({ estado: "vendido" }).grupo, undefined);
});

test("snapshots y respaldos conservan toda la agrupación", () => {
  const grupo = grupoViviendasSchema.parse({ nombre: "Sector", tipoIdentificador: "numerico", identificador: "5" });
  const snapshot = [{ ...vivienda, grupo, imagenes: [{ path: "https://example.com/casa.webp" }] }];
  const restaurado = loteBackupSchema.parse(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(restaurado[0].grupo, grupo);
  assert.equal(restaurado[0].modeloId, 1);
  assert.deepEqual(restaurado[0].imagenes, snapshot[0].imagenes);
});

test("respaldos anteriores siguen funcionando sin grupo", () => {
  assert.equal(loteBackupSchema.parse([vivienda])[0].grupo, null);
  assert.equal(nombreGrupo(null), "Sin grupo");
});

test("historial clonado no comparte referencias de grupo", () => {
  const grupo = grupoViviendasSchema.parse({ nombre: "Fase", tipoIdentificador: "alfabetico", identificador: "A" });
  const actual = [{ ...vivienda, grupo }];
  const anterior = structuredClone(actual);
  actual[0].grupo.identificador = "B";
  assert.equal(anterior[0].grupo.identificador, "A");
  assert.notEqual(claveGrupo(actual[0].grupo), claveGrupo(anterior[0].grupo));
});

test("la identidad del grupo distingue nomenclaturas y tipos", () => {
  const a = grupoViviendasSchema.parse({ nombre: "Sector", tipoIdentificador: "numerico", identificador: "3" });
  const b = grupoViviendasSchema.parse({ nombre: "Cluster", tipoIdentificador: "numerico", identificador: "3" });
  assert.notEqual(claveGrupo(a), claveGrupo(b));
  assert.equal(claveGrupo(a), claveGrupo(structuredClone(a)));
});
