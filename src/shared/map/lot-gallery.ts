import type { LoteConModelo } from "@features/lots/lote.types";

export function lotGallery(lote: Pick<LoteConModelo, "imagenes" | "plantaArquitectonicaPath">) {
  const normal = lote.imagenes.map((image) => ({ path: image.path, planta: false }));
  const images = lote.plantaArquitectonicaPath
    ? [{ path: lote.plantaArquitectonicaPath, planta: true }, ...normal]
    : normal;
  return { images, initialIndex: lote.plantaArquitectonicaPath && normal.length > 0 ? 1 : 0 };
}
