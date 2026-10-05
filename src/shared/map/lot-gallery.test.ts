import assert from "node:assert/strict";
import { test } from "node:test";
import { lotGallery } from "./lot-gallery";

const imagenes = [{ id: 1, path: "https://example.com/foto-1.webp" }, { id: 2, path: "https://example.com/foto-2.webp" }];

test("planta en posición 1, apertura en la primera foto normal", () => {
  const gallery = lotGallery({ imagenes, plantaArquitectonicaPath: "https://example.com/planta.webp" });
  assert.equal(gallery.initialIndex, 1);
  assert.deepEqual(gallery.images.map((i) => i.planta), [true, false, false]);
  assert.equal(gallery.images[gallery.initialIndex].path, imagenes[0].path);
});

test("sin planta la galería empieza en posición 1", () => {
  const gallery = lotGallery({ imagenes, plantaArquitectonicaPath: null });
  assert.equal(gallery.initialIndex, 0);
  assert.equal(gallery.images[0].path, imagenes[0].path);
});

test("si solo hay planta se muestra completa, si no hay imágenes queda vacía", () => {
  const gallery = lotGallery({ imagenes: [], plantaArquitectonicaPath: "https://example.com/planta.webp" });
  assert.equal(gallery.initialIndex, 0);
  assert.equal(gallery.images[0].planta, true);
  assert.deepEqual(lotGallery({ imagenes: [], plantaArquitectonicaPath: null }).images, []);
});
