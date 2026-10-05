import type { Punto } from "@core/geometry";
import type { LoteConModelo } from "@features/lots/lote.types";
import type { GrupoViviendas } from "@features/lots/grupo.types";
import { perimetrosEdificio, type Torre } from "@features/lots/torre.types";

export type BuildingCopy = { torre: Torre; apartamentos: LoteConModelo[] };

export function buildingCopyOffset(torre: Torre, center: Punto): Punto {
  const points = perimetrosEdificio(torre);
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  return {
    x: center.x - (Math.min(...xs) + Math.max(...xs)) / 2,
    y: center.y - (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** Independent identities and geometry; uploaded files remain shared by URL. */
export function duplicateBuilding(
  source: BuildingCopy,
  grupo: GrupoViviendas,
  nombrePersonalizado: string | null,
  center: Punto,
  nextId: () => number,
): BuildingCopy & { imageSources: Map<number, number> } {
  const offset = buildingCopyOffset(source.torre, center);
  const move = (points: Punto[]) => points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }));
  const now = Date.now();
  const torre: Torre = {
    ...structuredClone(source.torre), id: nextId(), grupo: structuredClone(grupo), nombrePersonalizado,
    poligono: move(source.torre.poligono),
    perimetrosNivel: Object.fromEntries(Object.entries(source.torre.perimetrosNivel).map(([level, points]) => [level, move(points)])),
    createdAt: now, updatedAt: now,
  };
  const imageSources = new Map<number, number>();
  const apartamentos = source.apartamentos.map((sourceLot) => ({
    ...structuredClone(sourceLot), id: nextId(), torreId: torre.id, grupo: structuredClone(grupo),
    poligono: move(sourceLot.poligono), createdAt: now, updatedAt: now,
    imagenes: sourceLot.imagenes.map((image) => {
      const id = nextId();
      imageSources.set(id, image.id);
      return { id, path: image.path };
    }),
  }));
  return { torre, apartamentos, imageSources };
}
