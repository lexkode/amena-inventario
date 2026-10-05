// ============ Types ============

import {
  MAX_IMAGENES_POR_LOTE,
  type Punto,
  type LoteEstado,
  type LoteConModelo,
  type LoteImagenItem,
} from "@features/lots/lote.types";
import type { ModeloConCaracteristicas } from "@features/catalog/modelo.types";
import { claveGrupo, nombreGrupo, grupoViviendasSchema, NOMENCLATURAS_GRUPO, type GrupoViviendas } from "@features/lots/grupo.types";
import { NOMENCLATURAS_TORRE, torreSchema, mismaUbicacion, validarUbicacion } from "@features/lots/altura.types";
import { torreCreateSchema, validarCambioTorre, nombreEdificio, perimetroNivel, perimetrosEdificio, type Torre, type TorreInput } from "@features/lots/torre.types";
import { createBuildingImage } from "@shared/map/building-renderer";
import { puntoDentroPoligono, segmentoDentroPoligono, poligonoDentroPoligono, poligonoSimple } from "@core/geometry/perimeter";
import {
  MAX_IMAGENES_POR_PUNTO,
  type PuntoImagenItem,
  type PuntoInteres,
} from "@features/points/punto.types";
import {
  applyViewTransform as applySvgView,
  clientToSvg as svgToPoint,
  coverView as makeCoverView,
  panTo as panView,
  zoomAtPoint as zoomViewAt,
  zoomBy as zoomViewBy,
} from "@shared/map/viewport";
import { SVG_NS, escapeHtml } from "@shared/map/svg-utils";
import { createLotLabel, createLotPolygon, LOT_BORDER_WIDTH } from "@shared/map/lot-renderer";
import { ESTADO_FILL, ESTADO_STROKE } from "@shared/map/lot-colors";
import { puntoMarkerRadius } from "@shared/map/punto-marker";
import { removePopup, setPopupOpen } from "@shared/ui/popup";

type Mode = "lotes" | "draw" | "punto";

type PolygonView = "disponibilidad" | "estandar";

const STANDARD_SELECTED_FILL = "rgba(220, 131, 47, 0.5)";
const STANDARD_SELECTED_STROKE = "#dc832f";
const STANDARD_DASH = "6,4";

type NewLote = {
  plantaArquitectonicaPath: string | null;
  tipoVivienda: "casa" | "apartamento";
  nivel: number | null;
  nombreNivel: "Planta" | "Piso" | "Nivel";
  grupo: GrupoViviendas | null;
  numeroLote: string;
  estado: LoteEstado;
  poligono: Punto[];
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
};

type LoteDraft = {
  plantaArquitectonicaPath: string;
  nivel: string;
  grupoSeleccion: string;
  grupoNombre: string;
  grupoTipo: string;
  grupoIdentificador: string;
  numeroLote: string;
  estado: LoteEstado;
  modeloId: string;
  terrenoM2: string;
  dimensionesLote: string;
};

type LoteSnapshot = {
  plantaArquitectonicaPath: string | null;
  tipoVivienda: "casa" | "apartamento";
  nivel: number | null;
  nombreNivel: "Planta" | "Piso" | "Nivel";
  grupo: GrupoViviendas | null;
  polygon: Punto[];
  numeroLote: string;
  estado: LoteEstado;
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
};

type LoteClipboard = LoteSnapshot;
type TorreFormDraft = { grupo: GrupoViviendas; nombrePersonalizado: string; cantidadNiveles: string; imagenesNivel: Record<string, string>; perimetrosNivel: Record<string, Punto[]> };

type HistoryEntry = {
  torres: Torre[];
  torreGrupo: string | null;
  nivelActivo: number;
  label: string;
  key?: string;
  at: number;
  lotes: LoteConModelo[];
  selectedLoteId: number | null;
  puntos: PuntoInteres[];
  selectedPuntoId: number | null;
};

type State = {
  torre: Torre | null;
  torres: Torre[];
  syncedTorres: Torre[];
  dibujandoTorre: boolean;
  pendingNuevaTorre: TorreInput | null;
  torreDraft: TorreFormDraft | null;
  editingTorre: boolean;
  torreFormDirty: boolean;
  torreOriginal: Torre | null;
  selectedTorreVertex: number | null;
  draggingTorreVertex: number | null;
  torreImagenNivel: number;
  drawError: string;
  nivelActivo: number;
  mode: Mode;
  polygonView: PolygonView;
  view: { x: number; y: number; w: number; h: number };
  initialView: { w: number; h: number };
  atDefaultView: boolean;
  isPanning: boolean;
  panStart: { clientX: number; clientY: number; vbX: number; vbY: number };
  panFromBackground: boolean;
  currentPolygon: Punto[];
  pendingNewLote: NewLote | null;
  selectedLoteId: number | null;
  selectedVertex: { loteId: number; index: number } | null;
  draggingVertex: { loteId: number; index: number } | null;
  draggingPolygon: { loteId: number; start: Punto; original: Punto[] } | null;
  draggingPunto: { puntoId: number; dx: number; dy: number } | null;
  dragMoved: boolean;
  lotes: LoteConModelo[];
  puntos: PuntoInteres[];
  selectedPuntoId: number | null;
  nuevoPuntoPos: Punto | null;
  modelos: ModeloConCaracteristicas[];
  pendingImageAdds: { file: File | null; url: string; path: string | null }[];
  pendingImageRemoves: number[];
  formDirty: boolean;
  draft: LoteDraft | null;
  puntoDirty: boolean;
  puntoDraft: { nombre: string; informacion: string } | null;
  editSnapshot: LoteSnapshot | null;
  clipboard: LoteClipboard | null;
  history: HistoryEntry[];
  historyIndex: number;
  synced: LoteConModelo[];
  syncedPuntos: PuntoInteres[];
  nextTempId: number;
  pendingImageFiles: Map<number, File>;
  pendingImagePaths: Map<number, string>;
  syncing: boolean;
  busyLabel: string;
  hasPublication: boolean;
  hasUnpublished: boolean;
};

type InitialData = {
  torres: Torre[];
  opacidadPlanosNivel: number;
  alturaDefaults: Pick<GrupoViviendas, "nombre" | "tipoIdentificador"> & { nombreNivel: NewLote["nombreNivel"] };
  grupoDefaults: Pick<GrupoViviendas, "nombre" | "tipoIdentificador">;
  plan: {
    id: number;
    nombre: string;
    imagenPath: string;
    anchoPx: number;
    altoPx: number;
    opacidad: number;
  } | null;
  lotes: LoteConModelo[];
  puntos: PuntoInteres[];
  modelos: ModeloConCaracteristicas[];
  estadoPublicacion: { tienePublicacion: boolean; pendiente: boolean };
};

// ============ State ============

const state: State = {
  torre: null,
  torres: [],
  syncedTorres: [],
  dibujandoTorre: false,
  pendingNuevaTorre: null,
  torreDraft: null,
  editingTorre: false,
  torreFormDirty: false,
  torreOriginal: null,
  selectedTorreVertex: null,
  draggingTorreVertex: null,
  torreImagenNivel: 1,
  drawError: "",
  nivelActivo: 1,
  mode: "lotes",
  polygonView: "estandar",
  view: { x: 0, y: 0, w: 1, h: 1 },
  initialView: { w: 1, h: 1 },
  atDefaultView: true,
  isPanning: false,
  panStart: { clientX: 0, clientY: 0, vbX: 0, vbY: 0 },
  panFromBackground: false,
  currentPolygon: [],
  pendingNewLote: null,
  selectedLoteId: null,
  selectedVertex: null,
  draggingVertex: null,
  draggingPolygon: null,
  draggingPunto: null,
  dragMoved: false,
  lotes: [],
  puntos: [],
  selectedPuntoId: null,
  nuevoPuntoPos: null,
  modelos: [],
  pendingImageAdds: [],
  pendingImageRemoves: [],
  formDirty: false,
  draft: null,
  puntoDirty: false,
  puntoDraft: null,
  editSnapshot: null,
  clipboard: null,
  history: [],
  historyIndex: -1,
  synced: [],
  syncedPuntos: [],
  nextTempId: -1,
  pendingImageFiles: new Map(),
  pendingImagePaths: new Map(),
  syncing: false,
  busyLabel: "",
  hasPublication: false,
  hasUnpublished: false,
};

const VERTEX_RADIUS = 6; // radio unificado (mitad del original más grande)
const VERTEX_STROKE = 2; // borde unificado
const PASTE_OFFSET = 20; // desplazamiento (px de plano) del lote pegado
const CLICK_MOVE_THRESHOLD = 4; // px para diferenciar clic de arrastre (pan)

const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

let svg!: SVGSVGElement;
let lotsLayer!: SVGGElement;
let towerLayer!: SVGGElement;
let buildingsLayer!: SVGGElement;
let puntosLayer!: SVGGElement;
let overlayLayer!: SVGGElement;
let sidePanel!: HTMLElement;
let zoomDisplay!: HTMLElement;
let selectionToolbar: HTMLDivElement | null = null;
let planImage: SVGGElement | null = null;
let planOpacity = 0.8;
let initialData: InitialData;
let editingFloorPerimeter: number | null = null;
let drawingFloorPerimeter: number | null = null;

function torreEditada(): Torre {
  return { ...state.torre!, ...(state.torreDraft ? { imagenesNivel: state.torreDraft.imagenesNivel, perimetrosNivel: state.torreDraft.perimetrosNivel } : {}) };
}

function poligonoEnEdicion(): Punto[] {
  return editingFloorPerimeter === null ? state.torre!.poligono : perimetroNivel(torreEditada(), editingFloorPerimeter);
}

// ============ Working copy & history ============

const MAX_HISTORY = 100;

function cloneLotes(lotes: LoteConModelo[]): LoteConModelo[] {
  return structuredClone(lotes);
}

function clonePuntos(puntos: PuntoInteres[]): PuntoInteres[] {
  return structuredClone(puntos);
}

function genTempId(): number {
  const id = state.nextTempId;
  state.nextTempId -= 1;
  return id;
}

function documentDirty(): boolean {
  return (
    JSON.stringify(state.torres) !== JSON.stringify(state.syncedTorres) ||
    JSON.stringify(state.lotes) !== JSON.stringify(state.synced) ||
    JSON.stringify(state.puntos) !== JSON.stringify(state.syncedPuntos)
  );
}

function puntoFieldsChanged(a: PuntoInteres, b: PuntoInteres): boolean {
  return (
    a.nombre !== b.nombre ||
    a.informacion !== b.informacion ||
    a.x !== b.x ||
    a.y !== b.y
  );
}

function loteFieldsChanged(a: LoteConModelo, b: LoteConModelo): boolean {
  return (
    JSON.stringify(loteBody(a)) !== JSON.stringify(loteBody(b))
  );
}

function loteBody(lote: LoteConModelo): {
  plantaArquitectonicaPath: string | null;
  tipoVivienda: NewLote["tipoVivienda"];
  nivel: number | null;
  nombreNivel: NewLote["nombreNivel"];
  grupo: GrupoViviendas | null;
  numeroLote: string;
  estado: LoteEstado;
  poligono: Punto[];
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
} {
  return {
    plantaArquitectonicaPath: lote.plantaArquitectonicaPath ?? null,
    tipoVivienda: lote.tipoVivienda,
    nivel: lote.nivel,
    nombreNivel: lote.nombreNivel,
    grupo: lote.grupo,
    numeroLote: lote.numeroLote,
    estado: lote.estado,
    poligono: lote.poligono,
    modeloId: lote.modeloId,
    terrenoM2: lote.terrenoM2,
    dimensionesLote: lote.dimensionesLote,
  };
}

function updateDirtyIndicator(): void {
  sidePanel.inert = state.syncing;
  const canvasWrap = document.getElementById("canvas-wrap");
  if (canvasWrap) canvasWrap.inert = state.syncing;
  for (const id of ["create-lote", "create-toggle", "create-apartamento", "paste-lote", "history-toggle"]) {
    const button = document.getElementById(id) as HTMLButtonElement | null;
    if (button) button.disabled = state.syncing || (state.editingTorre && id !== "history-toggle");
  }
  const editTower = document.getElementById("edit-tower") as HTMLButtonElement | null;
  if (editTower) editTower.disabled = state.syncing || state.editingTorre;
  document.querySelectorAll<HTMLButtonElement>("#tower-levels button").forEach((button) => { button.disabled = state.syncing || state.editingTorre; });
  const undoBtn = document.getElementById("undo") as HTMLButtonElement | null;
  const redoBtn = document.getElementById("redo") as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = state.syncing || state.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = state.syncing || state.historyIndex >= state.history.length - 1;
  const localDirty = documentDirty() || hasUnsavedChanges();
  const publishBtn = document.getElementById("publish-action") as HTMLButtonElement | null;
  if (publishBtn) {
    if (state.syncing) {
      publishBtn.disabled = true;
      publishBtn.textContent = state.busyLabel || "Publicando…";
    } else {
      const pending = localDirty || state.hasUnpublished || !state.hasPublication;
      publishBtn.disabled = !pending;
      publishBtn.textContent = pending ? "Publicar *" : "Publicar";
    }
  }
  const toggle = document.getElementById("publish-toggle") as HTMLButtonElement | null;
  if (toggle) toggle.disabled = state.syncing;
  const draftBtn = document.getElementById("save-draft") as HTMLButtonElement | null;
  if (draftBtn) draftBtn.disabled = !localDirty || state.syncing;
}

function renderHistoryControls(): void {
  const menu = document.getElementById("history-menu");
  if (menu) {
    menu.innerHTML = state.history
      .map(
        (h, i) =>
          `<button type="button" role="menuitem" data-history-index="${i}" class="${i === state.historyIndex ? "active" : ""}">${escapeHtml(h.label)}</button>`,
      )
      .join("");
    menu.querySelectorAll<HTMLElement>("[data-history-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeAllDropdowns();
        goToHistory(Number(btn.dataset.historyIndex));
      });
    });
  }
  const value = document.getElementById("history-value");
  if (value) value.textContent = state.history[state.historyIndex]?.label ?? "—";
  const toggle = document.getElementById("history-toggle") as HTMLButtonElement | null;
  if (toggle) toggle.disabled = state.syncing || state.history.length === 0;

  const undoBtn = document.getElementById("undo") as HTMLButtonElement | null;
  const redoBtn = document.getElementById("redo") as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = state.syncing || state.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = state.syncing || state.historyIndex >= state.history.length - 1;
}

function renderViewControl(): void {
  const value = document.getElementById("view-value");
  if (value) {
    value.textContent =
      state.polygonView === "estandar" ? "Edición" : "Previsualización";
  }
  document.querySelectorAll<HTMLElement>("[data-view-value]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.viewValue === state.polygonView);
  });
}

function commitHistory(label: string, coalesceKey?: string): void {
  const now = Date.now();
  const last = state.historyIndex >= 0 ? state.history[state.historyIndex] : undefined;
  const atTip = state.historyIndex === state.history.length - 1;
  if (coalesceKey && atTip && last && last.key === coalesceKey && now - last.at < 800) {
    last.at = now;
    last.lotes = cloneLotes(state.lotes);
    last.torres = structuredClone(state.torres);
    last.torreGrupo = state.torre ? claveGrupo(state.torre.grupo) : null;
    last.nivelActivo = state.nivelActivo;
    last.selectedLoteId = state.selectedLoteId;
    last.puntos = clonePuntos(state.puntos);
    last.selectedPuntoId = state.selectedPuntoId;
    renderHistoryControls();
    updateDirtyIndicator();
    return;
  }

  state.history.splice(state.historyIndex + 1);
  state.history.push({
    torres: structuredClone(state.torres),
    torreGrupo: state.torre ? claveGrupo(state.torre.grupo) : null,
    nivelActivo: state.nivelActivo,
    label,
    key: coalesceKey,
    at: now,
    lotes: cloneLotes(state.lotes),
    selectedLoteId: state.selectedLoteId,
    puntos: clonePuntos(state.puntos),
    selectedPuntoId: state.selectedPuntoId,
  });
  state.historyIndex = state.history.length - 1;

  if (state.history.length > MAX_HISTORY) {
    state.history.splice(0, state.history.length - MAX_HISTORY);
    state.historyIndex = state.history.length - 1;
  }

  renderHistoryControls();
  updateDirtyIndicator();
}

function goToHistory(index: number): void {
  if (state.syncing) return;
  if (index < 0 || index >= state.history.length || index === state.historyIndex) return;
  state.historyIndex = index;
  const entry = state.history[index];
  state.mode = "lotes";
  state.torres = structuredClone(entry.torres);
  state.torre = state.torres.find((t) => claveGrupo(t.grupo) === entry.torreGrupo) ?? null;
  state.nivelActivo = entry.nivelActivo;
  state.dibujandoTorre = false;
  state.pendingNuevaTorre = null;
  state.torreDraft = null;
  clearTorreEdit();
  state.drawError = "";
  state.lotes = cloneLotes(entry.lotes);
  state.puntos = clonePuntos(entry.puntos);
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.selectedVertex = null;
  state.draggingVertex = null;
  state.draggingPolygon = null;
  state.draggingPunto = null;
  state.nuevoPuntoPos = null;
  resetPendingImages();
  clearFormDraft();
  state.selectedLoteId =
    entry.selectedLoteId !== null && state.lotes.some((l) => l.id === entry.selectedLoteId)
      ? entry.selectedLoteId
      : null;
  state.selectedPuntoId =
    entry.selectedPuntoId !== null && state.puntos.some((p) => p.id === entry.selectedPuntoId)
      ? entry.selectedPuntoId
      : null;
  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
  if (lote) activarContextoLote(lote);
  if (state.torre) state.selectedPuntoId = null;
  state.editSnapshot = lote ? captureSnapshot(lote) : null;
  render();
  renderHistoryControls();
  updateDirtyIndicator();
}

function undo(): void {
  if (state.historyIndex > 0) goToHistory(state.historyIndex - 1);
}

function redo(): void {
  if (state.historyIndex < state.history.length - 1) goToHistory(state.historyIndex + 1);
}

// ============ Render ============

function renderViewTransform(): void {
  applySvgView(svg, state.view, state.initialView.w, zoomDisplay);
  const shade = document.getElementById("tower-shade");
  if (shade) {
    for (const [key, value] of Object.entries({ x: state.view.x, y: state.view.y, width: state.view.w, height: state.view.h })) shade.setAttribute(key, String(value));
  }
  renderSelectionToolbar();
}

function updateCursor(): void {
  if (state.isPanning) {
    svg.style.cursor = "grabbing";
  } else if (state.mode === "lotes") {
    svg.style.cursor = "grab";
  } else if (state.mode === "draw") {
    svg.style.cursor = state.pendingNewLote || state.pendingNuevaTorre ? "not-allowed" : "crosshair";
  } else if (state.mode === "punto") {
    svg.style.cursor = state.nuevoPuntoPos !== null ? "default" : "crosshair";
  } else {
    svg.style.cursor = "default";
  }
}

function renderLotsLayer(): void {
  while (lotsLayer.firstChild) lotsLayer.removeChild(lotsLayer.firstChild);
  towerLayer.replaceChildren();

  for (const lote of state.lotes) {
    const enTorre = state.torre !== null && lote.tipoVivienda === "apartamento" && claveGrupo(lote.grupo) === claveGrupo(state.torre.grupo);
    if (lote.tipoVivienda === "apartamento" && (!enTorre || lote.nivel !== state.nivelActivo)) continue;
    const editable = !state.editingTorre && (state.torre === null || enTorre);
    const layer = enTorre ? towerLayer : lotsLayer;
    const isSelected = lote.id === state.selectedLoteId;
    const isStandard = state.polygonView === "estandar";
    const label = createLotLabel(lote, { fontSize: 22, strokeWidth: 0.5 });

    let fill: string;
    let stroke: string;
    let strokeOpacity: number | undefined;
    let fillOpacity: number | undefined;
    let dash: string | undefined;

    if (isStandard) {
      if (isSelected) {
        fill = STANDARD_SELECTED_FILL;
        stroke = STANDARD_SELECTED_STROKE;
        dash = STANDARD_DASH;
      } else {
        fill = "var(--c-bg-dark)";
        stroke = "var(--c-bg-dark)";
        fillOpacity = 0.35;
        dash = STANDARD_DASH;
      }
    } else {
      fill = ESTADO_FILL[lote.estado];
      stroke = ESTADO_STROKE[lote.estado];
      strokeOpacity = isSelected ? 0.5 : 1;
    }

    const polygon = createLotPolygon(lote, {
      fill,
      stroke,
      selected: isSelected,
      strokeWidth: LOT_BORDER_WIDTH,
      strokeOpacity,
      fillOpacity,
      strokeDasharray: dash,
    });
    polygon.style.cursor = state.mode === "lotes" ? "pointer" : "default";
    if (!editable || state.mode !== "lotes") polygon.style.pointerEvents = "none";
    polygon.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.shiftKey) return;
      e.stopPropagation();
      if (state.mode !== "lotes" || !editable) return;
      const canDrag = lote.id === state.selectedLoteId || !hasUnsavedChanges();
      void selectLote(lote.id).then(() => {
        if (state.selectedLoteId !== lote.id || !canDrag) return;
        state.draggingPolygon = {
          loteId: lote.id,
          start: svgToPoint(svg, e.clientX, e.clientY),
          original: lote.poligono.map((p) => ({ ...p })),
        };
        state.dragMoved = false;
        svg.style.cursor = "move";
      });
    });
    layer.appendChild(polygon);

    if (label) layer.appendChild(label);
  }
}

function renderBuildingsLayer(): void {
  buildingsLayer.replaceChildren();
  for (const torre of state.torres) {
    const activa = state.torre?.id === torre.id;
    const contornoSeleccionado = activa && (state.editingTorre || state.selectedLoteId === null);
    const efectiva = activa && state.editingTorre ? torreEditada() : torre;
    const points = activa ? (state.editingTorre && editingFloorPerimeter === null ? torre.poligono : perimetroNivel(efectiva, state.nivelActivo)) : torre.poligono;
    if (activa && (editingFloorPerimeter !== null || drawingFloorPerimeter !== null)) {
      const reference = document.createElementNS(SVG_NS, "polygon");
      reference.setAttribute("points", torre.poligono.map((p) => `${p.x},${p.y}`).join(" "));
      reference.setAttribute("fill", "var(--c-bg-dark)");
      reference.setAttribute("stroke", "white");
      reference.setAttribute("stroke-width", "3");
      reference.setAttribute("stroke-dasharray", "10,5");
      reference.setAttribute("opacity", ".3");
      reference.setAttribute("data-building-reference", "true");
      reference.style.pointerEvents = "none";
      towerLayer.insertBefore(reference, towerLayer.firstChild);
    }
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
    polygon.setAttribute("data-torre-id", String(torre.id));
    polygon.setAttribute("fill", activa ? "rgba(220,131,47,0.08)" : "var(--c-bg-dark)");
    polygon.setAttribute("fill-opacity", activa ? "1" : "0.35");
    polygon.setAttribute("stroke", contornoSeleccionado ? "var(--c-accent)" : "var(--c-bg-dark)");
    polygon.setAttribute("stroke-width", "3");
    polygon.setAttribute("stroke-dasharray", "10,5");
    if (activa) {
      polygon.style.pointerEvents = state.editingTorre && drawingFloorPerimeter === null ? "stroke" : "none";
      polygon.addEventListener("mousedown", (e) => { if (state.editingTorre && !e.shiftKey && e.button === 0) e.stopPropagation(); });
      polygon.addEventListener("dblclick", (e) => {
        if (!state.editingTorre || drawingFloorPerimeter !== null) return;
        e.stopPropagation();
        const p = svgToPoint(svg, e.clientX, e.clientY);
        let best = Infinity, edge = 0, projected = p;
        points.forEach((a, i) => {
          const b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y;
          const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
          const point = { x: a.x + dx * t, y: a.y + dy * t }, distance = Math.hypot(p.x - point.x, p.y - point.y);
          if (distance < best) { best = distance; edge = i; projected = point; }
        });
        const candidate = structuredClone(points);
        candidate.splice(edge + 1, 0, projected);
        if (updateTorrePolygon(candidate)) { state.selectedTorreVertex = edge + 1; render(); }
      });
      if (drawingFloorPerimeter === null) towerLayer.insertBefore(polygon, towerLayer.firstChild);
      const image = createBuildingImage(efectiva, state.nivelActivo, "editor", initialData.opacidadPlanosNivel ?? 50);
      if (image) towerLayer.insertBefore(image, towerLayer.firstChild);
    } else {
      polygon.style.pointerEvents = state.torre || state.mode !== "lotes" ? "none" : "";
      polygon.style.cursor = "pointer";
      polygon.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || e.shiftKey || state.torre || state.mode !== "lotes") return;
        e.stopPropagation();
        void entrarTorre(torre.id);
      });
      buildingsLayer.appendChild(polygon);
      const label = createLotLabel({ poligono: torre.poligono, numeroLote: nombreEdificio(torre) } as LoteConModelo, { fontSize: 22 });
      if (label) buildingsLayer.appendChild(label);
    }
  }
}

function renderPuntosLayer(): void {
  puntosLayer.style.pointerEvents = state.torre ? "none" : "";
  while (puntosLayer.firstChild) puntosLayer.removeChild(puntosLayer.firstChild);

  const r = puntoMarkerRadius(state.initialView.w, state.initialView.h);

  for (const punto of state.puntos) {
    const isSelected = punto.id === state.selectedPuntoId;
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "punto-marker");
    group.setAttribute("data-punto-id", String(punto.id));

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(punto.x));
    circle.setAttribute("cy", String(punto.y));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", isSelected ? "#dc832f" : "#244858");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", String(r * 0.22));
    group.appendChild(circle);

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(punto.x));
    dot.setAttribute("cy", String(punto.y));
    dot.setAttribute("r", String(r * 0.3));
    dot.setAttribute("fill", "#ffffff");
    group.appendChild(dot);

    if (state.mode !== "draw") {
      group.style.cursor = isSelected ? "grab" : "pointer";
      group.addEventListener("mousedown", (e) => {
        if (state.torre) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        if (isSelected) {
          const p = svgToPoint(svg, e.clientX, e.clientY);
          state.draggingPunto = {
            puntoId: punto.id,
            dx: p.x - punto.x,
            dy: p.y - punto.y,
          };
          state.dragMoved = false;
          group.style.cursor = "grabbing";
        } else {
          state.selectedPuntoId = punto.id;
          state.selectedLoteId = null;
          state.selectedVertex = null;
          state.nuevoPuntoPos = null;
          state.mode = "lotes";
          state.puntoDraft = null;
          state.puntoDirty = false;
          render();
        }
      });
    } else {
      group.style.pointerEvents = "none";
    }

    puntosLayer.appendChild(group);
  }

  if (state.nuevoPuntoPos !== null) {
    const { x, y } = state.nuevoPuntoPos;
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "punto-marker punto-marker-pending");
    group.style.pointerEvents = "none";

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "#dc832f");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", String(r * 0.22));
    group.appendChild(circle);

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
    dot.setAttribute("r", String(r * 0.3));
    dot.setAttribute("fill", "#ffffff");
    group.appendChild(dot);

    puntosLayer.appendChild(group);
  }
}

function createVertexMarker(x: number, y: number): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(x - VERTEX_RADIUS));
  rect.setAttribute("y", String(y - VERTEX_RADIUS));
  rect.setAttribute("width", String(VERTEX_RADIUS * 2));
  rect.setAttribute("height", String(VERTEX_RADIUS * 2));
  rect.setAttribute("fill", "#fff");
  rect.setAttribute("stroke", "#dc832f");
  rect.setAttribute("stroke-width", String(VERTEX_STROKE));
  return rect;
}

function renderOverlayLayer(): void {
  while (overlayLayer.firstChild) overlayLayer.removeChild(overlayLayer.firstChild);
  if (state.editingTorre && state.torre && drawingFloorPerimeter === null) {
    poligonoEnEdicion().forEach((p, i) => {
      const handle = createVertexMarker(p.x, p.y);
      handle.setAttribute("class", "tower-vertex-handle");
      handle.setAttribute("data-vertex-index", String(i));
      handle.style.cursor = "move";
      if (state.selectedTorreVertex === i) handle.setAttribute("opacity", "0.5");
      handle.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || e.shiftKey) return;
        e.stopPropagation();
        state.selectedTorreVertex = i;
        state.draggingTorreVertex = i;
      });
      handle.addEventListener("click", () => { state.selectedTorreVertex = i; render(); });
      overlayLayer.appendChild(handle);
    });
    return;
  }
  if (state.pendingNuevaTorre) {
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute("points", state.pendingNuevaTorre.poligono.map((p) => `${p.x},${p.y}`).join(" "));
    polygon.setAttribute("fill", STANDARD_SELECTED_FILL);
    polygon.setAttribute("stroke", STANDARD_SELECTED_STROKE);
    polygon.setAttribute("stroke-width", "3");
    polygon.style.pointerEvents = "none";
    overlayLayer.appendChild(polygon);
  }

  if (state.mode === "draw" && state.currentPolygon.length > 0) {
    const polyline = document.createElementNS(SVG_NS, "polyline");
    polyline.setAttribute(
      "points",
      state.currentPolygon.map((p) => `${p.x},${p.y}`).join(" "),
    );
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "#dc832f");
    polyline.setAttribute("stroke-width", "2");
    polyline.setAttribute("stroke-dasharray", "6,4");
    overlayLayer.appendChild(polyline);

    for (const p of state.currentPolygon) {
      overlayLayer.appendChild(createVertexMarker(p.x, p.y));
    }
  }

  if (state.mode === "draw" && state.pendingNewLote !== null) {
    const poligono = state.pendingNewLote.poligono;
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute(
      "points",
      poligono.map((p) => `${p.x},${p.y}`).join(" "),
    );
    polygon.setAttribute("fill", STANDARD_SELECTED_FILL);
    polygon.setAttribute("stroke", STANDARD_SELECTED_STROKE);
    polygon.setAttribute("stroke-width", "2");
    polygon.setAttribute("stroke-dasharray", STANDARD_DASH);
    overlayLayer.appendChild(polygon);

    for (const p of poligono) {
      overlayLayer.appendChild(createVertexMarker(p.x, p.y));
    }
  }

  if (state.mode === "lotes" && state.selectedLoteId !== null) {
    const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
    if (lote) {
      for (let i = 0; i < lote.poligono.length; i++) {
        const p = lote.poligono[i];
        const handle = createVertexMarker(p.x, p.y);
        handle.setAttribute("class", "vertex-handle");
        handle.setAttribute("data-lote-id", String(lote.id));
        handle.setAttribute("data-vertex-index", String(i));
        handle.style.cursor = "move";
        if (
          state.selectedVertex !== null &&
          state.selectedVertex.loteId === lote.id &&
          state.selectedVertex.index === i
        ) {
          handle.setAttribute("opacity", "0.5");
        }
        handle.addEventListener("mousedown", (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          state.draggingVertex = { loteId: lote.id, index: i };
          state.dragMoved = false;
        });
        handle.addEventListener("click", () => {
          state.selectedVertex = { loteId: lote.id, index: i };
          render();
        });
        overlayLayer.appendChild(handle);
      }
    }
  }
}

function renderSidePanel(): void {
  if (drawingFloorPerimeter !== null) {
    sidePanel.innerHTML = `<h2>Perímetro de ${escapeHtml(state.torre!.nombreNivel)} ${drawingFloorPerimeter}</h2>
      <p>Dibuja el nuevo perímetro. El contorno transparente del edificio sirve de referencia.</p>
      <p>${state.currentPolygon.length} vértices</p>
      <p id="draw-error" class="form-error" ${state.drawError ? "" : "hidden"}>${escapeHtml(state.drawError)}</p>
      <div class="actions"><button id="close-polygon" class="btn-primary" ${state.currentPolygon.length < 3 ? "disabled" : ""}>Aplicar perímetro</button><button id="cancel-draw" class="btn-secondary">Cancelar dibujo</button></div>`;
    document.getElementById("close-polygon")?.addEventListener("click", closePolygon);
    document.getElementById("cancel-draw")?.addEventListener("click", cancelDraw);
    return;
  }
  if (state.pendingNuevaTorre || state.editingTorre) {
    renderTorreForm();
    return;
  }
  if (state.pendingNewLote !== null) {
    renderLotForm(state.pendingNewLote, true);
    return;
  }

  if (state.nuevoPuntoPos !== null) {
    renderPuntoForm(null, state.nuevoPuntoPos);
    return;
  }

  if (state.selectedPuntoId !== null) {
    const punto = state.puntos.find((p) => p.id === state.selectedPuntoId);
    if (punto) {
      renderPuntoForm(punto, null);
      return;
    }
  }

  if (state.mode === "punto") {
    sidePanel.innerHTML = `
      <h2 style="margin-top:0">Nuevo punto de interés</h2>
      <p style="color:#5a7682;font-size:.9rem">Haz clic en el plano para ubicarlo.</p>
    `;
    return;
  }

  if (state.mode === "draw") {
    if (state.currentPolygon.length === 0) {
      sidePanel.innerHTML = `
        <h2 style="margin-top:0">${state.dibujandoTorre ? "Dibujar edificio" : state.torre ? "Dibujar apartamento" : "Modo Dibujar"}</h2>
        <p style="color:#5a7682;font-size:.9rem">${state.dibujandoTorre ? "Dibuja primero el perímetro exterior del edificio. Después podrás agregar sus apartamentos." : state.torre ? "Dibuja el apartamento dentro del perímetro del edificio. Puede tocar sus paredes, pero no salir de ellas." : "Haz clic en el plano para colocar el primer vértice del polígono."}</p>
        <p id="draw-error" class="form-error" ${state.drawError ? "" : "hidden"}>${escapeHtml(state.drawError)}</p>
        <div class="actions"><button id="cancel-draw" class="btn-secondary">Cancelar</button></div>
        <p style="color:#5a7682;font-size:.8rem;margin-top:1rem">Shift+arrastrar o botón central para panear. Rueda para zoom.</p>
      `;
    } else {
      const canClose = state.currentPolygon.length >= 3;
      sidePanel.innerHTML = `
        <h2 style="margin-top:0">${state.dibujandoTorre ? "Edificio" : state.torre ? "Apartamento" : "Polígono"}: ${state.currentPolygon.length} puntos</h2>
        <p style="color:#5a7682;font-size:.85rem">Mínimo 3 vértices para cerrar.</p>
        <p id="draw-error" class="form-error" ${state.drawError ? "" : "hidden"}>${escapeHtml(state.drawError)}</p>
        <div class="actions">
          <button id="close-polygon" class="btn-primary" ${canClose ? "" : "disabled"}>Cerrar polígono</button>
          <button id="cancel-draw" class="btn-secondary">Cancelar</button>
        </div>
      `;
      document
        .getElementById("close-polygon")
        ?.addEventListener("click", closePolygon);
    }
    document.getElementById("cancel-draw")?.addEventListener("click", cancelDraw);
    return;
  }

  if (state.selectedLoteId !== null) {
    const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
    if (lote) {
      renderLotForm(lote, false);
      return;
    }
  }

  renderLoteList();
}

function renderLoteList(): void {
  const grupos = new Map<string, LoteConModelo[]>();
  const casas = state.lotes.filter((l) => l.tipoVivienda === "casa");
  const apartamentos = state.lotes.filter((l) => l.tipoVivienda === "apartamento");
  for (const lote of casas) {
    const clave = claveGrupo(lote.grupo);
    const arr = grupos.get(clave) ?? [];
    arr.push(lote);
    grupos.set(clave, arr);
  }

  let html = `<details class="lote-acc" ${state.torre ? "" : "open"}><summary class="lote-grupo">Vivienda unifamiliar</summary>`;

  const renderGrupo = (nombre: string, arr: LoteConModelo[]): void => {
    html += `<details class="lote-acc">`;
    html += `<summary class="lote-grupo">${escapeHtml(nombre)}<svg class="lote-chev" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary>`;
    html += `<ul class="lote-list">`;
    for (const lote of arr.sort((a, b) => a.numeroLote.localeCompare(b.numeroLote, "es", { numeric: true }))) {
      html += `<li><button type="button" class="lote-row" data-lote-id="${lote.id}" ${state.torre ? "disabled" : ""}>Casa ${escapeHtml(lote.numeroLote)} · ${escapeHtml(lote.modelo?.nombre ?? "Sin modelo")}</button></li>`;
    }
    html += `</ul>`;
    html += `</details>`;
  };

  for (const [, arr] of [...grupos].sort((a, b) => nombreGrupo(a[1][0].grupo).localeCompare(nombreGrupo(b[1][0].grupo), "es", { numeric: true }))) {
    renderGrupo(nombreGrupo(arr[0].grupo), arr);
  }

  if (casas.length === 0) {
    html += `<p class="lote-vacio">No hay casas todavía. Usa Nueva casa para dibujar una.</p>`;
  }
  html += `</details><details class="lote-acc" ${state.torre ? "open" : ""}><summary class="lote-grupo">Vivienda en altura</summary>`;
  for (const torre of [...state.torres].sort((a, b) => nombreGrupo(a.grupo).localeCompare(nombreGrupo(b.grupo), "es", { numeric: true }))) {
    const key = claveGrupo(torre.grupo);
    const arr = apartamentos.filter((l) => claveGrupo(l.grupo) === key);
    const bloqueada = state.torre !== null && key !== claveGrupo(state.torre.grupo);
    html += `<details class="lote-acc" ${state.torre && !bloqueada ? "open" : ""}><summary class="lote-grupo">${escapeHtml(nombreEdificio(torre))}</summary><ul class="lote-list"><li><button type="button" class="lote-row" data-torre-id="${torre.id}" ${bloqueada ? "disabled" : ""}>Ver apartamentos</button> <button type="button" class="lote-row" data-edit-torre-id="${torre.id}" ${bloqueada ? "disabled" : ""}>Editar edificio</button></li>`;
    for (const lote of arr.sort((a, b) => (a.nivel ?? 1) - (b.nivel ?? 1) || a.numeroLote.localeCompare(b.numeroLote, "es", { numeric: true }))) {
      html += `<li><button type="button" class="lote-row" data-lote-id="${lote.id}" ${bloqueada ? "disabled" : ""}>Apartamento ${escapeHtml(lote.numeroLote)} · ${escapeHtml(lote.nombreNivel)} ${lote.nivel} · ${escapeHtml(lote.modelo?.nombre ?? "Sin modelo")}</button></li>`;
    }
    html += `</ul></details>`;
  }
  if (!state.torres.length) html += `<p class="lote-vacio">No hay edificios todavía. Usa Nuevo apartamento para dibujar el primero.</p>`;
  html += `</details><details class="lote-acc"><summary class="lote-grupo">Puntos de interés</summary><ul class="lote-list">`;
  for (const punto of state.puntos) html += `<li><button type="button" class="lote-row" data-punto-id="${punto.id}" ${state.torre ? "disabled" : ""}>${escapeHtml(punto.nombre)}</button></li>`;
  if (!state.puntos.length) html += `<li class="lote-vacio">No hay puntos de interés todavía.</li>`;
  html += `</ul></details>`;

  sidePanel.innerHTML = `<div class="lote-scroll">${html}</div>`;
  sidePanel.querySelectorAll<HTMLElement>("[data-torre-id]").forEach((btn) => btn.addEventListener("click", () => { void entrarTorre(Number(btn.dataset.torreId)); }));
  sidePanel.querySelectorAll<HTMLElement>("[data-edit-torre-id]").forEach((btn) => btn.addEventListener("click", () => { void entrarTorre(Number(btn.dataset.editTorreId), true); }));
  sidePanel.querySelectorAll<HTMLElement>("[data-punto-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.torre) return;
      state.selectedPuntoId = Number(btn.dataset.puntoId);
      state.selectedLoteId = null;
      render();
    });
  });
  sidePanel.querySelectorAll<HTMLElement>("[data-lote-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void selectLote(Number(btn.dataset.loteId));
    });
  });
}

function renderPuntoForm(punto: PuntoInteres | null, pos: Punto | null): void {
  const isNew = punto === null;
  const draft = state.puntoDraft;
  const nombre = draft ? draft.nombre : (punto?.nombre ?? "");
  const informacion = draft ? draft.informacion : (punto?.informacion ?? "");
  const imagenes = punto?.imagenes ?? [];
  const atLimit = imagenes.length >= MAX_IMAGENES_POR_PUNTO;
  const canEditImages = punto !== null;

  const imagenesHtml = !canEditImages
    ? ""
    : `
      <div class="field">
        <label>Imágenes</label>
        <div class="lote-imgs" id="punto-imgs">
          ${imagenes
            .map(
              (img) => `
            <div class="lote-img">
              <img src="${escapeHtml(img.path)}" alt="Imagen del punto" />
              <button type="button" class="img-remove" data-punto-img-id="${img.id}" aria-label="Quitar imagen">&times;</button>
            </div>`,
            )
            .join("")}
          ${
            atLimit
              ? ""
              : `<button type="button" class="img-add" id="punto-img-add" title="Agregar imagen" aria-label="Agregar imagen">
            <span>+</span>
          </button>`
          }
        </div>
        ${atLimit ? `<small class="hint">Máximo ${MAX_IMAGENES_POR_PUNTO} imágenes</small>` : ""}
      </div>`;

  sidePanel.innerHTML = `
    <form id="punto-form" class="form-col" autocomplete="off">
      <div class="form-head">
        ${
          isNew
            ? ""
            : '<button type="button" id="punto-back" class="back-btn" aria-label="Volver"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></button>'
        }
        <h2>${escapeHtml(isNew ? "Nuevo punto de interés" : nombre)}</h2>
        <span class="panel-spacer" aria-hidden="true"></span>
      </div>
      <div class="form-fields">
        <div class="field">
          <label for="punto-nombre">Nombre</label>
          <input id="punto-nombre" type="text" maxlength="120" required value="${escapeHtml(nombre)}" />
        </div>
        <div class="field">
          <label for="punto-info">Información</label>
          <textarea id="punto-info" rows="7" maxlength="2000" placeholder="Descripción que verá el visitante en el popup">${escapeHtml(informacion)}</textarea>
        </div>
        ${imagenesHtml}
      </div>
      <div class="form-actions">
        <p id="form-error" class="form-error" hidden></p>
        <p id="form-success" class="form-success" hidden></p>
        <div class="actions">
          <button type="submit" id="punto-save-btn" class="btn-primary" ${!isNew && !state.puntoDirty ? "disabled" : ""}>${isNew ? "Crear punto" : "Guardar cambios"}</button>
          ${!isNew ? '<button type="button" id="punto-delete" class="btn-danger">Eliminar punto</button>' : ""}
          ${isNew ? '<button type="button" id="punto-cancel" class="btn-secondary">Cancelar</button>' : ""}
        </div>
      </div>
    </form>
  `;

  document.getElementById("punto-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    void savePunto(punto, pos);
  });

  const markPuntoDirty = (): void => {
    state.puntoDirty = true;
    state.puntoDraft = {
      nombre:
        (document.getElementById("punto-nombre") as HTMLInputElement | null)?.value ?? "",
      informacion:
        (document.getElementById("punto-info") as HTMLTextAreaElement | null)?.value ?? "",
    };
    const btn = document.getElementById("punto-save-btn") as HTMLButtonElement | null;
    if (btn) btn.disabled = false;
  };
  document.getElementById("punto-nombre")?.addEventListener("input", markPuntoDirty);
  document.getElementById("punto-info")?.addEventListener("input", markPuntoDirty);

  const close = (): void => {
    state.nuevoPuntoPos = null;
    state.selectedPuntoId = null;
    state.puntoDraft = null;
    state.puntoDirty = false;
    render();
  };
  document.getElementById("punto-cancel")?.addEventListener("click", close);
  document.getElementById("punto-back")?.addEventListener("click", close);

  if (punto) {
    document.getElementById("punto-delete")?.addEventListener("click", () => {
      void (async () => {
        if (await confirmDeletePunto(punto)) void deletePunto(punto.id);
      })();
    });
    bindPuntoImageHandlers(punto);
  }
}

function savePunto(punto: PuntoInteres | null, pos: Punto | null): void {
  clearFormError();
  const nombreEl = document.getElementById("punto-nombre") as HTMLInputElement | null;
  const infoEl = document.getElementById("punto-info") as HTMLTextAreaElement | null;
  const nombre = nombreEl?.value.trim() ?? "";
  const informacion = infoEl?.value.trim() ?? "";
  if (!nombre) {
    showFormError("El nombre es obligatorio");
    return;
  }

  if (punto === null) {
    const nuevo: PuntoInteres = {
      id: genTempId(),
      nombre,
      informacion,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      imagenes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.puntos.push(nuevo);
    state.selectedPuntoId = nuevo.id;
    state.nuevoPuntoPos = null;
    state.mode = "lotes";
    state.puntoDraft = null;
    state.puntoDirty = false;
    commitHistory(`Crear punto ${nombre}`);
    render();
    showFormSuccess("Punto creado. No olvides publicar.");
    return;
  }

  const target = state.puntos.find((p) => p.id === punto.id);
  if (target) {
    target.nombre = nombre;
    target.informacion = informacion;
  }
  state.puntoDraft = null;
  state.puntoDirty = false;
  commitHistory(`Editar punto ${nombre}`);
  render();
  showFormSuccess("Cambios aplicados. No olvides publicar.");
}

function deletePunto(id: number): void {
  const punto = state.puntos.find((p) => p.id === id);
  state.puntos = state.puntos.filter((p) => p.id !== id);
  if (state.selectedPuntoId === id) state.selectedPuntoId = null;
  state.puntoDraft = null;
  state.puntoDirty = false;
  commitHistory(`Eliminar punto ${punto?.nombre ?? ""}`.trim());
  render();
  showFormSuccess("Punto eliminado. No olvides publicar.");
}

async function confirmDeletePunto(punto: PuntoInteres): Promise<boolean> {
  const action = await showModal({
    title: "Eliminar punto de interés",
    message: `¿Eliminar "${escapeHtml(punto.nombre)}"? Esta acción no se puede deshacer.`,
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Eliminar", value: "confirm", className: "btn-danger" },
    ],
  });
  return action === "confirm";
}

function bindPuntoImageHandlers(punto: PuntoInteres): void {
  document
    .getElementById("punto-img-add")
    ?.addEventListener("click", () => openPuntoImagePicker(punto));
  sidePanel.querySelectorAll<HTMLElement>("[data-punto-img-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const imagenId = Number(btn.dataset.puntoImgId);
      if (Number.isInteger(imagenId)) void deletePuntoImage(punto.id, imagenId);
    });
  });
}

function openPuntoImagePicker(punto: PuntoInteres): void {
  const existing = punto.imagenes.map((img) => img.path);
  const remaining = MAX_IMAGENES_POR_PUNTO - existing.length;
  if (remaining <= 0) return;
  void openImagePicker({ limit: remaining, existing }).then((paths) => {
    if (paths.length === 0) return;
    if (punto.id > 0) {
      void attachPuntoImages(punto.id, paths);
      return;
    }
    for (const path of paths) {
      if (punto.imagenes.length >= MAX_IMAGENES_POR_PUNTO) break;
      const imgId = genTempId();
      punto.imagenes.push({ id: imgId, path });
      state.pendingImagePaths.set(imgId, path);
    }
    state.puntoDirty = true;
    render();
    updateDirtyIndicator();
  });
}

async function attachPuntoImage(puntoId: number, path: string): Promise<PuntoImagenItem> {
  const res = await fetch(`/api/admin/puntos/${puntoId}/imagenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: [path] }),
  });
  const r = (await res.json()) as {
    ok: boolean;
    data?: { added?: PuntoImagenItem[]; imagenes?: PuntoImagenItem[] };
    error?: string;
  };
  const added =
    r.data?.added?.[0] ?? r.data?.imagenes?.find((img) => img.path === path);
  if (!r.ok || !added) throw new Error(r.error ?? "Error al adjuntar la imagen");
  return added;
}

async function attachPuntoImages(puntoId: number, paths: string[]): Promise<void> {
  try {
    const res = await fetch(`/api/admin/puntos/${puntoId}/imagenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    const r = (await res.json()) as {
      ok: boolean;
      data?: { imagenes: PuntoImagenItem[] };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al adjuntar las imágenes");
    const punto = state.puntos.find((p) => p.id === puntoId);
    if (punto) punto.imagenes = r.data.imagenes;
    state.puntoDirty = true;
    state.hasUnpublished = true;
    render();
    updateDirtyIndicator();
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  }
}

async function deletePuntoImage(puntoId: number, imagenId: number): Promise<void> {
  if (imagenId < 0) {
    const punto = state.puntos.find((p) => p.id === puntoId);
    if (punto) punto.imagenes = punto.imagenes.filter((img) => img.id !== imagenId);
    state.pendingImagePaths.delete(imagenId);
    state.puntoDirty = true;
    render();
    updateDirtyIndicator();
    return;
  }
  try {
    const res = await fetch(`/api/admin/puntos/${puntoId}/imagenes/${imagenId}`, {
      method: "DELETE",
    });
    const r = (await res.json()) as {
      ok: boolean;
      data?: { imagenes: PuntoImagenItem[] };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al quitar la imagen");
    const punto = state.puntos.find((p) => p.id === puntoId);
    if (punto) punto.imagenes = r.data.imagenes;
    state.puntoDirty = true;
    state.hasUnpublished = true;
    render();
    updateDirtyIndicator();
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  }
}

function renderTorreForm(): void {
  const pending = state.pendingNuevaTorre ?? state.torre!;
  const isNew = state.pendingNuevaTorre !== null;
  const draft = state.torreDraft;
  const grupo = draft?.grupo ?? pending.grupo;
  const nombrePersonalizado = draft?.nombrePersonalizado ?? pending.nombrePersonalizado ?? "";
  const cantidad = draft?.cantidadNiveles ?? String(pending.cantidadNiveles);
  const imagenes = draft?.imagenesNivel ?? pending.imagenesNivel;
  const count = Math.max(1, Math.min(200, Number(cantidad) || 1));
  state.torreImagenNivel = Math.min(state.torreImagenNivel, count);
  const imagePath = imagenes[String(state.torreImagenNivel)];
  const perimetros = draft?.perimetrosNivel ?? pending.perimetrosNivel ?? {};
  sidePanel.innerHTML = `
    <form id="tower-form" class="form-col" autocomplete="off">
      <div class="form-head"><h2>${isNew ? "Nuevo edificio" : escapeHtml(nombreEdificio(state.torre!))}</h2></div>
      <div class="form-fields">
        <p class="muted">${isNew ? "Guarda el perímetro para entrar al edificio y dibujar sus apartamentos." : "Arrastra los vértices. Doble clic en el contorno agrega uno; Supr elimina el vértice seleccionado. El perímetro debe conservar todos sus apartamentos dentro."}</p>
        <div class="field"><label for="torreNombrePersonalizado">Nombre personalizado (opcional)</label><input id="torreNombrePersonalizado" maxlength="100" value="${escapeHtml(nombrePersonalizado)}" placeholder="Ej. Edificio Mirador" /></div>
        <div class="field"><label for="torreNombre">Nomenclatura</label><select id="torreNombre" ${isNew ? "" : "disabled"}>${NOMENCLATURAS_TORRE.map((nombre) => `<option value="${nombre}" ${nombre === grupo.nombre ? "selected" : ""}>${nombre}</option>`).join("")}</select></div>
        <div class="field"><label for="torreTipo">Tipo de numeración</label><select id="torreTipo" ${isNew ? "" : "disabled"}><option value="alfabetico" ${grupo.tipoIdentificador === "alfabetico" ? "selected" : ""}>Alfabética (A, B, C…)</option><option value="numerico" ${grupo.tipoIdentificador === "numerico" ? "selected" : ""}>Numérica (1, 2, 3…)</option></select></div>
        <div class="field"><label for="torreIdentificador">Numeración del edificio</label><input id="torreIdentificador" maxlength="16" required ${isNew ? "" : "readonly"} value="${escapeHtml(grupo.identificador)}" /></div>
        <div class="field"><label for="torreCantidadNiveles">Cantidad de niveles</label><input id="torreCantidadNiveles" type="number" min="1" max="200" step="1" required value="${escapeHtml(cantidad)}" /><small>Reducir la cantidad quita las imágenes de los niveles eliminados. No se permite si contienen apartamentos.</small></div>
        <div class="field"><label for="torreImagenNivel">Nivel: perímetro e imagen</label><select id="torreImagenNivel">${Array.from({ length: count }, (_, i) => `<option value="${i + 1}" ${state.torreImagenNivel === i + 1 ? "selected" : ""}>${escapeHtml(pending.nombreNivel)} ${i + 1}</option>`).join("")}</select></div>
        ${isNew ? '<small>Guarda primero el edificio para personalizar los perímetros de cada nivel.</small>' : `<div class="field"><label>Perímetro de ${escapeHtml(pending.nombreNivel)} ${state.torreImagenNivel}</label>
          <small>${perimetros[String(state.torreImagenNivel)] ? "Perímetro personalizado" : "Hereda el perímetro del edificio"}</small>
          <div class="actions"><button type="button" id="floor-perimeter-draw" class="btn-secondary">Dibujar nuevo perímetro</button><button type="button" id="floor-perimeter-edit" class="btn-secondary">Editar vértices del nivel</button>${perimetros[String(state.torreImagenNivel)] ? '<button type="button" id="floor-perimeter-reset" class="btn-secondary">Usar perímetro del edificio</button>' : ""}</div>
          <button type="button" id="building-perimeter-edit" class="btn-secondary">Editar perímetro original del edificio</button>
          <small>Editando: ${editingFloorPerimeter === null ? "perímetro original del edificio" : `${escapeHtml(pending.nombreNivel)} ${editingFloorPerimeter}`}</small></div>`}
        ${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="Plano de ${escapeHtml(pending.nombreNivel)} ${state.torreImagenNivel}" style="width:100%;max-height:160px;object-fit:contain;margin-top:.6rem" />` : '<p class="muted">Este nivel no tiene imagen base.</p>'}
        <div class="actions"><button type="button" class="btn-secondary" id="tower-image-pick">${imagePath ? "Cambiar imagen" : "Elegir / subir imagen"}</button>${imagePath ? '<button type="button" class="btn-secondary" id="tower-image-remove">Quitar imagen</button>' : ""}</div>
        <p class="muted">Los apartamentos comienzan en ${escapeHtml(pending.nombreNivel)} 1.</p>
      </div>
      <div class="form-actions"><p id="form-error" class="form-error" hidden></p><div class="actions"><button type="submit" class="btn-primary" ${isNew || state.torreFormDirty ? "" : "disabled"}>${isNew ? "Crear edificio" : "Guardar cambios"}</button><button type="button" id="cancel-tower" class="btn-secondary">${isNew ? "Cancelar" : "Volver a apartamentos"}</button>${isNew ? "" : '<button type="button" id="delete-tower" class="btn-danger">Eliminar edificio</button>'}</div></div>
    </form>`;
  const nombre = document.getElementById("torreNombre") as HTMLSelectElement;
  const tipo = document.getElementById("torreTipo") as HTMLSelectElement;
  const identificador = document.getElementById("torreIdentificador") as HTMLInputElement;
  const nombreInput = document.getElementById("torreNombrePersonalizado") as HTMLInputElement;
  const nivelesInput = document.getElementById("torreCantidadNiveles") as HTMLInputElement;
  const capturar = () => {
    state.torreDraft = { grupo: { nombre: nombre.value, tipoIdentificador: tipo.value as GrupoViviendas["tipoIdentificador"], identificador: identificador.value }, nombrePersonalizado: nombreInput.value, cantidadNiveles: nivelesInput.value, imagenesNivel: structuredClone(state.torreDraft?.imagenesNivel ?? pending.imagenesNivel), perimetrosNivel: structuredClone(state.torreDraft?.perimetrosNivel ?? pending.perimetrosNivel ?? {}) };
    state.torreFormDirty = true;
    const save = sidePanel.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (save) save.disabled = false;
    identificador.inputMode = tipo.value === "numerico" ? "numeric" : "text";
    updateDirtyIndicator();
  };
  [nombre, tipo, identificador, nombreInput, nivelesInput].forEach((el) => { el.addEventListener("input", capturar); el.addEventListener("change", capturar); });
  nivelesInput.addEventListener("change", () => { renderTorreForm(); });
  identificador.inputMode = grupo.tipoIdentificador === "numerico" ? "numeric" : "text";
  document.getElementById("tower-form")?.addEventListener("submit", (e) => { e.preventDefault(); saveTorre(); });
  document.getElementById("cancel-tower")?.addEventListener("click", () => {
    if (isNew) cancelDraw();
    else void (async () => { if (await confirmDiscard()) { clearTorreEdit(); render(); } })();
  });
  document.getElementById("delete-tower")?.addEventListener("click", () => { void eliminarEdificio(); });
  document.getElementById("torreImagenNivel")?.addEventListener("change", (e) => {
    state.torreImagenNivel = Number((e.target as HTMLSelectElement).value);
    state.selectedTorreVertex = null;
    state.draggingTorreVertex = null;
    if (editingFloorPerimeter !== null) editingFloorPerimeter = state.torreImagenNivel;
    if (!isNew) state.nivelActivo = state.torreImagenNivel;
    render();
  });
  document.getElementById("floor-perimeter-draw")?.addEventListener("click", () => {
    capturar();
    drawingFloorPerimeter = state.torreImagenNivel;
    editingFloorPerimeter = state.torreImagenNivel;
    state.nivelActivo = state.torreImagenNivel;
    state.currentPolygon = [];
    state.selectedTorreVertex = null;
    state.drawError = "";
    state.mode = "draw";
    render();
  });
  document.getElementById("floor-perimeter-edit")?.addEventListener("click", () => {
    capturar();
    editingFloorPerimeter = state.torreImagenNivel;
    state.nivelActivo = state.torreImagenNivel;
    state.selectedTorreVertex = null;
    render();
  });
  document.getElementById("building-perimeter-edit")?.addEventListener("click", () => {
    editingFloorPerimeter = null;
    state.selectedTorreVertex = null;
    render();
  });
  document.getElementById("floor-perimeter-reset")?.addEventListener("click", () => {
    capturar();
    const candidate = structuredClone(state.torreDraft!.perimetrosNivel);
    delete candidate[String(state.torreImagenNivel)];
    const error = validarCambioTorre({ ...torreEditada(), perimetrosNivel: candidate }, state.lotes.filter((l) => l.torreId === state.torre!.id));
    if (error) { showFormError(error); return; }
    state.torreDraft!.perimetrosNivel = candidate;
    editingFloorPerimeter = state.torreImagenNivel;
    state.selectedTorreVertex = null;
    render();
  });
  document.getElementById("tower-image-pick")?.addEventListener("click", () => {
    capturar();
    const nivel = state.torreImagenNivel;
    void openImagePicker({ limit: 1, existing: [] }).then((paths) => {
      if (!paths?.length || (isNew ? state.pendingNuevaTorre !== pending : !state.editingTorre || state.torre?.id !== (pending as Torre).id)) return;
      state.torreDraft!.imagenesNivel[String(nivel)] = paths[0];
      state.torreFormDirty = true;
      render();
      updateDirtyIndicator();
    });
  });
  document.getElementById("tower-image-remove")?.addEventListener("click", () => {
    capturar();
    delete state.torreDraft!.imagenesNivel[String(state.torreImagenNivel)];
    render();
    updateDirtyIndicator();
  });
}

function saveTorre(): boolean {
  const pending = state.pendingNuevaTorre ?? (state.editingTorre ? state.torre : null);
  if (!pending) return false;
  const isNew = state.pendingNuevaTorre !== null;
  const draft = state.torreDraft;
  const cantidadNiveles = draft ? Number(draft.cantidadNiveles) : pending.cantidadNiveles;
  const imagenesNivel = Object.fromEntries(Object.entries(draft?.imagenesNivel ?? pending.imagenesNivel).filter(([nivel]) => Number(nivel) <= cantidadNiveles));
  const perimetrosNivel = Object.fromEntries(Object.entries(draft?.perimetrosNivel ?? pending.perimetrosNivel ?? {}).filter(([nivel]) => Number(nivel) <= cantidadNiveles));
  const result = torreCreateSchema.safeParse({ ...pending, grupo: isNew ? draft?.grupo ?? pending.grupo : pending.grupo, nombrePersonalizado: draft?.nombrePersonalizado ?? pending.nombrePersonalizado, cantidadNiveles, imagenesNivel, perimetrosNivel });
  if (!result.success) { showFormError(result.error.issues[0]?.message ?? "Edificio inválido"); return false; }
  if (isNew && state.torres.some((t) => claveGrupo(t.grupo) === claveGrupo(result.data.grupo))) { showFormError("Ya existe un edificio con esta numeración"); return false; }
  if (!isNew) {
    const error = validarCambioTorre(result.data, state.lotes.filter((l) => l.torreId === state.torre!.id));
    if (error) { showFormError(error); return false; }
  }
  const torre: Torre = isNew ? { ...result.data, id: genTempId(), createdAt: Date.now(), updatedAt: Date.now() } : { ...state.torre!, ...result.data, updatedAt: Date.now() };
  if (isNew) state.torres.push(torre);
  else state.torres[state.torres.findIndex((t) => t.id === torre.id)] = torre;
  state.torre = torre;
  state.nivelActivo = isNew ? 1 : Math.min(state.nivelActivo, torre.cantidadNiveles);
  state.pendingNuevaTorre = null;
  state.torreDraft = null;
  clearTorreEdit();
  state.dibujandoTorre = false;
  state.drawError = "";
  clearFormDraft();
  state.mode = isNew ? "draw" : "lotes";
  commitHistory(`${isNew ? "Crear" : "Editar"} ${nombreEdificio(torre)}`);
  render();
  return true;
}

function renderLotForm(lote: LoteConModelo | NewLote, isNew: boolean): void {
  const draft = state.draft;
  const apartamento = lote.tipoVivienda === "apartamento";
  const viviendaLabel = apartamento ? "apartamento" : "casa";
  const gruposExistentes = apartamento ? new Map(state.torres.map((t) => [claveGrupo(t.grupo), t.grupo])) : new Map(state.lotes.filter((l) => l.grupo && l.tipoVivienda === "casa").map((l) => [claveGrupo(l.grupo), l.grupo!]));
  const grupoSeleccion = draft?.grupoSeleccion ?? claveGrupo(lote.grupo);
  const grupoNombre = draft?.grupoNombre ?? lote.grupo?.nombre ?? initialData.grupoDefaults.nombre;
  const grupoTipo = draft?.grupoTipo ?? lote.grupo?.tipoIdentificador ?? initialData.grupoDefaults.tipoIdentificador;
  const grupoIdentificador = draft?.grupoIdentificador ?? lote.grupo?.identificador ?? "";
  const torreAsignada = apartamento ? state.torres.find((t) => claveGrupo(t.grupo) === grupoSeleccion) : null;
  const gruposOptions = [...gruposExistentes].sort((a, b) => nombreGrupo(a[1]).localeCompare(nombreGrupo(b[1]), "es", { numeric: true })).map(([clave, grupo]) =>
    `<option value="${escapeHtml(clave)}" ${clave === grupoSeleccion ? "selected" : ""}>${escapeHtml(apartamento ? nombreEdificio(state.torres.find((t) => claveGrupo(t.grupo) === clave)!) : nombreGrupo(grupo))}</option>`).join("");
  const numeroLote = draft ? draft.numeroLote : isNew ? "" : (lote as LoteConModelo).numeroLote;
  const estado = draft ? draft.estado : lote.estado;
  const modeloId = draft
    ? draft.modeloId
    : lote.modeloId === null || lote.modeloId === undefined
      ? ""
      : String(lote.modeloId);
  const terrenoM2 = draft
    ? draft.terrenoM2
    : lote.terrenoM2 === null || lote.terrenoM2 === undefined
      ? ""
      : String(lote.terrenoM2);
  const dimensionesLote = draft
    ? draft.dimensionesLote
    : lote.dimensionesLote === null || lote.dimensionesLote === undefined
      ? ""
      : lote.dimensionesLote;

  const titleModel =
    !isNew && modeloId
      ? (state.modelos.find((m) => String(m.id) === modeloId)?.nombre ?? null)
      : null;
  const title = isNew
    ? (apartamento ? "Nuevo apartamento" : "Nueva casa")
    : titleModel
      ? `${apartamento ? "Apartamento" : "Casa"} ${numeroLote} · ${titleModel}`
      : `${apartamento ? "Apartamento" : "Casa"} ${numeroLote} · Sin modelo`;

  const modelosOptions = state.modelos
    .filter((m) => m.tipo === lote.tipoVivienda)
    .map(
      (m) =>
        `<option value="${m.id}" ${String(m.id) === modeloId ? "selected" : ""}>${escapeHtml(m.nombre)}</option>`,
    )
    .join("");

  const backButton = isNew
    ? ""
    : '<button type="button" id="back-to-list" class="back-btn" aria-label="Volver a la lista de viviendas"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></button>';

  const baseImagenes = isNew ? [] : (lote as LoteConModelo).imagenes;
  const keptImagenes = baseImagenes.filter(
    (img) => !state.pendingImageRemoves.includes(img.id),
  );
  const pendingAdds = state.pendingImageAdds;
  const effectiveCount = keptImagenes.length + pendingAdds.length;
  const imagenesAtLimit = effectiveCount >= MAX_IMAGENES_POR_LOTE;

  const keptHtml = keptImagenes
    .map(
      (img) => `
    <div class="lote-img">
      <img src="${escapeHtml(img.path)}" alt="Imagen de la vivienda" />
      <button type="button" class="img-remove" data-img-id="${img.id}" aria-label="Quitar imagen">&times;</button>
    </div>`,
    )
    .join("");

  const pendingHtml = pendingAdds
    .map(
      (p, i) => `
    <div class="lote-img">
      <img src="${p.url}" alt="Imagen nueva" />
      <button type="button" class="img-remove" data-pending-index="${i}" aria-label="Quitar imagen">&times;</button>
    </div>`,
    )
    .join("");

  const imagenesHtml = isNew
    ? ""
    : `
      <div class="field">
        <label>Imágenes ${apartamento ? "del apartamento" : "de la casa"}</label>
        <div class="lote-imgs" id="lote-imgs">
          ${keptHtml}${pendingHtml}
          ${imagenesAtLimit ? "" : `
          <button type="button" class="img-add" id="lote-img-add" title="Agregar imagen" aria-label="Agregar imagen">
            <span>+</span>
          </button>`}
        </div>
        ${imagenesAtLimit ? `<small class="hint">Máximo ${MAX_IMAGENES_POR_LOTE} imágenes por vivienda</small>` : ""}
      </div>`;

  const saveDisabled = !isNew && !state.formDirty;
  const plantaPath = draft ? draft.plantaArquitectonicaPath : lote.plantaArquitectonicaPath ?? "";

  sidePanel.innerHTML = `
    <form id="lot-form" class="form-col" autocomplete="off">
      <div class="form-head">
        ${backButton}
        <h2>${escapeHtml(title)}</h2>
        <span class="panel-spacer" aria-hidden="true"></span>
      </div>
      <div class="form-fields">
        <div class="field">
          <label for="grupoSeleccion">${apartamento ? "Edificio al que pertenece" : "Grupo de viviendas"}</label>
          <select id="grupoSeleccion">
            ${apartamento ? "" : `<option value="" ${grupoSeleccion === "" ? "selected" : ""}>Sin grupo</option>`}
            ${gruposOptions}
            ${apartamento ? "" : `<option value="nuevo" ${grupoSeleccion === "nuevo" ? "selected" : ""}>Crear / asignar otro grupo…</option>`}
          </select>
        </div>
        <div id="grupo-nuevo" ${grupoSeleccion === "nuevo" ? "" : "hidden"}>
          <div class="field">
            <label for="grupoNombre">Nomenclatura ${apartamento ? "del edificio" : "del grupo"}</label>
            ${apartamento ? `<select id="grupoNombre">${NOMENCLATURAS_TORRE.map((nombre) => `<option value="${nombre}" ${grupoNombre === nombre ? "selected" : ""}>${nombre}</option>`).join("")}</select>` : `<input id="grupoNombre" list="nomenclaturas-grupo" maxlength="64" value="${escapeHtml(grupoNombre)}" placeholder="Polígono o nombre personalizado" /><datalist id="nomenclaturas-grupo">${NOMENCLATURAS_GRUPO.map((nombre) => `<option value="${nombre}"></option>`).join("")}</datalist>`}
          </div>
          <div class="field">
            <label for="grupoTipo">Tipo de identificador</label>
            <select id="grupoTipo">
              <option value="alfabetico" ${grupoTipo === "alfabetico" ? "selected" : ""}>Alfabético (A, B, C…)</option>
              <option value="numerico" ${grupoTipo === "numerico" ? "selected" : ""}>Numérico (1, 2, 3…)</option>
            </select>
          </div>
          <div class="field">
            <label for="grupoIdentificador">${apartamento ? "Numeración del edificio" : "Identificador del grupo"}</label>
            <input id="grupoIdentificador" maxlength="16" list="letras-grupo" value="${escapeHtml(grupoIdentificador)}" placeholder="${grupoTipo === "alfabetico" ? "A" : "1"}" />
            <datalist id="letras-grupo">${"ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").map((letra) => `<option value="${letra}"></option>`).join("")}</datalist>
            <datalist id="numeros-grupo">${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}"></option>`).join("")}</datalist>
          </div>
        </div>
        ${apartamento ? `<div class="field"><label for="nivel">${escapeHtml(lote.nombreNivel)}</label><input id="nivel" type="number" min="1" max="${torreAsignada?.cantidadNiveles ?? 1}" step="1" required value="${escapeHtml(draft?.nivel ?? String(lote.nivel ?? 1))}" /></div>` : ""}
        <div class="field">
          <label for="numeroLote">Número de ${viviendaLabel}</label>
          <input id="numeroLote" type="number" min="0" step="1" required value="${escapeHtml(numeroLote)}" />
        </div>
        <div class="field">
          <label for="estado">Estado</label>
          <select id="estado">
            <option value="disponible" ${estado === "disponible" ? "selected" : ""}>Disponible</option>
            <option value="reservado" ${estado === "reservado" ? "selected" : ""}>Reservado</option>
            <option value="vendido" ${estado === "vendido" ? "selected" : ""}>Vendido</option>
          </select>
        </div>
        <div class="field">
          <label for="modeloId">Modelo de ${viviendaLabel}</label>
          <select id="modeloId">
            <option value="" ${modeloId === "" ? "selected" : ""}>— Sin modelo —</option>
            ${modelosOptions}
          </select>
        </div>
        <div class="field" ${apartamento ? 'style="display:none"' : ""}>
          <label for="terrenoM2">Terreno (m²)</label>
          <input id="terrenoM2" type="number" step="0.01" min="0" value="${escapeHtml(terrenoM2)}" />
        </div>
        <div class="field" ${apartamento ? 'style="display:none"' : ""}>
          <label for="dimensionesLote">Dimensiones del terreno</label>
          <input id="dimensionesLote" type="text" maxlength="64" value="${escapeHtml(dimensionesLote)}" placeholder="ej. 15m x 7m" />
        </div>
        <div class="field">
          <label>Planta arquitectónica</label>
          <input type="hidden" id="planta-arquitectonica-path" value="${escapeHtml(plantaPath)}" />
          ${plantaPath ? `<img src="${escapeHtml(plantaPath)}" alt="Planta arquitectónica" style="width:100%;max-height:200px;object-fit:contain" />` : '<small class="hint">Sin planta arquitectónica.</small>'}
          <div class="actions">
            <button type="button" id="planta-arquitectonica-add" class="btn-secondary">${plantaPath ? "Cambiar planta" : "Agregar planta"}</button>
            ${plantaPath ? '<button type="button" id="planta-arquitectonica-remove" class="btn-secondary">Quitar planta</button>' : ""}
          </div>
        </div>
        ${imagenesHtml}
      </div>
      <div class="form-actions">
        <p id="form-error" class="form-error" hidden></p>
        <p id="form-success" class="form-success" hidden></p>
        <div class="actions">
          <button type="submit" id="save-lote-btn" class="btn-primary" ${saveDisabled ? "disabled" : ""}>${isNew ? `Crear ${viviendaLabel}` : "Guardar cambios"}</button>
          ${!isNew ? `<button type="button" id="delete-lote" class="btn-danger">Eliminar ${viviendaLabel}</button>` : ""}
          ${isNew ? '<button type="button" id="cancel-new" class="btn-secondary">Cancelar</button>' : ""}
        </div>
      </div>
    </form>
  `;

  document.getElementById("lot-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveLote();
  });
  document.getElementById("planta-arquitectonica-add")?.addEventListener("click", () => {
    void (async () => {
      const paths = await openImagePicker({ limit: 1, existing: [] });
      if (!paths?.length || !document.getElementById("planta-arquitectonica-path")) return;
      (document.getElementById("planta-arquitectonica-path") as HTMLInputElement).value = paths[0];
      markFormDirty();
      renderSidePanel();
    })();
  });
  document.getElementById("planta-arquitectonica-remove")?.addEventListener("click", () => {
    (document.getElementById("planta-arquitectonica-path") as HTMLInputElement).value = "";
    markFormDirty();
    renderSidePanel();
  });

  if (isNew) {
    document.getElementById("cancel-new")?.addEventListener("click", () => {
      resetPendingImages();
      clearFormDraft();
      state.pendingNewLote = null;
      state.currentPolygon = [];
      state.mode = "lotes";
      render();
    });
  } else {
    document.getElementById("back-to-list")?.addEventListener("click", () => {
      void selectLote(null);
    });
    document.getElementById("delete-lote")?.addEventListener("click", () => {
      void (async () => {
        if (await confirmDeleteLote()) void deleteLote();
      })();
    });
    bindImageHandlers();
  }

  const numeroLoteEl = document.getElementById("numeroLote") as HTMLInputElement | null;
  const estadoEl = document.getElementById("estado") as HTMLSelectElement | null;
  const modeloSelect = document.getElementById("modeloId") as HTMLSelectElement | null;
  const terrenoInput = document.getElementById("terrenoM2") as HTMLInputElement | null;
  const dimensionesInput = document.getElementById("dimensionesLote") as HTMLInputElement | null;
  const grupoSelect = document.getElementById("grupoSeleccion") as HTMLSelectElement;
  const grupoTipoEl = document.getElementById("grupoTipo") as HTMLSelectElement;
  const grupoIdEl = document.getElementById("grupoIdentificador") as HTMLInputElement;
  const syncGrupoInputs = () => {
    document.getElementById("grupo-nuevo")!.hidden = grupoSelect.value !== "nuevo";
    grupoIdEl.setAttribute("list", grupoTipoEl.value === "alfabetico" ? "letras-grupo" : "numeros-grupo");
    grupoIdEl.inputMode = grupoTipoEl.value === "numerico" ? "numeric" : "text";
    grupoIdEl.placeholder = grupoTipoEl.value === "numerico" ? "1" : "A";
  };
  grupoSelect.addEventListener("change", syncGrupoInputs);
  grupoTipoEl.addEventListener("change", syncGrupoInputs);
  syncGrupoInputs();

  [numeroLoteEl, estadoEl, modeloSelect, terrenoInput, dimensionesInput, grupoSelect, grupoTipoEl, grupoIdEl, document.getElementById("grupoNombre"), document.getElementById("nivel")].forEach((el) => {
    el?.addEventListener("input", markFormDirty);
    el?.addEventListener("change", markFormDirty);
  });

  modeloSelect?.addEventListener("change", () => {
    const id = Number(modeloSelect.value);
    if (!id) return;
    const modelo = state.modelos.find((m) => m.id === id);
    if (!modelo) return;
    if (isNew && !apartamento) {
      if (terrenoInput && !terrenoInput.value) {
        terrenoInput.value = String(modelo.terrenoM2);
      }
      if (dimensionesInput && !dimensionesInput.value && modelo.dimensionesLote) {
        dimensionesInput.value = modelo.dimensionesLote;
      }
    }
  });
}

function markFormDirty(): void {
  state.formDirty = true;
  const btn = document.getElementById("save-lote-btn") as HTMLButtonElement | null;
  if (btn) btn.disabled = false;
  state.draft = {
    plantaArquitectonicaPath: (document.getElementById("planta-arquitectonica-path") as HTMLInputElement | null)?.value ?? "",
    nivel: (document.getElementById("nivel") as HTMLInputElement | null)?.value ?? "",
    grupoSeleccion: (document.getElementById("grupoSeleccion") as HTMLSelectElement | null)?.value ?? "",
    grupoNombre: (document.getElementById("grupoNombre") as HTMLInputElement | HTMLSelectElement | null)?.value ?? "",
    grupoTipo: (document.getElementById("grupoTipo") as HTMLSelectElement | null)?.value ?? "alfabetico",
    grupoIdentificador: (document.getElementById("grupoIdentificador") as HTMLInputElement | null)?.value ?? "",
    numeroLote:
      (document.getElementById("numeroLote") as HTMLInputElement | null)?.value ?? "",
    estado:
      ((document.getElementById("estado") as HTMLSelectElement | null)?.value as LoteEstado) ??
      "disponible",
    modeloId:
      (document.getElementById("modeloId") as HTMLSelectElement | null)?.value ?? "",
    terrenoM2:
      (document.getElementById("terrenoM2") as HTMLInputElement | null)?.value ?? "",
    dimensionesLote:
      (document.getElementById("dimensionesLote") as HTMLInputElement | null)?.value ?? "",
  };
}

function clearFormDraft(): void {
  state.draft = null;
  state.formDirty = false;
  state.puntoDraft = null;
  state.puntoDirty = false;
}

function renderLoteImages(): void {
  const container = document.getElementById("lote-imgs");
  if (!container) return;

  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
  const base = lote ? lote.imagenes : [];
  const kept = base.filter((img) => !state.pendingImageRemoves.includes(img.id));
  const effective = kept.length + state.pendingImageAdds.length;
  const atLimit = effective >= MAX_IMAGENES_POR_LOTE;

  container.innerHTML =
    kept
      .map(
        (img) => `
    <div class="lote-img">
      <img src="${escapeHtml(img.path)}" alt="Imagen de la vivienda" />
      <button type="button" class="img-remove" data-img-id="${img.id}" aria-label="Quitar imagen">&times;</button>
    </div>`,
      )
      .join("") +
    state.pendingImageAdds
      .map(
        (p, i) => `
    <div class="lote-img">
      <img src="${p.url}" alt="Imagen nueva" />
      <button type="button" class="img-remove" data-pending-index="${i}" aria-label="Quitar imagen">&times;</button>
    </div>`,
      )
      .join("") +
    (atLimit
      ? ""
      : `
    <button type="button" class="img-add" id="lote-img-add" title="Agregar imagen" aria-label="Agregar imagen">
      <span>+</span>
    </button>`);

  const field = container.closest(".field");
  field?.querySelector(".hint")?.remove();
  if (atLimit && field) {
    field.insertAdjacentHTML(
      "beforeend",
      `<small class="hint">Máximo ${MAX_IMAGENES_POR_LOTE} imágenes por vivienda</small>`,
    );
  }

  bindImageHandlers();
}

function openLoteImagePicker(): void {
  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
  if (!lote) return;
  const kept = lote.imagenes.filter(
    (img) => !state.pendingImageRemoves.includes(img.id),
  );
  const existing = [
    ...kept.map((img) => img.path),
    ...state.pendingImageAdds.map((p) => p.url),
  ];
  const remaining = MAX_IMAGENES_POR_LOTE - existing.length;
  if (remaining <= 0) return;
  void openImagePicker({ limit: remaining, existing }).then((paths) => {
    if (paths.length === 0) return;
    for (const path of paths) {
      state.pendingImageAdds.push({ file: null, url: path, path });
    }
    markFormDirty();
    renderLoteImages();
  });
}

function bindImageHandlers(): void {
  document
    .getElementById("lote-img-add")
    ?.addEventListener("click", openLoteImagePicker);
  sidePanel.querySelectorAll<HTMLElement>("[data-img-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const imgId = Number(btn.dataset.imgId);
      if (
        Number.isInteger(imgId) &&
        imgId !== 0 &&
        !state.pendingImageRemoves.includes(imgId)
      ) {
        state.pendingImageRemoves.push(imgId);
        markFormDirty();
        renderLoteImages();
      }
    });
  });
  sidePanel.querySelectorAll<HTMLElement>("[data-pending-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.pendingIndex);
      if (Number.isInteger(idx) && idx >= 0 && idx < state.pendingImageAdds.length) {
        const [removed] = state.pendingImageAdds.splice(idx, 1);
        if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
        markFormDirty();
        renderLoteImages();
      }
    });
  });
}

function renderModeButtons(): void {
  const creating = state.mode === "draw" || state.mode === "punto";
  document.getElementById("create-lote")?.classList.toggle("active", creating);
  document.getElementById("create-toggle")?.classList.toggle("active", creating);
  const create = document.getElementById("create-lote");
  const label = create?.querySelector("span");
  if (label) label.textContent = state.torre ? "Nuevo apartamento" : "Nueva casa";
  create?.setAttribute("aria-label", state.torre ? "Crear nuevo apartamento" : "Crear nueva casa");
  create?.setAttribute("title", state.torre ? "Crear nuevo apartamento" : "Crear nueva casa");
  const towerAction = document.getElementById("create-apartamento");
  if (towerAction) towerAction.textContent = state.torre ? "Nuevo apartamento" : "Nueva torre";
  const punto = document.getElementById("create-punto") as HTMLButtonElement | null;
  if (punto) punto.disabled = state.torre !== null;
  const context = document.getElementById("tower-context");
  if (context) context.hidden = state.torre === null;
  const contextLabel = document.getElementById("tower-context-label");
  if (contextLabel && state.torre) contextLabel.textContent = `${state.editingTorre ? "Editando" : "Apartamentos de"} ${nombreEdificio(state.torre)} · ${state.torre.nombreNivel} ${state.nivelActivo}`;
  const edit = document.getElementById("edit-tower") as HTMLButtonElement | null;
  if (edit) edit.disabled = state.editingTorre || state.syncing;
  const levels = document.getElementById("tower-levels");
  if (levels) {
    levels.hidden = !state.torre;
    levels.replaceChildren();
    if (state.torre) for (let i = state.torre.cantidadNiveles; i >= 1; i--) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${state.torre.nombreNivel} ${i}`;
      button.setAttribute("aria-current", String(i === state.nivelActivo));
      button.disabled = state.editingTorre || state.syncing;
      button.addEventListener("click", () => { void cambiarNivel(i); });
      levels.appendChild(button);
    }
  }
  if (create instanceof HTMLButtonElement) create.disabled = state.editingTorre;
  const shade = document.getElementById("tower-shade");
  if (shade) shade.style.display = state.torre === null ? "none" : "";
}

function renderMapOpacity(): void {
  if (!planImage) return;
  planImage.setAttribute(
    "opacity",
    state.polygonView === "estandar" ? "0.5" : String(planOpacity),
  );
}

function createSelectionToolbar(): void {
  const wrap = document.getElementById("canvas-wrap");
  if (!wrap) return;

  const el = document.createElement("div");
  el.className = "selection-toolbar";
  el.hidden = true;
  el.innerHTML = `
    <button type="button" data-action="edit" title="Editar vivienda" aria-label="Editar vivienda">${ICON_EDIT}</button>
    <button type="button" data-action="copy" title="Copiar vivienda (Ctrl+C)" aria-label="Copiar vivienda">${ICON_COPY}</button>
    <button type="button" data-action="delete" data-danger="true" title="Eliminar vivienda" aria-label="Eliminar vivienda">${ICON_TRASH}</button>
  `;
  el.querySelector<HTMLElement>('[data-action="edit"]')?.addEventListener("click", focusLotForm);
  el.querySelector<HTMLElement>('[data-action="copy"]')?.addEventListener("click", copyLote);
  el.querySelector<HTMLElement>('[data-action="delete"]')?.addEventListener("click", () => {
    void (async () => {
      if (await confirmDeleteLote()) deleteLote();
    })();
  });

  wrap.appendChild(el);
  selectionToolbar = el;
}

function renderSelectionToolbar(): void {
  if (!selectionToolbar) return;
  const lote =
    state.mode === "lotes" && state.selectedLoteId !== null
      ? state.lotes.find((l) => l.id === state.selectedLoteId)
      : undefined;

  if (!lote || lote.poligono.length === 0) {
    selectionToolbar.hidden = true;
    return;
  }

  const wrap = selectionToolbar.parentElement;
  const ctm = svg.getScreenCTM();
  if (!wrap || !ctm) {
    selectionToolbar.hidden = true;
    return;
  }

  const xs = lote.poligono.map((p) => p.x);
  const ys = lote.poligono.map((p) => p.y);
  const corner = svg.createSVGPoint();
  corner.x = Math.max(...xs);
  corner.y = Math.min(...ys);
  const screen = corner.matrixTransform(ctm);
  const wrapRect = wrap.getBoundingClientRect();
  const left = screen.x - wrapRect.left;
  const top = screen.y - wrapRect.top;

  selectionToolbar.hidden = false;
  selectionToolbar.style.left = `${left}px`;
  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.style.transform =
    top < 46 ? "translate(-100%, 8px)" : "translate(-100%, calc(-100% - 8px))";
}

function focusLotForm(): void {
  const input = document.getElementById("numeroLote") as HTMLInputElement | null;
  if (input) {
    input.focus();
    input.select();
  }
}

function captureSnapshot(lote: LoteConModelo): LoteSnapshot {
  return {
    plantaArquitectonicaPath: lote.plantaArquitectonicaPath ?? null,
    tipoVivienda: lote.tipoVivienda,
    nivel: lote.nivel,
    nombreNivel: lote.nombreNivel,
    grupo: structuredClone(lote.grupo),
    polygon: lote.poligono.map((p) => ({ ...p })),
    numeroLote: lote.numeroLote,
    estado: lote.estado,
    modeloId: lote.modeloId ?? null,
    terrenoM2: lote.terrenoM2,
    dimensionesLote: lote.dimensionesLote,
  };
}

function geometriaPermitida(vivienda: Pick<NewLote, "tipoVivienda" | "grupo" | "nivel">, poligono: Punto[]): boolean {
  if (vivienda.tipoVivienda !== "apartamento") return true;
  const torre = state.torres.find((t) => claveGrupo(t.grupo) === claveGrupo(vivienda.grupo));
  return !!torre && poligonoDentroPoligono(poligono, perimetroNivel(torre, vivienda.nivel ?? 1));
}

function clearTorreEdit(): void {
  editingFloorPerimeter = null;
  drawingFloorPerimeter = null;
  state.editingTorre = false;
  state.torreFormDirty = false;
  state.torreOriginal = null;
  state.selectedTorreVertex = null;
  state.draggingTorreVertex = null;
  state.torreDraft = null;
}

async function editarEdificio(): Promise<void> {
  if (!state.torre || state.syncing || !(await confirmDiscard())) return;
  state.torreOriginal = structuredClone(state.torre);
  state.editingTorre = true;
  state.torreFormDirty = false;
  state.torreImagenNivel = state.nivelActivo;
  state.torreDraft = null;
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.editSnapshot = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.mode = "lotes";
  resetPendingImages();
  clearFormDraft();
  render();
}

async function cambiarNivel(nivel: number): Promise<void> {
  if (!state.torre || state.editingTorre || state.syncing || !(await confirmDiscard())) return;
  state.nivelActivo = nivel;
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.currentPolygon = [];
  state.pendingNewLote = null;
  state.editSnapshot = null;
  resetPendingImages();
  clearFormDraft();
  state.mode = "lotes";
  render();
}

function updateTorrePolygon(candidate: Punto[]): boolean {
  if (!state.torre || !state.editingTorre) return false;
  const effective = torreEditada();
  const updated = editingFloorPerimeter === null ? { ...effective, poligono: candidate } : { ...effective, perimetrosNivel: { ...effective.perimetrosNivel, [String(editingFloorPerimeter)]: candidate } };
  const error = validarCambioTorre(updated, state.lotes.filter((l) => l.torreId === state.torre!.id));
  if (error) {
    if (drawingFloorPerimeter !== null) state.drawError = error;
    else showFormError(error);
    return false;
  }
  if (editingFloorPerimeter === null) state.torre.poligono = candidate;
  else state.torreDraft!.perimetrosNivel = updated.perimetrosNivel;
  state.torreFormDirty = true;
  updateDirtyIndicator();
  return true;
}

async function eliminarEdificio(): Promise<void> {
  const torre = state.torre;
  if (!torre || state.syncing) return;
  const apartamentos = state.lotes.filter((l) => l.torreId === torre.id);
  const action = await showModal({
    title: "Eliminar edificio y apartamentos",
    message: `Se eliminará ${escapeHtml(nombreEdificio(torre))} y sus ${apartamentos.length} apartamentos, incluidas sus galerías y todas las plantas. Los cambios se aplicarán al guardar el borrador y publicar. ¿Continuar?`,
    defaultAction: "cancel",
    buttons: [{ label: "Cancelar", value: "cancel", className: "btn-secondary" }, { label: "Eliminar todo", value: "confirm", className: "btn-danger" }],
  });
  if (action !== "confirm") return;
  // Preserve pending gallery resources so undo can restore the entire building.
  state.lotes = state.lotes.filter((l) => l.torreId !== torre.id);
  state.torres = state.torres.filter((t) => t.id !== torre.id);
  state.torre = null;
  clearTorreEdit();
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.mode = "lotes";
  resetPendingImages();
  clearFormDraft();
  commitHistory(`Eliminar ${nombreEdificio(torre)} y apartamentos`);
  render();
}

function copyLote(): void {
  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
  if (!lote) return;
  state.clipboard = captureSnapshot(lote);
  renderPasteButton();
  showFormSuccess("Vivienda copiada. Pega con Ctrl+V o el botón Pegar.");
}

function numeroEnUso(modeloId: number | null, numeroLote: string, grupo: GrupoViviendas | null, tipoVivienda: NewLote["tipoVivienda"], nivel: number | null): boolean {
  return state.lotes.some(
    (l) => mismaUbicacion(l, { grupo, tipoVivienda, nivel }) && (grupo !== null || (l.modeloId ?? null) === modeloId) && l.numeroLote === numeroLote,
  );
}

function nextNumeroLote(base: string, modeloId: number | null, grupo: GrupoViviendas | null, tipoVivienda: NewLote["tipoVivienda"], nivel: number | null): string {
  const parsed = Number.parseInt(base, 10);
  if (Number.isNaN(parsed)) {
    let candidate = `${base} copia`;
    let i = 2;
    while (numeroEnUso(modeloId, candidate, grupo, tipoVivienda, nivel)) candidate = `${base} copia ${i++}`;
    return candidate;
  }
  let n = parsed + 1;
  while (numeroEnUso(modeloId, String(n), grupo, tipoVivienda, nivel)) n++;
  return String(n);
}

async function pasteLote(): Promise<void> {
  const clip = state.clipboard;
  if (!clip) return;
  if (state.torre && (clip.tipoVivienda !== "apartamento" || claveGrupo(clip.grupo) !== claveGrupo(state.torre.grupo))) return;
  if (!state.torre && clip.tipoVivienda === "apartamento") return;
  if (!(await confirmDiscard())) return;

  const nivel = clip.tipoVivienda === "apartamento" ? state.nivelActivo : null;
  const numero = nextNumeroLote(clip.numeroLote, clip.modeloId, clip.grupo, clip.tipoVivienda, nivel);
  const lote: LoteConModelo = {
    plantaArquitectonicaPath: clip.plantaArquitectonicaPath,
    torreId: state.torre?.id ?? null,
    tipoVivienda: clip.tipoVivienda,
    nivel,
    nombreNivel: clip.nombreNivel,
    grupo: structuredClone(clip.grupo),
    id: genTempId(),
    numeroLote: numero,
    estado: clip.estado,
    poligono: clip.polygon.map((p) => ({ x: p.x + PASTE_OFFSET, y: p.y + PASTE_OFFSET })),
    modeloId: clip.modeloId,
    terrenoM2: clip.terrenoM2,
    dimensionesLote: clip.dimensionesLote,
    modelo: modeloById(clip.modeloId),
    imagenes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!geometriaPermitida(lote, lote.poligono)) { showFormError("No se puede pegar el apartamento fuera del perímetro del edificio"); return; }

  state.lotes.push(lote);
  state.selectedLoteId = lote.id;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  resetPendingImages();
  clearFormDraft();
  state.editSnapshot = captureSnapshot(lote);
  commitHistory(`Pegar ${lote.tipoVivienda} ${numero} · ${nombreGrupo(lote.grupo)}`);
  render();
  showFormSuccess("Vivienda pegada. No olvides publicar.");
}

function renderPasteButton(): void {
  const group = document.getElementById("paste-group");
  const clip = state.clipboard;
  if (group) group.hidden = !clip || (state.torre ? clip.tipoVivienda !== "apartamento" || claveGrupo(clip.grupo) !== claveGrupo(state.torre.grupo) : clip.tipoVivienda !== "casa");
  const button = document.getElementById("paste-lote");
  if (button) button.textContent = state.torre ? "Pegar apartamento" : "Pegar casa";
}

function render(): void {
  renderViewTransform();
  updateCursor();
  renderLotsLayer();
  renderBuildingsLayer();
  renderPuntosLayer();
  renderOverlayLayer();
  renderSidePanel();
  renderModeButtons();
  renderMapOpacity();
  renderPasteButton();
  renderViewControl();
}

// ============ Mode & selection ============

function hasUnsavedChanges(): boolean {
  return (
    state.torreFormDirty ||
    state.pendingNuevaTorre !== null ||
    state.formDirty ||
    state.pendingImageAdds.length > 0 ||
    state.pendingImageRemoves.length > 0
  );
}

type ModalButton = { label: string; value: string; className: string };

let activeModal: HTMLElement | null = null;

function showModal(opts: {
  title: string;
  message: string;
  buttons: ModalButton[];
  defaultAction?: string;
}): Promise<string> {
  if (activeModal !== null) return Promise.resolve("cancel");
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">${opts.title}</h3>
        <p class="confirm-text">${opts.message}</p>
        <div class="confirm-actions">
          ${opts.buttons
            .map(
              (b) =>
                `<button type="button" class="${b.className}" data-confirm="${b.value}">${b.label}</button>`,
            )
            .join("")}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    void setPopupOpen(overlay, true);
    activeModal = overlay;
    (document.activeElement as HTMLElement | null)?.blur();

    const cleanup = (value: string): void => {
      if (overlay.inert) return;
      void removePopup(overlay).then(() => {
        activeModal = null;
        resolve(value);
      });
    };
    opts.buttons.forEach((b) => {
      overlay
        .querySelector<HTMLElement>(`[data-confirm='${b.value}']`)
        ?.addEventListener("click", () => cleanup(b.value));
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup("cancel");
    });
    overlay.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const buttons = Array.from(
        overlay.querySelectorAll<HTMLElement>("[data-confirm]"),
      );
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    });

    const defaultValue = opts.defaultAction ?? opts.buttons[0]?.value;
    if (defaultValue !== undefined) {
      overlay
        .querySelector<HTMLButtonElement>(`[data-confirm='${defaultValue}']`)
        ?.focus();
    }
  });
}

type UploadImage = { url: string; key: string; createdAt: number; size: number };

/**
 * Abre la biblioteca de imágenes de R2. Permite seleccionar varias ya
 * subidas, o subir una nueva. Devuelve las URLs seleccionadas.
 */
function openImagePicker(opts: {
  limit: number;
  existing: string[];
}): Promise<string[]> {
  if (activeModal !== null) return Promise.resolve([]);
  return new Promise((resolve) => {
    const selected = new Set<string>();
    const existingSet = new Set(opts.existing);
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="img-picker" role="dialog" aria-modal="true" aria-labelledby="img-picker-title">
        <div class="img-picker-head">
          <div>
            <h3 id="img-picker-title">Biblioteca de imágenes</h3>
            <p class="img-picker-sub">Selecciona imágenes ya subidas o sube una nueva.</p>
          </div>
          <label class="btn-secondary img-picker-upload" title="Subir una imagen nueva">
            Subir imagen
            <input type="file" id="img-picker-input" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
          </label>
        </div>
        <div class="img-picker-body" id="img-picker-body">Cargando…</div>
        <p class="img-picker-alert" id="img-picker-alert" hidden></p>
        <div class="img-picker-foot">
          <span class="img-picker-count" id="img-picker-count"></span>
          <div class="img-picker-actions">
            <button type="button" class="btn-secondary" data-picker-cancel>Cancelar</button>
            <button type="button" class="btn-primary" id="img-picker-confirm" disabled>Adjuntar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    void setPopupOpen(overlay, true);
    activeModal = overlay;
    (document.activeElement as HTMLElement | null)?.blur();

    const body = overlay.querySelector<HTMLElement>("#img-picker-body")!;
    const countEl = overlay.querySelector<HTMLElement>("#img-picker-count")!;
    const confirmBtn = overlay.querySelector<HTMLButtonElement>("#img-picker-confirm")!;
    const uploadInput = overlay.querySelector<HTMLInputElement>("#img-picker-input")!;

    let items: UploadImage[] = [];

    const cleanup = (value: string[]): void => {
      if (overlay.inert) return;
      if (alertTimer !== undefined) window.clearTimeout(alertTimer);
      void removePopup(overlay).then(() => {
        activeModal = null;
        resolve(value);
      });
    };

    const updateCount = (): void => {
      const n = selected.size;
      countEl.textContent = `${n} seleccionada${n === 1 ? "" : "s"} · máximo ${opts.limit}`;
      confirmBtn.disabled = n === 0;
    };

    const renderSelection = (): void => {
      body.querySelectorAll<HTMLElement>("[data-picker-url]").forEach((el) => {
        el.classList.toggle("selected", selected.has(el.dataset.pickerUrl ?? ""));
      });
    };

    const renderGrid = (): void => {
      if (items.length === 0) {
        body.innerHTML = `<p class="lote-vacio">Todavía no hay imágenes subidas. Usa “Subir imagen” para agregar la primera.</p>`;
        return;
      }
      body.innerHTML = `<div class="img-picker-grid">${items
        .map((it) => {
          const url = escapeHtml(it.url);
          const isExisting = existingSet.has(it.url);
          return `<div class="img-picker-tile">
            <button type="button" class="img-picker-item${isExisting ? " is-existing" : ""}${
              selected.has(it.url) ? " selected" : ""
            }" data-picker-url="${url}" ${isExisting ? 'title="Ya agregada"' : 'title="Seleccionar"'}>
              <img src="${url}" alt="" loading="lazy" />
              <span class="img-picker-check" aria-hidden="true">✓</span>
              ${isExisting ? `<span class="img-picker-badge">Agregada</span>` : ""}
            </button>
            ${
              isExisting
                ? ""
                : `<button type="button" class="img-picker-del" data-picker-del="${url}" title="Eliminar de R2" aria-label="Eliminar imagen de R2">${ICON_TRASH}</button>`
            }
          </div>`;
        })
        .join("")}</div>`;
      body.querySelectorAll<HTMLElement>("[data-picker-url]").forEach((el) => {
        el.addEventListener("click", () => toggle(el.dataset.pickerUrl ?? ""));
      });
      body.querySelectorAll<HTMLElement>("[data-picker-del]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const url = el.dataset.pickerDel ?? "";
          void confirmDeleteFromLibrary().then((ok) => {
            if (ok) void removeFromLibrary(url);
          });
        });
      });
    };

    let alertTimer: number | undefined;
    const showError = (err: unknown): void => {
      const el = overlay.querySelector<HTMLElement>("#img-picker-alert");
      if (!el) return;
      if (alertTimer !== undefined) window.clearTimeout(alertTimer);
      el.textContent = err instanceof Error ? err.message : String(err);
      el.hidden = false;
      alertTimer = window.setTimeout(() => {
        el.hidden = true;
      }, 4000);
    };

    const confirmDeleteFromLibrary = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const dialog = document.createElement("div");
        dialog.className = "img-picker-confirm-overlay";
        dialog.innerHTML = `
          <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="img-picker-del-title">
            <h3 id="img-picker-del-title">Eliminar imagen</h3>
            <p class="confirm-text">¿Eliminar esta imagen de R2? Esta acción no se puede deshacer.</p>
            <div class="confirm-actions">
              <button type="button" class="btn-secondary" data-del-cancel>Cancelar</button>
              <button type="button" class="btn-danger" data-del-confirm>Eliminar</button>
            </div>
          </div>`;
        overlay.appendChild(dialog);
        void setPopupOpen(dialog, true);
        const done = (value: boolean): void => {
          if (dialog.inert) return;
          void removePopup(dialog).then(() => resolve(value));
        };
        dialog
          .querySelector("[data-del-cancel]")
          ?.addEventListener("click", () => done(false));
        dialog
          .querySelector("[data-del-confirm]")
          ?.addEventListener("click", () => done(true));
        dialog.addEventListener("click", (e) => {
          if (e.target === dialog) done(false);
        });
        dialog.querySelector<HTMLButtonElement>("[data-del-cancel]")?.focus();
      });
    };

    const removeFromLibrary = async (url: string): Promise<void> => {
      try {
        const res = await fetch("/api/admin/imagenes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: url }),
        });
        const r = (await res.json()) as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Error al eliminar la imagen");
        items = items.filter((it) => it.url !== url);
        selected.delete(url);
        existingSet.delete(url);
        renderGrid();
        updateCount();
      } catch (err) {
        showError(err);
      }
    };

    const toggle = (path: string): void => {
      if (existingSet.has(path)) return;
      if (selected.has(path)) {
        selected.delete(path);
      } else {
        if (selected.size >= opts.limit) return;
        selected.add(path);
      }
      renderSelection();
      updateCount();
    };

    const load = async (): Promise<void> => {
      try {
        const res = await fetch("/api/admin/imagenes");
        const r = (await res.json()) as {
          ok: boolean;
          data?: { imagenes: UploadImage[] };
          error?: string;
        };
        if (!r.ok || !r.data) throw new Error(r.error ?? "Error al cargar las imágenes");
        items = r.data.imagenes;
        renderGrid();
      } catch (err) {
        body.innerHTML = `<p class="form-error">${escapeHtml(
          err instanceof Error ? err.message : String(err),
        )}</p>`;
      }
    };

    uploadInput.addEventListener("change", () => {
      const file = uploadInput.files?.[0];
      uploadInput.value = "";
      if (!file) return;
      void (async () => {
        const fd = new FormData();
        fd.append("imagen", file);
        try {
          const res = await fetch("/api/admin/imagenes", { method: "POST", body: fd });
          const r = (await res.json()) as {
            ok: boolean;
            data?: { path: string };
            error?: string;
          };
          if (!r.ok || !r.data) throw new Error(r.error ?? "Error al subir la imagen");
          const path = r.data.path;
          items = [
            { url: path, key: "", createdAt: Date.now(), size: file.size },
            ...items,
          ];
          if (selected.size < opts.limit) selected.add(path);
          renderGrid();
          renderSelection();
          updateCount();
        } catch (err) {
          showError(err);
        }
      })();
    });

    overlay.querySelector("[data-picker-cancel]")?.addEventListener("click", () => cleanup([]));
    confirmBtn.addEventListener("click", () => cleanup([...selected]));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup([]);
    });

    updateCount();
    void load();
  });
}

function discardChanges(): void {
  if (state.editingTorre && state.torreOriginal) {
    const restored = structuredClone(state.torreOriginal);
    state.torres[state.torres.findIndex((t) => t.id === restored.id)] = restored;
    state.torre = restored;
    clearTorreEdit();
  }
  if (state.pendingNuevaTorre) {
    state.pendingNuevaTorre = null;
    state.torreDraft = null;
    state.dibujandoTorre = false;
  }
  if (state.selectedLoteId !== null && state.editSnapshot) {
    const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
    if (lote) {
      lote.numeroLote = state.editSnapshot.numeroLote;
      lote.grupo = structuredClone(state.editSnapshot.grupo);
      lote.torreId = lote.tipoVivienda === "apartamento" ? state.torres.find((t) => claveGrupo(t.grupo) === claveGrupo(lote.grupo))?.id ?? null : null;
      lote.tipoVivienda = state.editSnapshot.tipoVivienda;
      lote.nivel = state.editSnapshot.nivel;
      lote.nombreNivel = state.editSnapshot.nombreNivel;
      lote.estado = state.editSnapshot.estado;
      lote.modeloId = state.editSnapshot.modeloId;
      lote.modelo =
        state.editSnapshot.modeloId !== null
          ? (state.modelos.find((m) => m.id === state.editSnapshot!.modeloId) ?? null)
          : null;
      lote.terrenoM2 = state.editSnapshot.terrenoM2;
      lote.dimensionesLote = state.editSnapshot.dimensionesLote;
      lote.plantaArquitectonicaPath = state.editSnapshot.plantaArquitectonicaPath;
    }
  }
  resetPendingImages();
  clearFormDraft();
  state.editSnapshot = null;
}

async function confirmDiscard(): Promise<boolean> {
  if (!hasUnsavedChanges()) return true;
  const numero = currentEditingLabel();
  const action = await showModal({
    title: "Cambios sin guardar",
    message: numero
      ? `La vivienda ${escapeHtml(numero)} tiene cambios sin guardar. ¿Qué deseas hacer?`
      : "Hay cambios sin guardar. ¿Qué deseas hacer?",
    defaultAction: "save",
    buttons: [
      { label: "Guardar cambios", value: "save", className: "btn-primary" },
      { label: "Continuar editando", value: "cancel", className: "btn-secondary" },
      { label: "Descartar cambios", value: "discard", className: "btn-danger" },
    ],
  });
  if (action === "discard") {
    discardChanges();
    return true;
  }
  if (action === "save") {
    return saveLote();
  }
  return false;
}

async function confirmDeleteLote(): Promise<boolean> {
  const numero = currentEditingLabel();
  const action = await showModal({
    title: "Eliminar vivienda",
    message: numero
      ? `¿Eliminar la vivienda ${escapeHtml(numero)}?`
      : "¿Eliminar esta vivienda?",
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Eliminar vivienda", value: "confirm", className: "btn-danger" },
    ],
  });
  return action === "confirm";
}

function currentEditingLabel(): string | null {
  const input = document.getElementById("numeroLote") as HTMLInputElement | null;
  const fromForm = input?.value.trim() ?? "";
  if (fromForm) return fromForm;
  const fromDraft = state.draft?.numeroLote.trim() ?? "";
  if (fromDraft) return fromDraft;
  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
  const fromLote = lote?.numeroLote.trim() ?? "";
  return fromLote || null;
}

async function setMode(mode: Mode): Promise<void> {
  if (state.torre && mode === "punto") return;
  if (mode === state.mode) return;
  if (!(await confirmDiscard())) return;
  clearTorreEdit();
  if (state.torre && mode === "punto") return;
  state.dibujandoTorre = false;
  state.pendingNuevaTorre = null;
  state.torreDraft = null;
  state.drawError = "";
  state.mode = mode;
  state.currentPolygon = [];
  state.pendingNewLote = null;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.selectedPuntoId = null;
  state.nuevoPuntoPos = null;
  resetPendingImages();
  clearFormDraft();
  if (mode !== "lotes") {
    state.selectedLoteId = null;
  }
  render();
}

async function selectLote(id: number | null): Promise<void> {
  const target = state.lotes.find((l) => l.id === id);
  if (state.torre && target && (target.tipoVivienda !== "apartamento" || claveGrupo(target.grupo) !== claveGrupo(state.torre.grupo))) return;
  if (id === state.selectedLoteId) return;
  if (!(await confirmDiscard())) return;
  clearTorreEdit();
  state.selectedLoteId = id;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.selectedPuntoId = null;
  state.nuevoPuntoPos = null;
  resetPendingImages();
  clearFormDraft();
  const lote = id !== null ? state.lotes.find((l) => l.id === id) : undefined;
  state.mode = "lotes";
  if (lote) activarContextoLote(lote);
  state.editSnapshot = lote ? captureSnapshot(lote) : null;
  render();
}

function closePolygon(): void {
  if (state.currentPolygon.length < 3) return;
  if ((state.dibujandoTorre || state.torre) && !poligonoSimple(state.currentPolygon)) {
    state.drawError = "El polígono debe tener área y no cruzarse a sí mismo";
    renderSidePanel();
    return;
  }
  if (drawingFloorPerimeter !== null) {
    const nivel = drawingFloorPerimeter;
    editingFloorPerimeter = nivel;
    if (!updateTorrePolygon(structuredClone(state.currentPolygon))) {
      state.drawError = "El perímetro debe ser válido y contener los apartamentos de este nivel";
      renderSidePanel();
      return;
    }
    drawingFloorPerimeter = null;
    state.currentPolygon = [];
    state.drawError = "";
    state.mode = "lotes";
    render();
    return;
  }
  if (state.dibujandoTorre) {
    state.pendingNuevaTorre = { grupo: siguienteGrupoTorre(), nombreNivel: initialData.alturaDefaults.nombreNivel, nombrePersonalizado: null, cantidadNiveles: 1, imagenesNivel: {}, perimetrosNivel: {}, poligono: structuredClone(state.currentPolygon) };
    state.currentPolygon = [];
    state.torreDraft = null;
    render();
    updateDirtyIndicator();
    return;
  }
  if (state.torre && !poligonoDentroPoligono(state.currentPolygon, perimetroNivel(state.torre, state.nivelActivo))) {
    state.drawError = "El apartamento debe quedar completamente dentro del perímetro del edificio";
    renderSidePanel();
    return;
  }
  state.pendingNewLote = {
    tipoVivienda: state.torre ? "apartamento" : "casa",
    nivel: state.torre ? state.nivelActivo : null,
    nombreNivel: state.torre?.nombreNivel ?? "Planta",
    grupo: state.torre ? structuredClone(state.torre.grupo) : null,
    numeroLote: "",
    estado: "disponible",
    poligono: [...state.currentPolygon],
    modeloId: null,
    terrenoM2: null,
    dimensionesLote: null,
    plantaArquitectonicaPath: null,
  };
  state.currentPolygon = [];
  resetPendingImages();
  clearFormDraft();
  render();
}

function cancelDraw(): void {
  if (drawingFloorPerimeter !== null) {
    drawingFloorPerimeter = null;
    state.currentPolygon = [];
    state.drawError = "";
    state.mode = "lotes";
    render();
    return;
  }
  clearTorreEdit();
  state.dibujandoTorre = false;
  state.pendingNuevaTorre = null;
  state.torreDraft = null;
  state.drawError = "";
  clearFormDraft();
  resetPendingImages();
  state.currentPolygon = [];
  state.pendingNewLote = null;
  state.mode = "lotes";
  render();
  updateDirtyIndicator();
}

function activarContextoLote(lote: LoteConModelo): void {
  state.torre = lote.tipoVivienda === "apartamento" && lote.grupo
    ? state.torres.find((t) => claveGrupo(t.grupo) === claveGrupo(lote.grupo)) ?? null
    : null;
  state.nivelActivo = lote.nivel ?? 1;
}

function siguienteGrupoTorre(): GrupoViviendas {
  const defaults = initialData.alturaDefaults;
  const letras = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  const letra = (n: number): string => n < letras.length ? letras[n] : letra(Math.floor(n / letras.length) - 1) + letras[n % letras.length];
  let index = 0;
  let grupo: GrupoViviendas;
  do {
    grupo = { nombre: defaults.nombre, tipoIdentificador: defaults.tipoIdentificador, identificador: defaults.tipoIdentificador === "numerico" ? String(index + 1) : letra(index) };
    index++;
  } while (state.torres.some((t) => claveGrupo(t.grupo) === claveGrupo(grupo)));
  return grupo;
}

async function crearApartamento(): Promise<void> {
  if (state.syncing) return;
  closeAllDropdowns();
  if (!(await confirmDiscard())) return;
  clearTorreEdit();
  state.mode = "draw";
  state.dibujandoTorre = state.torre === null;
  state.currentPolygon = [];
  state.pendingNewLote = null;
  state.pendingNuevaTorre = null;
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.draggingVertex = null;
  state.draggingPolygon = null;
  state.editSnapshot = null;
  resetPendingImages();
  clearFormDraft();
  state.drawError = "";
  render();
}

async function entrarTorre(id: number, editar = false): Promise<void> {
  const torre = state.torres.find((t) => t.id === id);
  if (!torre || (state.torre && state.torre.id !== id)) return;
  if (!(await confirmDiscard())) return;
  clearTorreEdit();
  state.torre = state.torres.find((t) => t.id === id)!;
  state.nivelActivo = 1;
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.draggingVertex = null;
  state.draggingPolygon = null;
  state.selectedPuntoId = null;
  state.nuevoPuntoPos = null;
  state.pendingNewLote = null;
  state.pendingNuevaTorre = null;
  state.dibujandoTorre = false;
  state.torreDraft = null;
  state.currentPolygon = [];
  state.drawError = "";
  resetPendingImages();
  clearFormDraft();
  state.mode = "lotes";
  render();
  if (editar) await editarEdificio();
}

async function salirTorre(): Promise<void> {
  if (!(await confirmDiscard())) return;
  clearTorreEdit();
  state.torre = null;
  state.pendingNuevaTorre = null;
  state.dibujandoTorre = false;
  state.torreDraft = null;
  state.drawError = "";
  state.nivelActivo = 1;
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.draggingVertex = null;
  state.draggingPolygon = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.editSnapshot = null;
  resetPendingImages();
  clearFormDraft();
  state.mode = "lotes";
  render();
}

// ============ View transforms ============

function startPan(clientX: number, clientY: number): void {
  state.isPanning = true;
  state.panStart = {
    clientX,
    clientY,
    vbX: state.view.x,
    vbY: state.view.y,
  };
  svg.style.cursor = "grabbing";
}

function panTo(clientX: number, clientY: number): void {
  state.view = panView(state.view, state.panStart, svg, clientX, clientY);
  state.atDefaultView = false;
  renderViewTransform();
}

function zoomAtPoint(factor: number, clientX: number, clientY: number): void {
  state.view = zoomViewAt(
    state.view,
    factor,
    clientX,
    clientY,
    state.initialView,
    svg,
  );
  state.atDefaultView = false;
  renderViewTransform();
}

function zoomBy(factor: number): void {
  state.view = zoomViewBy(state.view, factor, state.initialView, svg);
  state.atDefaultView = false;
  renderViewTransform();
}

function defaultView(): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const rect = svg.getBoundingClientRect();
  return makeCoverView(state.initialView, { w: rect.width, h: rect.height });
}

function fitView(): void {
  state.view = defaultView();
  state.atDefaultView = true;
  renderViewTransform();
}

// ============ Event handlers ============

function handleSvgMouseDown(e: MouseEvent): void {
  state.panFromBackground = false;
  if (e.button === 1 || e.button === 2) {
    e.preventDefault();
    startPan(e.clientX, e.clientY);
    return;
  }
  if (e.button === 0 && e.shiftKey) {
    e.preventDefault();
    startPan(e.clientX, e.clientY);
    return;
  }
  if (e.button !== 0) return;

  if (drawingFloorPerimeter !== null) {
    state.currentPolygon.push(svgToPoint(svg, e.clientX, e.clientY));
    state.drawError = "";
    render();
    return;
  }

  if (state.mode === "lotes") {
    state.panFromBackground = true;
    startPan(e.clientX, e.clientY);
  } else if (state.mode === "draw") {
    if (state.pendingNewLote !== null || state.pendingNuevaTorre !== null) return;
    const p = svgToPoint(svg, e.clientX, e.clientY);
    const anterior = state.currentPolygon.at(-1);
    const boundary = state.torre ? perimetroNivel(state.torre, state.nivelActivo) : [];
    if (state.torre && (!puntoDentroPoligono(p, boundary) || (anterior && !segmentoDentroPoligono(anterior, p, boundary)))) {
      state.drawError = "Dibuja dentro del perímetro del edificio; no se permiten vértices ni lados fuera de él";
      renderSidePanel();
      return;
    }
    state.drawError = "";
    state.currentPolygon.push(p);
    render();
  } else if (state.mode === "punto") {
    state.nuevoPuntoPos = svgToPoint(svg, e.clientX, e.clientY);
    state.selectedPuntoId = null;
    state.selectedLoteId = null;
    state.mode = "lotes";
    state.puntoDraft = null;
    state.puntoDirty = false;
    render();
  }
}

function handleDocumentMouseMove(e: MouseEvent): void {
  if (state.isPanning) {
    panTo(e.clientX, e.clientY);
  } else if (state.draggingTorreVertex !== null && state.torre) {
    const p = svgToPoint(svg, e.clientX, e.clientY);
    const candidate = poligonoEnEdicion().map((pt, i) => i === state.draggingTorreVertex ? p : pt);
    if (updateTorrePolygon(candidate)) render();
  } else if (state.draggingVertex) {
    const p = svgToPoint(svg, e.clientX, e.clientY);
    const lote = state.lotes.find((l) => l.id === state.draggingVertex!.loteId);
    if (lote) {
      const candidate = lote.poligono.map((pt, i) => i === state.draggingVertex!.index ? p : pt);
      if (!geometriaPermitida(lote, candidate)) return;
      lote.poligono = candidate;
      state.dragMoved = true;
      render();
    }
  } else if (state.draggingPolygon) {
    const drag = state.draggingPolygon;
    const p = svgToPoint(svg, e.clientX, e.clientY);
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    const lote = state.lotes.find((l) => l.id === drag.loteId);
    if (lote) {
      const candidate = drag.original.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
      if (!geometriaPermitida(lote, candidate)) return;
      lote.poligono = candidate;
      state.dragMoved = true;
      render();
    }
  } else if (state.draggingPunto) {
    const drag = state.draggingPunto;
    const p = svgToPoint(svg, e.clientX, e.clientY);
    const punto = state.puntos.find((pt) => pt.id === drag.puntoId);
    if (punto) {
      punto.x = Math.round(p.x - drag.dx);
      punto.y = Math.round(p.y - drag.dy);
      state.dragMoved = true;
      render();
    }
  }
}

function handleDocumentMouseUp(e: MouseEvent): void {
  state.draggingTorreVertex = null;
  if (state.isPanning) {
    const moved = Math.hypot(
      e.clientX - state.panStart.clientX,
      e.clientY - state.panStart.clientY,
    );
    const wasBackgroundClick = state.panFromBackground;
    state.isPanning = false;
    state.panFromBackground = false;
    updateCursor();
    if (
      wasBackgroundClick &&
      moved <= CLICK_MOVE_THRESHOLD &&
      state.mode === "lotes"
    ) {
      if (state.selectedVertex !== null) {
        state.selectedVertex = null;
        render();
      } else if (state.selectedLoteId !== null) {
        void selectLote(null);
      } else if (state.selectedPuntoId !== null || state.nuevoPuntoPos !== null) {
        state.selectedPuntoId = null;
        state.nuevoPuntoPos = null;
        render();
      }
    }
  }
  if (state.draggingVertex) {
    const drag = state.draggingVertex;
    const moved = state.dragMoved;
    state.draggingVertex = null;
    state.dragMoved = false;
    if (moved) {
      const lote = state.lotes.find((l) => l.id === drag.loteId);
      if (lote) commitHistory(`Mover vértice de ${lote.tipoVivienda} ${lote.numeroLote}`, `vertex:${lote.id}`);
    }
  }
  if (state.draggingPolygon) {
    const drag = state.draggingPolygon;
    const moved = state.dragMoved;
    state.draggingPolygon = null;
    state.dragMoved = false;
    updateCursor();
    if (moved) {
      const lote = state.lotes.find((l) => l.id === drag.loteId);
      if (lote) commitHistory(`Mover ${lote.tipoVivienda} ${lote.numeroLote}`, `polygon:${lote.id}`);
    }
  }
  if (state.draggingPunto) {
    const drag = state.draggingPunto;
    const moved = state.dragMoved;
    state.draggingPunto = null;
    state.dragMoved = false;
    if (moved) {
      const punto = state.puntos.find((p) => p.id === drag.puntoId);
      if (punto) commitHistory(`Mover punto ${punto.nombre}`, `punto:${punto.id}`);
    }
  }
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.1;
  zoomAtPoint(factor, e.clientX, e.clientY);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (activeModal !== null || state.syncing) return;
  if (drawingFloorPerimeter !== null) {
    if (e.key === "Escape") { e.preventDefault(); cancelDraw(); }
    else if (e.key === "Enter") { e.preventDefault(); closePolygon(); }
    else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); state.currentPolygon.pop(); render(); }
    return;
  }

  // Escape cancels a new-lote or puncto creation even while typing in the form.
  if (e.key === "Escape" && state.pendingNuevaTorre) {
    cancelDraw();
    return;
  }
  if (e.key === "Escape" && (state.pendingNewLote !== null || state.mode === "punto")) {
    if (state.mode === "punto") {
      if (state.nuevoPuntoPos !== null) {
        state.nuevoPuntoPos = null;
      } else if (state.selectedPuntoId !== null) {
        state.selectedPuntoId = null;
      } else {
        state.mode = "lotes";
      }
    } else {
      clearFormDraft();
      resetPendingImages();
      state.pendingNewLote = null;
      state.currentPolygon = [];
      state.mode = "lotes";
    }
    render();
    return;
  }

  const target = e.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

  if (e.key === "Escape" && anyDropdownOpen()) {
    closeAllDropdowns();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const key = e.key.toLowerCase();
    if (key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (key === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (key === "c" && state.mode === "lotes" && state.selectedLoteId !== null) {
      e.preventDefault();
      copyLote();
      return;
    }
    if (key === "v" && state.clipboard !== null) {
      e.preventDefault();
      void pasteLote();
      return;
    }
  }

  if (state.editingTorre && state.torre) {
    const index = state.selectedTorreVertex;
    if (index !== null && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      if (updateTorrePolygon(poligonoEnEdicion().filter((_, i) => i !== index))) { state.selectedTorreVertex = null; render(); }
      return;
    }
    const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (index !== null && (dx || dy)) {
      e.preventDefault();
      const candidate = poligonoEnEdicion().map((p, i) => i === index ? { x: p.x + dx, y: p.y + dy } : p);
      if (updateTorrePolygon(candidate)) render();
    } else if (e.key === "Escape") void (async () => { if (await confirmDiscard()) { clearTorreEdit(); render(); } })();
    return;
  }

  if (e.key === "Escape") {
    if (state.currentPolygon.length > 0 || state.dibujandoTorre) {
      cancelDraw();
    } else if (state.selectedVertex !== null) {
      state.selectedVertex = null;
      render();
    } else if (state.selectedLoteId !== null) {
      void (async () => {
        if (await confirmDiscard()) {
          state.selectedLoteId = null;
          state.selectedVertex = null;
          state.draggingPolygon = null;
          render();
        }
      })();
    } else if (state.nuevoPuntoPos !== null || state.selectedPuntoId !== null) {
      state.nuevoPuntoPos = null;
      state.selectedPuntoId = null;
      render();
    } else {
      render();
    }
  } else if ((e.key === "Delete" || e.key === "Backspace") && state.selectedLoteId !== null && state.mode === "lotes") {
    void (async () => {
      if (await confirmDeleteLote()) void deleteLote();
    })();
  } else if (
    state.mode === "lotes" &&
    state.selectedLoteId !== null &&
    state.selectedVertex === null
  ) {
    const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
    if (lote) {
      const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      if (dx !== 0 || dy !== 0) {
        const candidate = lote.poligono.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        if (!geometriaPermitida(lote, candidate)) { e.preventDefault(); showFormError("No puedes mover el apartamento fuera del edificio"); return; }
        lote.poligono = candidate;
        commitHistory(`Mover ${lote.tipoVivienda} ${lote.numeroLote}`, `nudge:${lote.id}`);
        e.preventDefault();
        render();
      }
    }
  } else if (state.selectedVertex !== null && state.mode === "lotes") {
    const lote = state.lotes.find((l) => l.id === state.selectedVertex!.loteId);
    if (lote) {
      const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      if (dx !== 0 || dy !== 0) {
        const idx = state.selectedVertex!.index;
        const p = lote.poligono[idx];
        const candidate = lote.poligono.map((pt, i) => i === idx ? { x: p.x + dx, y: p.y + dy } : pt);
        if (!geometriaPermitida(lote, candidate)) { e.preventDefault(); showFormError("No puedes mover el vértice fuera del edificio"); return; }
        lote.poligono = candidate;
        commitHistory(`Mover vértice de ${lote.tipoVivienda} ${lote.numeroLote}`, `nudge-vertex:${lote.id}`);
        e.preventDefault();
        render();
      }
    }
  } else if (state.selectedPuntoId !== null) {
    if (state.torre) return;
    const punto = state.puntos.find((p) => p.id === state.selectedPuntoId);
    if (punto) {
      const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      if (dx !== 0 || dy !== 0) {
        punto.x += dx;
        punto.y += dy;
        commitHistory(`Mover punto ${punto.nombre}`, `nudge-punto:${punto.id}`);
        e.preventDefault();
        render();
      }
    }
  }
}

// ============ API actions ============

function getFormData(): {
  plantaArquitectonicaPath: string | null;
  tipoVivienda: NewLote["tipoVivienda"];
  nivel: number | null;
  nombreNivel: NewLote["nombreNivel"];
  grupo: GrupoViviendas | null;
  numeroLote: string;
  estado: LoteEstado;
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
} | null {
  const numeroLoteEl = document.getElementById("numeroLote") as HTMLInputElement | null;
  const estadoEl = document.getElementById("estado") as HTMLSelectElement | null;
  const modeloEl = document.getElementById("modeloId") as HTMLSelectElement | null;
  const terrenoEl = document.getElementById("terrenoM2") as HTMLInputElement | null;
  const dimEl = document.getElementById("dimensionesLote") as HTMLInputElement | null;
  if (!numeroLoteEl || !estadoEl || !modeloEl || !terrenoEl || !dimEl) return null;

  const numeroLote = numeroLoteEl.value.trim();
  if (!numeroLote) {
    showFormError("El número de vivienda es obligatorio");
    return null;
  }

  const estado = estadoEl.value as LoteEstado;
  const modeloId = modeloEl.value ? Number(modeloEl.value) : null;
  const terrenoRaw = terrenoEl.value.trim();
  const terrenoM2 = terrenoRaw ? Number(terrenoRaw) : null;
  if (terrenoM2 !== null && (!Number.isFinite(terrenoM2) || terrenoM2 < 0)) {
    showFormError("Terreno inválido");
    return null;
  }
  const dimensionesLote = dimEl.value.trim() || null;
  const seleccion = (document.getElementById("grupoSeleccion") as HTMLSelectElement).value;
  const vivienda = state.pendingNewLote ?? state.lotes.find((l) => l.id === state.selectedLoteId);
  if (!vivienda) return null;
  const tipoVivienda = vivienda.tipoVivienda;
  const nivel = tipoVivienda === "apartamento" ? Number((document.getElementById("nivel") as HTMLInputElement).value) : null;
  const nombreNivel = vivienda.nombreNivel;
  let grupo: GrupoViviendas | null = null;
  if (seleccion === "nuevo") {
    const result = (tipoVivienda === "apartamento" ? torreSchema : grupoViviendasSchema).safeParse({
      nombre: (document.getElementById("grupoNombre") as HTMLInputElement | HTMLSelectElement).value,
      tipoIdentificador: (document.getElementById("grupoTipo") as HTMLSelectElement).value,
      identificador: (document.getElementById("grupoIdentificador") as HTMLInputElement).value,
    });
    if (!result.success) {
      showFormError(result.error.issues[0]?.message ?? "Grupo inválido");
      return null;
    }
    grupo = result.data;
  } else if (seleccion) {
    grupo = structuredClone(tipoVivienda === "apartamento" ? state.torres.find((t) => claveGrupo(t.grupo) === seleccion)?.grupo ?? null : state.lotes.find((l) => l.tipoVivienda === tipoVivienda && claveGrupo(l.grupo) === seleccion)?.grupo ?? null);
    if (!grupo) { showFormError("El grupo seleccionado ya no existe"); return null; }
  }

  const ubicacionError = validarUbicacion({ tipoVivienda, grupo, nivel });
  if (ubicacionError) { showFormError(ubicacionError); return null; }
  const modelo = modeloById(modeloId);
  if (modeloId !== null && modelo?.tipo !== tipoVivienda) { showFormError("El modelo debe corresponder al tipo de vivienda"); return null; }
  const nivelExistente = tipoVivienda === "apartamento" ? state.torres.find((t) => claveGrupo(t.grupo) === claveGrupo(grupo)) : undefined;
  if (nivelExistente && nivel! > nivelExistente.cantidadNiveles) { showFormError("El nivel supera la cantidad de niveles del edificio"); return null; }
  return { numeroLote, estado, modeloId, terrenoM2: tipoVivienda === "casa" ? terrenoM2 : null, dimensionesLote: tipoVivienda === "casa" ? dimensionesLote : null, plantaArquitectonicaPath: (document.getElementById("planta-arquitectonica-path") as HTMLInputElement).value || null, grupo, tipoVivienda, nivel, nombreNivel: nivelExistente?.nombreNivel ?? nombreNivel };
}

function showFormError(msg: string): void {
  const el = document.getElementById("form-error");
  if (el) {
    el.textContent = msg;
    el.hidden = false;
  } else {
    alert(msg);
  }
}

function clearFormError(): void {
  const el = document.getElementById("form-error");
  if (el) {
    el.textContent = "";
    el.hidden = true;
  }
}

let successTimer: number | undefined;

function showFormSuccess(msg: string): void {
  clearFormSuccess();
  const el = document.getElementById("form-success");
  if (el) {
    el.textContent = msg;
    el.hidden = false;
    successTimer = window.setTimeout(() => {
      el.hidden = true;
    }, 2500);
  }
}

function clearFormSuccess(): void {
  if (successTimer !== undefined) {
    window.clearTimeout(successTimer);
    successTimer = undefined;
  }
  const el = document.getElementById("form-success");
  if (el) {
    el.textContent = "";
    el.hidden = true;
  }
}

function consumePendingImages(lote: LoteConModelo): void {
  if (state.pendingImageRemoves.length > 0) {
    const removes = new Set(state.pendingImageRemoves);
    for (const id of removes) {
      if (id < 0) {
        const img = lote.imagenes.find((i) => i.id === id);
        state.pendingImageFiles.delete(id);
        state.pendingImagePaths.delete(id);
        if (img?.path.startsWith("blob:")) URL.revokeObjectURL(img.path);
      }
    }
    lote.imagenes = lote.imagenes.filter((img) => !removes.has(img.id));
  }
  for (const p of state.pendingImageAdds) {
    const id = genTempId();
    lote.imagenes.push({ id, path: p.url });
    if (p.file) state.pendingImageFiles.set(id, p.file);
    else if (p.path) state.pendingImagePaths.set(id, p.path);
  }
  state.pendingImageAdds = [];
  state.pendingImageRemoves = [];
}

function modeloById(id: number | null): LoteConModelo["modelo"] {
  if (id === null) return null;
  return state.modelos.find((m) => m.id === id) ?? null;
}

function saveLote(): boolean {
  if (state.pendingNuevaTorre || state.editingTorre) return saveTorre();
  clearFormError();
  const data = getFormData();
  if (!data) return false;

  const isNew = state.pendingNewLote !== null;
  const current = isNew ? null : state.lotes.find((l) => l.id === state.selectedLoteId);
  const poligono = isNew ? state.pendingNewLote!.poligono : (current?.poligono ?? []);

  if (poligono.length < 3) {
    showFormError("El polígono debe tener al menos 3 puntos");
    return false;
  }
  if (!geometriaPermitida(data, poligono)) { showFormError("El apartamento debe quedar completamente dentro del perímetro del edificio"); return false; }

  const modeloId = data.modeloId ?? null;
  const duplicate = state.lotes.find(
    (l) =>
      l.id !== state.selectedLoteId &&
      mismaUbicacion(l, data) &&
      (data.grupo !== null || (l.modeloId ?? null) === modeloId) &&
      l.numeroLote === data.numeroLote,
  );
  if (duplicate) {
    showFormError(data.tipoVivienda === "apartamento" ? `El apartamento ${data.numeroLote} ya existe en ${nombreGrupo(data.grupo)} · ${data.nombreNivel} ${data.nivel}` : `El número de casa ${data.numeroLote} ya existe en este grupo o modelo sin grupo`);
    return false;
  }

  if (isNew) {
    const lote: LoteConModelo = {
      torreId: data.tipoVivienda === "apartamento" ? state.torres.find((t) => claveGrupo(t.grupo) === claveGrupo(data.grupo))?.id ?? null : null,
      tipoVivienda: data.tipoVivienda,
      nivel: data.nivel,
      nombreNivel: data.nombreNivel,
      grupo: data.grupo,
      id: genTempId(),
      numeroLote: data.numeroLote,
      estado: data.estado,
      poligono: poligono.map((p) => ({ ...p })),
      modeloId,
      terrenoM2: data.terrenoM2,
      dimensionesLote: data.dimensionesLote,
      plantaArquitectonicaPath: data.plantaArquitectonicaPath,
      modelo: modeloById(modeloId),
      imagenes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    consumePendingImages(lote);
    state.lotes.push(lote);
    state.selectedLoteId = lote.id;
    state.pendingNewLote = null;
    state.mode = "lotes";
    activarContextoLote(lote);
    clearFormDraft();
    state.editSnapshot = captureSnapshot(lote);
    commitHistory(`Crear ${lote.tipoVivienda} ${lote.numeroLote} · ${nombreGrupo(lote.grupo)}`);
    render();
    showFormSuccess(`${lote.tipoVivienda === "apartamento" ? "Apartamento creado" : "Casa creada"}. No olvides publicar.`);
    return true;
  }

  if (!current) return false;

  current.numeroLote = data.numeroLote;
  current.grupo = data.grupo;
  current.torreId = data.tipoVivienda === "apartamento" ? state.torres.find((t) => claveGrupo(t.grupo) === claveGrupo(data.grupo))?.id ?? null : null;
  current.tipoVivienda = data.tipoVivienda;
  current.nivel = data.nivel;
  current.nombreNivel = data.nombreNivel;
  activarContextoLote(current);
  current.estado = data.estado;
  current.modeloId = modeloId;
  current.modelo = modeloById(modeloId);
  current.terrenoM2 = data.terrenoM2;
  current.dimensionesLote = data.dimensionesLote;
  current.plantaArquitectonicaPath = data.plantaArquitectonicaPath;
  current.poligono = poligono.map((p) => ({ ...p }));
  consumePendingImages(current);
  clearFormDraft();
  state.editSnapshot = captureSnapshot(current);
  commitHistory(`Editar ${current.tipoVivienda} ${current.numeroLote} · ${nombreGrupo(current.grupo)}`);
  render();
  showFormSuccess("Cambios aplicados. No olvides publicar.");
  return true;
}

function deleteLote(): void {
  if (state.selectedLoteId === null) return;
  const id = state.selectedLoteId;
  const lote = state.lotes.find((l) => l.id === id);
  if (lote) {
    for (const img of lote.imagenes) {
      if (img.id < 0) {
        state.pendingImageFiles.delete(img.id);
        state.pendingImagePaths.delete(img.id);
        if (img.path.startsWith("blob:")) URL.revokeObjectURL(img.path);
      }
    }
  }
  state.lotes = state.lotes.filter((l) => l.id !== id);
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.editSnapshot = null;
  resetPendingImages();
  clearFormDraft();
  commitHistory(`Eliminar ${lote?.tipoVivienda ?? "vivienda"} ${lote?.numeroLote ?? ""}`.trim());
  render();
}

function resetPendingImages(): void {
  for (const p of state.pendingImageAdds) {
    if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
  }
  state.pendingImageAdds = [];
  state.pendingImageRemoves = [];
  // No se limpian las rutas ya aplicadas (pendingImagePaths): igual que
  // pendingImageFiles, deben sobrevivir al cambio de lote para poder
  // adjuntarse al guardar el borrador.
}

async function uploadImage(loteId: number, file: File): Promise<LoteImagenItem> {
  const fd = new FormData();
  fd.append("imagen", file);
  const response = await fetch(`/api/admin/lotes/${loteId}/imagenes`, {
    method: "POST",
    body: fd,
  });
  const result = (await response.json()) as {
    ok: boolean;
    data?: { added: LoteImagenItem };
    error?: string;
  };
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Error al subir la imagen");
  }
  return result.data.added;
}

async function attachLoteImage(loteId: number, path: string): Promise<LoteImagenItem> {
  const response = await fetch(`/api/admin/lotes/${loteId}/imagenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: [path] }),
  });
  const result = (await response.json()) as {
    ok: boolean;
    data?: { added: LoteImagenItem[]; imagenes: LoteImagenItem[] };
    error?: string;
  };
  const added =
    result.data?.added?.[0] ??
    result.data?.imagenes?.find((img) => img.path === path);
  if (!result.ok || !added) {
    throw new Error(result.error ?? "Error al adjuntar la imagen");
  }
  return added;
}

async function guardarBorrador(): Promise<boolean> {
  if (state.syncing) return false;
  if (hasUnsavedChanges() && !saveLote()) return false;
  if (!documentDirty()) return true;
  state.syncing = true;
  state.busyLabel = "Guardando borrador…";
  clearFormError();
  updateDirtyIndicator();

  const loteIdMap = new Map<number, number>();
  const imgIdMap = new Map<number, LoteImagenItem>();
  const edificiosPendientes: Torre[] = [];

  try {
    const syncedById = new Map(state.synced.map((l) => [l.id, l]));
    const currentById = new Map(state.lotes.map((l) => [l.id, l]));
    const torresEliminadas = new Set(state.syncedTorres.filter((t) => !state.torres.some((actual) => actual.id === t.id)).map((t) => t.id));

    for (const l of state.synced) {
      if (!currentById.has(l.id) && (l.torreId === null || !torresEliminadas.has(l.torreId))) {
        const res = await fetch(`/api/admin/lotes/${l.id}`, { method: "DELETE" });
        const r = (await res.json()) as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Error al eliminar la vivienda");
      }
    }

    for (const torre of [...state.syncedTorres]) {
      if (state.torres.some((t) => t.id === torre.id)) continue;
      const res = await fetch(`/api/admin/torres/${torre.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmar: true }) });
      const r = (await res.json()) as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Error al eliminar el edificio");
      state.syncedTorres = state.syncedTorres.filter((t) => t.id !== torre.id);
      state.synced = state.synced.filter((l) => l.torreId !== torre.id);
    }
    // Buildings must exist before their apartments are validated by the API.
    for (const torre of state.torres) {
      if (state.syncedTorres.some((t) => t.id === torre.id)) continue;
      const res = await fetch("/api/admin/torres", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(torre),
      });
      const r = (await res.json()) as { ok: boolean; data?: Torre; error?: string };
      if (!r.ok || !r.data) throw new Error(r.error ?? "Error al crear el edificio");
      const tempId = torre.id;
      torre.id = r.data.id;
      for (const lote of state.lotes) if (lote.torreId === tempId) lote.torreId = torre.id;
      for (const entry of state.history) {
        for (const t of entry.torres) if (t.id === tempId) t.id = torre.id;
        for (const lote of entry.lotes) if (lote.torreId === tempId) lote.torreId = torre.id;
      }
      state.syncedTorres.push(structuredClone(torre));
    }
    for (const torre of state.torres) {
      const base = state.syncedTorres.find((t) => t.id === torre.id);
      if (!base || JSON.stringify(base) === JSON.stringify(torre)) continue;
      // When apartments also moved, first allow both old and new geometries.
      // The final perimeter is applied after the apartments have synchronized.
      let body = torre;
      const apartamentosServidor = state.synced.filter((l) => l.torreId === torre.id && currentById.has(l.id));
      if (validarCambioTorre(torre, apartamentosServidor)) {
        const puntos = [...perimetrosEdificio(base), ...perimetrosEdificio(torre)];
        const xs = puntos.map((p) => p.x), ys = puntos.map((p) => p.y);
        const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
        body = { ...torre, perimetrosNivel: {}, cantidadNiveles: Math.max(base.cantidadNiveles, torre.cantidadNiveles), poligono: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] };
        edificiosPendientes.push(torre);
      }
      const res = await fetch(`/api/admin/torres/${torre.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const r = (await res.json()) as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Error al actualizar el edificio");
    }

    for (const lote of state.lotes) {
      if (!syncedById.has(lote.id)) {
        const res = await fetch("/api/admin/lotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loteBody(lote)),
        });
        const r = (await res.json()) as { ok: boolean; data?: LoteConModelo; error?: string };
        if (!r.ok || !r.data) throw new Error(r.error ?? "Error al crear la vivienda");
        loteIdMap.set(lote.id, r.data.id);
        const realId = r.data.id;
        if (lote.id > 0) {
          lote.imagenes = lote.imagenes.filter((img) => img.id < 0);
        }
        for (const img of lote.imagenes) {
          if (img.id < 0) {
            const file = state.pendingImageFiles.get(img.id);
            const path = state.pendingImagePaths.get(img.id);
            if (file) {
              const added = await uploadImage(realId, file);
              imgIdMap.set(img.id, added);
            } else if (path) {
              const added = await attachLoteImage(realId, path);
              imgIdMap.set(img.id, added);
            }
          }
        }
      }
    }

    for (const lote of state.lotes) {
      if (lote.id > 0 && syncedById.has(lote.id)) {
        const base = syncedById.get(lote.id)!;
        if (loteFieldsChanged(base, lote)) {
          const res = await fetch(`/api/admin/lotes/${lote.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loteBody(lote)),
          });
          const r = (await res.json()) as { ok: boolean; error?: string };
          if (!r.ok) throw new Error(r.error ?? "Error al guardar la vivienda");
        }
      }
    }

    for (const lote of state.lotes) {
      if (lote.id <= 0 || !syncedById.has(lote.id)) continue;
      const base = syncedById.get(lote.id)!;
      const keptServerIds = new Set(
        lote.imagenes.filter((i) => i.id > 0).map((i) => i.id),
      );
      for (const img of base.imagenes) {
        if (img.id > 0 && !keptServerIds.has(img.id)) {
          const res = await fetch(
            `/api/admin/lotes/${lote.id}/imagenes/${img.id}`,
            { method: "DELETE" },
          );
          const r = (await res.json()) as { ok: boolean; error?: string };
          if (!r.ok) throw new Error(r.error ?? "Error al quitar la imagen");
        }
      }
      for (const img of lote.imagenes) {
        if (img.id < 0) {
          const file = state.pendingImageFiles.get(img.id);
          const path = state.pendingImagePaths.get(img.id);
          if (file) {
            const added = await uploadImage(lote.id, file);
            imgIdMap.set(img.id, added);
          } else if (path) {
            const added = await attachLoteImage(lote.id, path);
            imgIdMap.set(img.id, added);
          }
        }
      }
    }

    for (const torre of edificiosPendientes) {
      const res = await fetch(`/api/admin/torres/${torre.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(torre) });
      const r = (await res.json()) as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Error al guardar el perímetro final del edificio");
    }

    // Sincronizar puntos de interés (igual que los lotes: local hasta guardar)
    const puntoIdMap = new Map<number, number>();
    const syncedPuntosById = new Map(state.syncedPuntos.map((p) => [p.id, p]));
    const currentPuntosById = new Map(state.puntos.map((p) => [p.id, p]));

    for (const p of state.syncedPuntos) {
      if (p.id > 0 && !currentPuntosById.has(p.id)) {
        const res = await fetch(`/api/admin/puntos/${p.id}`, { method: "DELETE" });
        const r = (await res.json()) as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Error al eliminar el punto");
      }
    }

    const puntoImagenIdMap = new Map<number, PuntoImagenItem>();

    for (const punto of state.puntos) {
      const base = syncedPuntosById.get(punto.id);
      let realPuntoId = punto.id;
      if (!base) {
        const res = await fetch("/api/admin/puntos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: punto.nombre,
            informacion: punto.informacion,
            x: punto.x,
            y: punto.y,
          }),
        });
        const r = (await res.json()) as { ok: boolean; data?: PuntoInteres; error?: string };
        if (!r.ok || !r.data) throw new Error(r.error ?? "Error al crear el punto");
        realPuntoId = r.data.id;
        puntoIdMap.set(punto.id, realPuntoId);
      } else if (puntoFieldsChanged(base, punto)) {
        const res = await fetch(`/api/admin/puntos/${punto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: punto.nombre,
            informacion: punto.informacion,
            x: punto.x,
            y: punto.y,
          }),
        });
        const r = (await res.json()) as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Error al guardar el punto");
      }

      for (const img of punto.imagenes) {
        if (img.id >= 0) continue;
        const path = state.pendingImagePaths.get(img.id);
        if (!path) continue;
        const added = await attachPuntoImage(realPuntoId, path);
        puntoImagenIdMap.set(img.id, added);
      }
    }

    remapDocumentIds(loteIdMap, imgIdMap);
    remapPuntoIds(puntoIdMap);
    remapPuntoImagenIds(puntoImagenIdMap);
    state.synced = cloneLotes(state.lotes);
    state.syncedTorres = structuredClone(state.torres);
    state.syncedPuntos = clonePuntos(state.puntos);
    state.pendingImageFiles.clear();
    state.pendingImagePaths.clear();
    state.clipboard = null;
    state.hasUnpublished = true;
    render();
    renderHistoryControls();
    showFormSuccess("Borrador guardado");
    return true;
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    state.syncing = false;
    state.busyLabel = "";
    updateDirtyIndicator();
  }
}

async function confirmarPublicacion(): Promise<void> {
  if (state.syncing) return;
  const ok = await showModal({
    title: "Publicar cambios",
    message:
      "Se guardará el borrador actual y se publicará como la versión visible en el sitio público. Las ediciones que no se guarden como borrador se aplicarán antes de publicar. ¿Confirmar la publicación?",
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Publicar", value: "confirm", className: "btn-primary" },
    ],
  });
  if (ok === "confirm") await publicar();
}

async function publicar(): Promise<void> {
  if (state.syncing) return;
  if (!(await guardarBorrador())) return;
  state.syncing = true;
  state.busyLabel = "Publicando…";
  clearFormError();
  updateDirtyIndicator();
  try {
    const res = await fetch("/api/admin/lotes/publicar", { method: "POST" });
    const r = (await res.json()) as { ok: boolean; error?: string };
    if (!r.ok) throw new Error(r.error ?? "Error al publicar");
    state.hasPublication = true;
    state.hasUnpublished = false;
    render();
    showFormSuccess("Cambios publicados");
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  } finally {
    state.syncing = false;
    state.busyLabel = "";
    updateDirtyIndicator();
  }
}

type PublicacionItem = { id: number; totalLotes: number; createdAt: number };
type RespaldoItem = { id: number; totalLotes: number; createdAt: number; url: string };
type RestoreTarget = { kind: "publicacion" | "respaldo"; id: number };

function showPublicacionesModal(): Promise<RestoreTarget | null> {
  if (activeModal !== null) return Promise.resolve(null);
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal publicaciones-modal" role="dialog" aria-modal="true">
        <h3>Publicaciones y respaldos</h3>
        <p class="confirm-text">Historial de versiones publicadas y respaldos guardados en R2. Restaurar reemplaza el borrador actual.</p>
        <div class="publicaciones-list" id="publicaciones-list">Cargando…</div>
        <div class="confirm-actions">
          <button type="button" class="btn-secondary" data-close="1">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    void setPopupOpen(overlay, true);
    activeModal = overlay;
    (document.activeElement as HTMLElement | null)?.blur();

    const cleanup = (value: RestoreTarget | null): void => {
      if (overlay.inert) return;
      void removePopup(overlay).then(() => {
        activeModal = null;
        resolve(value);
      });
    };
    overlay.querySelector("[data-close]")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    void (async () => {
      const listEl = overlay.querySelector<HTMLElement>("#publicaciones-list");
      if (!listEl) return;
      try {
        const [pubsRes, respRes] = (await Promise.all([
          fetch("/api/admin/lotes/publicaciones").then((r) => r.json()),
          fetch("/api/admin/lotes/respaldos").then((r) => r.json()),
        ])) as [{ ok: boolean; data?: PublicacionItem[] }, { ok: boolean; data?: RespaldoItem[] }];

        const pubs = pubsRes.ok ? (pubsRes.data ?? []) : [];
        const respaldos = respRes.ok ? (respRes.data ?? []) : [];
        const latestPubId = pubs[0]?.id ?? null;

        type Row = {
          kind: "publicacion" | "respaldo";
          id: number;
          totalLotes: number;
          createdAt: number;
          url?: string;
        };
        const rows: Row[] = [
          ...pubs.map((p) => ({ kind: "publicacion" as const, ...p })),
          ...respaldos.map((r) => ({ kind: "respaldo" as const, ...r })),
        ].sort((a, b) => b.createdAt - a.createdAt);

        if (rows.length === 0) {
          listEl.innerHTML = `<p class="lote-vacio">Todavía no hay publicaciones ni respaldos.</p>`;
          return;
        }

        listEl.innerHTML = rows
          .map((row) => {
            const esActual = row.kind === "publicacion" && row.id === latestPubId;
            const badge =
              row.kind === "publicacion"
                ? '<span class="tipo-badge badge-pub">Publicación</span>'
                : '<span class="tipo-badge badge-backup">Respaldo R2</span>';
            const download =
              row.kind === "respaldo" && row.url
                ? `<a class="btn-secondary" href="${escapeHtml(row.url)}" download>Descargar</a>`
                : "";
            return `
          <div class="publicacion-row">
            <div class="publicacion-info">
              <span class="publicacion-fecha">${new Date(row.createdAt).toLocaleString("es-SV")}</span>
              <span class="publicacion-meta">${badge}${row.totalLotes} vivienda(s)${esActual ? " · actual" : ""}</span>
            </div>
            <div class="publicacion-actions">
              ${download}
              <button type="button" class="btn-secondary" data-restore-kind="${row.kind}" data-restore-id="${row.id}">Restaurar</button>
            </div>
          </div>`;
          })
          .join("");

        listEl.querySelectorAll<HTMLElement>("[data-restore-kind]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const kind = btn.dataset.restoreKind === "respaldo" ? "respaldo" : "publicacion";
            cleanup({ kind, id: Number(btn.dataset.restoreId) });
          });
        });
      } catch (err) {
        listEl.innerHTML = `<p class="form-error">${escapeHtml(err instanceof Error ? err.message : String(err))}</p>`;
      }
    })();
  });
}

async function openPublicaciones(): Promise<void> {
  const target = await showPublicacionesModal();
  if (!target) return;
  const esRespaldo = target.kind === "respaldo";
  const confirmed = await showModal({
    title: esRespaldo ? "Restaurar respaldo" : "Restaurar versión",
    message: esRespaldo
      ? "Se reemplazará el borrador actual por el contenido de este respaldo de R2. ¿Continuar?"
      : "Se reemplazará el borrador actual por esta versión publicada. ¿Continuar?",
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Restaurar", value: "confirm", className: "btn-danger" },
    ],
  });
  if (confirmed !== "confirm") return;
  if (target.kind === "publicacion") await restaurarPublicacion(target.id);
  else await restaurarRespaldo(target.id);
}

async function respaldarJson(): Promise<void> {
  if (state.syncing) return;
  if (hasUnsavedChanges() && !saveLote()) return;
  if (documentDirty() && !(await guardarBorrador())) return;
  state.syncing = true;
  state.busyLabel = "Respaldando…";
  updateDirtyIndicator();
  try {
    const res = await fetch("/api/admin/lotes/respaldo", { method: "POST" });
    const r = (await res.json()) as {
      ok: boolean;
      data?: { url: string };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al respaldar");
    const link = document.createElement("a");
    link.href = r.data.url;
    link.rel = "noopener";
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    showFormSuccess("Respaldo generado y descargándose");
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  } finally {
    state.syncing = false;
    state.busyLabel = "";
    updateDirtyIndicator();
  }
}

function importarRespaldo(): void {
  if (state.syncing) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) void subirRespaldo(file);
  });
  input.click();
}

async function subirRespaldo(file: File): Promise<void> {
  let payload: unknown;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    showFormError("El archivo no es un JSON válido");
    return;
  }

  const confirmed = await showModal({
    title: "Restaurar desde respaldo",
    message:
      "Se reemplazará el borrador actual por el contenido del archivo. ¿Continuar?",
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Restaurar", value: "confirm", className: "btn-danger" },
    ],
  });
  if (confirmed !== "confirm") return;

  state.syncing = true;
  state.busyLabel = "Restaurando…";
  updateDirtyIndicator();
  try {
    const res = await fetch("/api/admin/lotes/respaldo/restaurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Array.isArray(payload) ? { lotes: payload } : payload),
    });
    const r = (await res.json()) as {
      ok: boolean;
      data?: { lotes: LoteConModelo[]; torres: Torre[]; pendiente: boolean; tienePublicacion: boolean };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al restaurar");
    loadDocument(r.data.lotes, {
      tienePublicacion: r.data.tienePublicacion,
      pendiente: r.data.pendiente,
    }, r.data.torres);
    showFormSuccess("Respaldo restaurado en el borrador");
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  } finally {
    state.syncing = false;
    state.busyLabel = "";
    updateDirtyIndicator();
  }
}

function setDropdownOpen(root: HTMLElement, open: boolean): void {
  const menu = root.querySelector<HTMLElement>("[data-dropdown-menu]");
  const toggle = root.querySelector<HTMLElement>("[data-dropdown-toggle]");
  if (menu) menu.hidden = !open;
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function closeAllDropdowns(): void {
  document.querySelectorAll<HTMLElement>("[data-dropdown]").forEach((root) => {
    setDropdownOpen(root, false);
  });
}

function anyDropdownOpen(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-dropdown-menu]"),
  ).some((m) => !m.hidden);
}

function setupDropdowns(): void {
  document.querySelectorAll<HTMLElement>("[data-dropdown]").forEach((root) => {
    root
      .querySelector<HTMLElement>("[data-dropdown-toggle]")
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = root.querySelector<HTMLElement>("[data-dropdown-menu]");
        const willOpen = menu ? menu.hidden : false;
        closeAllDropdowns();
        setDropdownOpen(root, willOpen);
      });
  });

  const publishMenu = document.getElementById("publish-menu");
  publishMenu?.addEventListener("click", (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>("[data-publish-action]");
    if (!item) return;
    const action = item.dataset.publishAction;
    closeAllDropdowns();
    if (action === "restore") void openPublicaciones();
    else if (action === "backup") void respaldarJson();
    else if (action === "import") importarRespaldo();
  });

  document.addEventListener("click", (e) => {
    const target = e.target as Node;
    document.querySelectorAll<HTMLElement>("[data-dropdown]").forEach((root) => {
      const menu = root.querySelector<HTMLElement>("[data-dropdown-menu]");
      if (menu && !menu.hidden && !root.contains(target)) setDropdownOpen(root, false);
    });
  });
}

async function restaurarPublicacion(id: number): Promise<void> {
  if (state.syncing) return;
  state.syncing = true;
  state.busyLabel = "Restaurando…";
  updateDirtyIndicator();
  try {
    const res = await fetch(`/api/admin/lotes/publicaciones/${id}/restaurar`, {
      method: "POST",
    });
    const r = (await res.json()) as {
      ok: boolean;
      data?: { lotes: LoteConModelo[]; torres: Torre[]; pendiente: boolean; tienePublicacion: boolean };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al restaurar");
    loadDocument(r.data.lotes, {
      tienePublicacion: r.data.tienePublicacion,
      pendiente: r.data.pendiente,
    }, r.data.torres);
    showFormSuccess("Versión restaurada en el borrador");
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  } finally {
    state.syncing = false;
    state.busyLabel = "";
    updateDirtyIndicator();
  }
}

async function restaurarRespaldo(id: number): Promise<void> {
  if (state.syncing) return;
  state.syncing = true;
  state.busyLabel = "Restaurando…";
  updateDirtyIndicator();
  try {
    const res = await fetch(`/api/admin/lotes/respaldos/${id}/restaurar`, {
      method: "POST",
    });
    const r = (await res.json()) as {
      ok: boolean;
      data?: { lotes: LoteConModelo[]; torres: Torre[]; pendiente: boolean; tienePublicacion: boolean };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al restaurar");
    loadDocument(r.data.lotes, {
      tienePublicacion: r.data.tienePublicacion,
      pendiente: r.data.pendiente,
    }, r.data.torres);
    showFormSuccess("Respaldo restaurado en el borrador");
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  } finally {
    state.syncing = false;
    state.busyLabel = "";
    updateDirtyIndicator();
  }
}

function loadDocument(
  lotes: LoteConModelo[],
  estado: { tienePublicacion: boolean; pendiente: boolean },
  torres: Torre[],
): void {
  clearTorreEdit();
  state.torres = torres;
  state.syncedTorres = structuredClone(torres);
  state.pendingNuevaTorre = null;
  state.dibujandoTorre = false;
  state.torreDraft = null;
  state.drawError = "";
  state.torre = null;
  state.nivelActivo = 1;
  state.mode = "lotes";
  state.lotes = lotes;
  state.synced = cloneLotes(lotes);
  state.hasPublication = estado.tienePublicacion;
  state.hasUnpublished = estado.pendiente;
  state.history = [];
  state.historyIndex = -1;
  state.selectedLoteId = null;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.pendingImageFiles.clear();
  state.pendingImagePaths.clear();
  resetPendingImages();
  clearFormDraft();
  state.clipboard = null;
  commitHistory("Estado inicial");
  render();
}

function remapImage(img: LoteImagenItem, imgIdMap: Map<number, LoteImagenItem>): LoteImagenItem {
  const mapped = imgIdMap.get(img.id);
  if (!mapped) return img;
  if (img.path.startsWith("blob:")) URL.revokeObjectURL(img.path);
  return { id: mapped.id, path: mapped.path };
}

function remapLote(lote: LoteConModelo, loteIdMap: Map<number, number>, imgIdMap: Map<number, LoteImagenItem>): void {
  const mappedLoteId = loteIdMap.get(lote.id);
  if (mappedLoteId !== undefined) lote.id = mappedLoteId;
  lote.imagenes = lote.imagenes.map((img) => remapImage(img, imgIdMap));
}

function remapDocumentIds(
  loteIdMap: Map<number, number>,
  imgIdMap: Map<number, LoteImagenItem>,
): void {
  for (const lote of state.lotes) remapLote(lote, loteIdMap, imgIdMap);
  for (const entry of state.history) {
    for (const lote of entry.lotes) remapLote(lote, loteIdMap, imgIdMap);
    if (entry.selectedLoteId !== null && loteIdMap.has(entry.selectedLoteId)) {
      entry.selectedLoteId = loteIdMap.get(entry.selectedLoteId)!;
    }
  }
  if (state.selectedLoteId !== null && loteIdMap.has(state.selectedLoteId)) {
    state.selectedLoteId = loteIdMap.get(state.selectedLoteId)!;
  }
}

function remapPuntoIds(puntoIdMap: Map<number, number>): void {
  if (puntoIdMap.size === 0) return;
  const remap = (punto: PuntoInteres): void => {
    const mapped = puntoIdMap.get(punto.id);
    if (mapped !== undefined) punto.id = mapped;
  };
  for (const punto of state.puntos) remap(punto);
  for (const entry of state.history) {
    for (const punto of entry.puntos) remap(punto);
    if (entry.selectedPuntoId !== null && puntoIdMap.has(entry.selectedPuntoId)) {
      entry.selectedPuntoId = puntoIdMap.get(entry.selectedPuntoId)!;
    }
  }
  if (state.selectedPuntoId !== null && puntoIdMap.has(state.selectedPuntoId)) {
    state.selectedPuntoId = puntoIdMap.get(state.selectedPuntoId)!;
  }
}

function remapPuntoImagenIds(imagenIdMap: Map<number, PuntoImagenItem>): void {
  if (imagenIdMap.size === 0) return;
  const remap = (punto: PuntoInteres): void => {
    punto.imagenes = punto.imagenes.map((img) => {
      const mapped = imagenIdMap.get(img.id);
      return mapped ? { id: mapped.id, path: mapped.path } : img;
    });
  };
  for (const punto of state.puntos) remap(punto);
  for (const entry of state.history) for (const punto of entry.puntos) remap(punto);
}

// ============ Init ============

export function initEditor(): void {
  const dataEl = document.getElementById("editor-data");
  if (!dataEl) return;
  try {
    initialData = JSON.parse(dataEl.textContent || "{}") as InitialData;
  } catch {
    console.error("editor: invalid initial data");
    return;
  }
  if (!initialData.plan) return;

  svg = document.getElementById("canvas") as unknown as SVGSVGElement;
  lotsLayer = document.getElementById("lots-layer") as unknown as SVGGElement;
  towerLayer = document.getElementById("tower-layer") as unknown as SVGGElement;
  buildingsLayer = document.getElementById("buildings-layer") as unknown as SVGGElement;
  puntosLayer = document.getElementById("puntos-layer") as unknown as SVGGElement;
  overlayLayer = document.getElementById("overlay-layer") as unknown as SVGGElement;
  sidePanel = document.getElementById("side-panel") as HTMLElement;
  zoomDisplay = document.getElementById("zoom-display") as HTMLElement;
  planImage = document.getElementById("plan-image") as SVGGElement | null;
  planOpacity = (initialData.plan.opacidad ?? 80) / 100;
  createSelectionToolbar();

  state.initialView = { w: initialData.plan.anchoPx, h: initialData.plan.altoPx };
  state.view = defaultView();
  state.atDefaultView = true;
  state.lotes = initialData.lotes;
  state.torres = initialData.torres ?? [];
  state.syncedTorres = structuredClone(state.torres);
  state.puntos = initialData.puntos ?? [];
  state.modelos = initialData.modelos;
  state.synced = cloneLotes(initialData.lotes);
  state.syncedPuntos = clonePuntos(state.puntos);
  state.hasPublication = initialData.estadoPublicacion?.tienePublicacion ?? false;
  state.hasUnpublished = initialData.estadoPublicacion?.pendiente ?? false;
  commitHistory("Estado inicial");

  document.getElementById("create-lote")?.addEventListener("click", () => {
    if (state.mode === "draw" && state.pendingNewLote === null && state.pendingNuevaTorre === null) {
      cancelDraw();
      return;
    }
    if (state.torre) void crearApartamento();
    else void setMode("draw");
  });
  document.getElementById("create-apartamento")?.addEventListener("click", () => { void crearApartamento(); });
  document.getElementById("exit-tower")?.addEventListener("click", () => { void salirTorre(); });
  document.getElementById("edit-tower")?.addEventListener("click", () => { void editarEdificio(); });
  document.getElementById("create-punto")?.addEventListener("click", () => {
    closeAllDropdowns();
    if (state.mode === "punto") {
      state.nuevoPuntoPos = null;
      state.selectedPuntoId = null;
      state.mode = "lotes";
      render();
      return;
    }
    void setMode("punto");
  });
  document.getElementById("zoom-in")?.addEventListener("click", () => zoomBy(0.8));
  document.getElementById("zoom-out")?.addEventListener("click", () => zoomBy(1.25));
  document.getElementById("zoom-fit")?.addEventListener("click", () => fitView());
  document.getElementById("paste-lote")?.addEventListener("click", () => {
    void pasteLote();
  });
  document.getElementById("undo")?.addEventListener("click", undo);
  document.getElementById("redo")?.addEventListener("click", redo);
  document.getElementById("publish-action")?.addEventListener("click", () => {
    closeAllDropdowns();
    void confirmarPublicacion();
  });
  document.getElementById("save-draft")?.addEventListener("click", () => {
    closeAllDropdowns();
    void guardarBorrador();
  });
  setupDropdowns();

  document.querySelectorAll<HTMLElement>("[data-view-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.polygonView =
        btn.dataset.viewValue === "disponibilidad" ? "disponibilidad" : "estandar";
      closeAllDropdowns();
      render();
    });
  });

  svg.addEventListener("mousedown", handleSvgMouseDown);
  svg.addEventListener("wheel", handleWheel, { passive: false });
  svg.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);
  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("beforeunload", (e) => {
    if (hasUnsavedChanges() || documentDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  const resizeTarget = svg.parentElement ?? svg;
  new ResizeObserver(() => {
    if (!state.atDefaultView) return;
    state.view = defaultView();
    renderViewTransform();
  }).observe(resizeTarget);

  render();
  renderHistoryControls();
  updateDirtyIndicator();
}
