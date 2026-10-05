import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";

test("PostgreSQL: número único por torre y planta, con aislamiento de casas", {
  skip: process.env.AMENA_DB_TESTS !== "1" || !process.env.DATABASE_URL,
}, async () => {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const rollback = new Error("Rollback de datos de prueba");
  const grupo = { nombre: "Torre", tipoIdentificador: "alfabetico", identificador: `TEST${crypto.randomUUID().replace(/[^a-f]/g, "").toUpperCase()}` };
  try {
    await assert.rejects(sql.begin(async (tx) => {
      const [torre] = await tx`INSERT INTO torres (grupo, poligono_json, created_at, updated_at) VALUES (${tx.json(grupo)}, '[]', 0, 0) RETURNING id, perimetros_nivel`;
      assert.deepEqual(torre.perimetros_nivel, {});
      const perimetros = { "2": [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] };
      await tx`UPDATE torres SET perimetros_nivel = ${tx.json(perimetros)} WHERE id = ${torre.id}`;
      const [perimetrosGuardados] = await tx`SELECT perimetros_nivel FROM torres WHERE id = ${torre.id}`;
      assert.deepEqual(perimetrosGuardados.perimetros_nivel, perimetros);
      const grupoB = { ...grupo, identificador: `${grupo.identificador}B` };
      const [torreB] = await tx`INSERT INTO torres (grupo, poligono_json, created_at, updated_at) VALUES (${tx.json(grupoB)}, '[]', 0, 0) RETURNING id`;
      const insertar = (tipo: string, nivel: number | null, edificio = grupo) => tx`
        INSERT INTO lotes (numero_lote, grupo, torre_id, tipo_vivienda, nivel, poligono_json, created_at, updated_at)
        VALUES ('1', ${tx.json(edificio)}, ${tipo === "apartamento" ? edificio.identificador === grupo.identificador ? torre.id : torreB.id : null}, ${tipo}, ${nivel}, '[]', 0, 0)
      `;
      await insertar("apartamento", 1);
      await insertar("apartamento", 2);
      await insertar("apartamento", 1, { ...grupo, identificador: `${grupo.identificador}B` });
      await insertar("casa", null);
      await assert.rejects(tx.savepoint(() => insertar("apartamento", 1)), (error: unknown) => (error as { code: string }).code === "23505");
      await assert.rejects(tx.savepoint(() => insertar("casa", null)), (error: unknown) => (error as { code: string }).code === "23505");
      await assert.rejects(tx.savepoint(() => insertar("apartamento", null)), (error: unknown) => (error as { code: string }).code === "23514");
      await assert.rejects(tx.savepoint(() => insertar("casa", 1)), (error: unknown) => (error as { code: string }).code === "23514");
      await assert.rejects(tx.savepoint(() => tx`DELETE FROM torres WHERE id = ${torre.id}`), (error: unknown) => (error as { code: string }).code === "23503");
      await assert.rejects(tx.savepoint(() => tx`INSERT INTO lotes (numero_lote, grupo, tipo_vivienda, nivel, poligono_json, created_at, updated_at) VALUES ('2', ${tx.json(grupo)}, 'apartamento', 1, '[]', 0, 0)`), (error: unknown) => (error as { code: string }).code === "23514");
      await tx`UPDATE torres SET nombre_personalizado = 'Mirador de prueba', cantidad_niveles = 2, imagenes_nivel = ${tx.json({ "1": "https://example.com/1.webp", "2": "https://example.com/2.webp" })} WHERE id = ${torre.id}`;
      const [editada] = await tx`SELECT nombre_personalizado, cantidad_niveles, imagenes_nivel FROM torres WHERE id = ${torre.id}`;
      assert.equal(editada.nombre_personalizado, "Mirador de prueba");
      assert.equal(editada.cantidad_niveles, 2);
      assert.deepEqual(editada.imagenes_nivel, { "1": "https://example.com/1.webp", "2": "https://example.com/2.webp" });
      await assert.rejects(tx.savepoint(() => tx`UPDATE torres SET cantidad_niveles = 0 WHERE id = ${torre.id}`), (error: unknown) => (error as { code: string }).code === "23514");
      await assert.rejects(tx.savepoint(() => tx`UPDATE torres SET cantidad_niveles = 201 WHERE id = ${torre.id}`), (error: unknown) => (error as { code: string }).code === "23514");
      const [marca] = await tx`INSERT INTO marca (colores_json, created_at, updated_at) VALUES ('{}', 0, 0) RETURNING opacidad_planos_nivel`;
      assert.equal(marca.opacidad_planos_nivel, 50);
      await tx`UPDATE marca SET opacidad_planos_nivel = 0`;
      await assert.rejects(tx.savepoint(() => tx`UPDATE marca SET opacidad_planos_nivel = 101`), (error: unknown) => (error as { code: string }).code === "23514");
      const [apartamento] = await tx`SELECT id FROM lotes WHERE torre_id = ${torre.id} LIMIT 1`;
      const [imagen] = await tx`INSERT INTO lote_imagenes (lote_id, path, created_at) VALUES (${apartamento.id}, 'https://example.com/galeria.webp', 0) RETURNING id`;
      // Same transactional order as deleteTorre; galleries cascade from apartments.
      await tx`DELETE FROM lotes WHERE torre_id = ${torre.id}`;
      await tx`DELETE FROM torres WHERE id = ${torre.id}`;
      assert.equal((await tx`SELECT id FROM lote_imagenes WHERE id = ${imagen.id}`).length, 0);
      assert.equal((await tx`SELECT id FROM lotes WHERE torre_id = ${torreB.id}`).length, 1);
      assert.equal((await tx`SELECT id FROM lotes WHERE tipo_vivienda = 'casa' AND grupo = ${tx.json(grupo)}`).length, 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await sql.end();
  }
});
