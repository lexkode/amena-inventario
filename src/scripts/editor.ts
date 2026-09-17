// ============ Types ============

import {
  MAX_IMAGENES_POR_LOTE,
  type Punto,
  type LoteEstado,
  type LoteConModelo,
  type LoteImagenItem,
} from "@features/lots/lote.types";
import type { ModeloConCaracteristicas } from "@features/catalog/modelo.types";
import {
  applyViewTransform as applySvgView,
  clientToSvg as svgToPoint,
  fitView as makeFitView,
  panTo as panView,
  zoomAtPoint as zoomViewAt,
  zoomBy as zoomViewBy,
} from "@shared/map/viewport";
import { SVG_NS, escapeHtml } from "@shared/map/svg-utils";
import { createLotLabel, createLotPolygon, LOT_BORDER_WIDTH } from "@shared/map/lot-renderer";
import { ESTADO_FILL, ESTADO_STROKE } from "@shared/map/lot-colors";

type Mode = "lotes" | "draw";

type PolygonView = "disponibilidad" | "estandar";

const STANDARD_SELECTED_FILL = "rgba(220, 131, 47, 0.5)";
const STANDARD_SELECTED_STROKE = "#dc832f";
const STANDARD_DASH = "6,4";

type NewLote = {
  numeroLote: string;
  estado: LoteEstado;
  poligono: Punto[];
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
};

type LoteDraft = {
  numeroLote: string;
  estado: LoteEstado;
  modeloId: string;
  terrenoM2: string;
  dimensionesLote: string;
};

type LoteSnapshot = {
  polygon: Punto[];
  numeroLote: string;
  estado: LoteEstado;
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
};

type LoteClipboard = LoteSnapshot;

type HistoryEntry = {
  label: string;
  key?: string;
  at: number;
  lotes: LoteConModelo[];
  selectedLoteId: number | null;
};

type State = {
  mode: Mode;
  polygonView: PolygonView;
  view: { x: number; y: number; w: number; h: number };
  initialView: { w: number; h: number };
  isPanning: boolean;
  panStart: { clientX: number; clientY: number; vbX: number; vbY: number };
  panFromBackground: boolean;
  currentPolygon: Punto[];
  pendingNewLote: NewLote | null;
  selectedLoteId: number | null;
  selectedVertex: { loteId: number; index: number } | null;
  draggingVertex: { loteId: number; index: number } | null;
  draggingPolygon: { loteId: number; start: Punto; original: Punto[] } | null;
  dragMoved: boolean;
  lotes: LoteConModelo[];
  modelos: ModeloConCaracteristicas[];
  pendingImageAdds: { file: File; url: string }[];
  pendingImageRemoves: number[];
  formDirty: boolean;
  draft: LoteDraft | null;
  editSnapshot: LoteSnapshot | null;
  clipboard: LoteClipboard | null;
  history: HistoryEntry[];
  historyIndex: number;
  synced: LoteConModelo[];
  nextTempId: number;
  pendingImageFiles: Map<number, File>;
  syncing: boolean;
  busyLabel: string;
  hasPublication: boolean;
  hasUnpublished: boolean;
};

type InitialData = {
  plan: {
    id: number;
    nombre: string;
    imagenPath: string;
    anchoPx: number;
    altoPx: number;
  } | null;
  lotes: LoteConModelo[];
  modelos: ModeloConCaracteristicas[];
  estadoPublicacion: { tienePublicacion: boolean; pendiente: boolean };
};

// ============ State ============

const state: State = {
  mode: "lotes",
  polygonView: "estandar",
  view: { x: 0, y: 0, w: 1, h: 1 },
  initialView: { w: 1, h: 1 },
  isPanning: false,
  panStart: { clientX: 0, clientY: 0, vbX: 0, vbY: 0 },
  panFromBackground: false,
  currentPolygon: [],
  pendingNewLote: null,
  selectedLoteId: null,
  selectedVertex: null,
  draggingVertex: null,
  draggingPolygon: null,
  dragMoved: false,
  lotes: [],
  modelos: [],
  pendingImageAdds: [],
  pendingImageRemoves: [],
  formDirty: false,
  draft: null,
  editSnapshot: null,
  clipboard: null,
  history: [],
  historyIndex: -1,
  synced: [],
  nextTempId: -1,
  pendingImageFiles: new Map(),
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
let overlayLayer!: SVGGElement;
let sidePanel!: HTMLElement;
let zoomDisplay!: HTMLElement;
let selectionToolbar: HTMLDivElement | null = null;
let planImage: SVGGElement | null = null;
let initialData: InitialData;

// ============ Working copy & history ============

const MAX_HISTORY = 100;

function cloneLotes(lotes: LoteConModelo[]): LoteConModelo[] {
  return structuredClone(lotes);
}

function genTempId(): number {
  const id = state.nextTempId;
  state.nextTempId -= 1;
  return id;
}

function documentDirty(): boolean {
  return JSON.stringify(state.lotes) !== JSON.stringify(state.synced);
}

function loteFieldsChanged(a: LoteConModelo, b: LoteConModelo): boolean {
  return (
    JSON.stringify([a.numeroLote, a.estado, a.poligono, a.modeloId, a.terrenoM2, a.dimensionesLote]) !==
    JSON.stringify([b.numeroLote, b.estado, b.poligono, b.modeloId, b.terrenoM2, b.dimensionesLote])
  );
}

function loteBody(lote: LoteConModelo): {
  numeroLote: string;
  estado: LoteEstado;
  poligono: Punto[];
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
} {
  return {
    numeroLote: lote.numeroLote,
    estado: lote.estado,
    poligono: lote.poligono,
    modeloId: lote.modeloId,
    terrenoM2: lote.terrenoM2,
    dimensionesLote: lote.dimensionesLote,
  };
}

function updateDirtyIndicator(): void {
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
}

function renderHistoryControls(): void {
  const select = document.getElementById("history-select") as HTMLSelectElement | null;
  if (select) {
    select.innerHTML = state.history
      .map((h, i) => `<option value="${i}">${escapeHtml(h.label)}</option>`)
      .join("");
    select.disabled = state.history.length === 0;
    if (state.historyIndex >= 0) select.value = String(state.historyIndex);
  }
  const undoBtn = document.getElementById("undo") as HTMLButtonElement | null;
  const redoBtn = document.getElementById("redo") as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = state.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

function commitHistory(label: string, coalesceKey?: string): void {
  const now = Date.now();
  const last = state.historyIndex >= 0 ? state.history[state.historyIndex] : undefined;
  const atTip = state.historyIndex === state.history.length - 1;
  if (coalesceKey && atTip && last && last.key === coalesceKey && now - last.at < 800) {
    last.at = now;
    last.lotes = cloneLotes(state.lotes);
    last.selectedLoteId = state.selectedLoteId;
    renderHistoryControls();
    updateDirtyIndicator();
    return;
  }

  state.history.splice(state.historyIndex + 1);
  state.history.push({
    label,
    key: coalesceKey,
    at: now,
    lotes: cloneLotes(state.lotes),
    selectedLoteId: state.selectedLoteId,
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
  if (index < 0 || index >= state.history.length || index === state.historyIndex) return;
  state.historyIndex = index;
  const entry = state.history[index];
  state.lotes = cloneLotes(entry.lotes);
  state.pendingNewLote = null;
  state.currentPolygon = [];
  state.selectedVertex = null;
  state.draggingPolygon = null;
  resetPendingImages();
  clearFormDraft();
  state.selectedLoteId =
    entry.selectedLoteId !== null && state.lotes.some((l) => l.id === entry.selectedLoteId)
      ? entry.selectedLoteId
      : null;
  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
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
  renderSelectionToolbar();
}

function updateCursor(): void {
  if (state.isPanning) {
    svg.style.cursor = "grabbing";
  } else if (state.mode === "lotes") {
    svg.style.cursor = "grab";
  } else if (state.mode === "draw") {
    svg.style.cursor = state.pendingNewLote ? "not-allowed" : "crosshair";
  } else {
    svg.style.cursor = "default";
  }
}

function renderLotsLayer(): void {
  while (lotsLayer.firstChild) lotsLayer.removeChild(lotsLayer.firstChild);

  for (const lote of state.lotes) {
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
    polygon.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.shiftKey) return;
      e.stopPropagation();
      if (state.mode !== "lotes") return;
      void selectLote(lote.id);
      state.draggingPolygon = {
        loteId: lote.id,
        start: svgToPoint(svg, e.clientX, e.clientY),
        original: lote.poligono.map((p) => ({ ...p })),
      };
      state.dragMoved = false;
      svg.style.cursor = "move";
    });
    lotsLayer.appendChild(polygon);

    if (label) lotsLayer.appendChild(label);
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
  if (state.pendingNewLote !== null) {
    renderLotForm(state.pendingNewLote, true);
    return;
  }

  if (state.mode === "draw") {
    if (state.currentPolygon.length === 0) {
      sidePanel.innerHTML = `
        <h2 style="margin-top:0">Modo Dibujar</h2>
        <p style="color:#5a7682;font-size:.9rem">Haz clic en el plano para colocar el primer vértice del polígono.</p>
        <p style="color:#5a7682;font-size:.8rem;margin-top:1rem">Shift+arrastrar o botón central para panear. Rueda para zoom.</p>
      `;
    } else {
      const canClose = state.currentPolygon.length >= 3;
      sidePanel.innerHTML = `
        <h2 style="margin-top:0">Dibujando: ${state.currentPolygon.length} puntos</h2>
        <p style="color:#5a7682;font-size:.85rem">Mínimo 3 vértices para cerrar.</p>
        <div class="actions">
          <button id="close-polygon" class="btn-primary" ${canClose ? "" : "disabled"}>Cerrar polígono</button>
          <button id="cancel-draw" class="btn-secondary">Cancelar</button>
        </div>
      `;
      document
        .getElementById("close-polygon")
        ?.addEventListener("click", closePolygon);
      document
        .getElementById("cancel-draw")
        ?.addEventListener("click", cancelDraw);
    }
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
  const sinModelo: LoteConModelo[] = [];
  for (const lote of state.lotes) {
    if (lote.modeloId === null || !lote.modelo) {
      sinModelo.push(lote);
    } else {
      const nombre = lote.modelo.nombre;
      const arr = grupos.get(nombre) ?? [];
      arr.push(lote);
      grupos.set(nombre, arr);
    }
  }

  let html = `<h2 style="margin-top:0">Lotes</h2>`;
  const seen = new Set<string>();

  const renderGrupo = (nombre: string, arr: LoteConModelo[]): void => {
    seen.add(nombre);
    html += `<details class="lote-acc">`;
    html += `<summary class="lote-grupo">${escapeHtml(nombre)}<svg class="lote-chev" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary>`;
    html += `<ul class="lote-list">`;
    for (const lote of arr) {
      html += `<li><button type="button" class="lote-row" data-lote-id="${lote.id}">${escapeHtml(lote.numeroLote)}</button></li>`;
    }
    html += `</ul>`;
    html += `</details>`;
  };

  for (const modelo of state.modelos) {
    const arr = grupos.get(modelo.nombre);
    if (arr) renderGrupo(modelo.nombre, arr);
  }
  for (const [nombre, arr] of grupos) {
    if (!seen.has(nombre)) renderGrupo(nombre, arr);
  }
  if (sinModelo.length > 0) {
    renderGrupo("Sin modelo", sinModelo);
  }

  if (state.lotes.length === 0) {
    html += `<p class="lote-vacio">No hay lotes todavía. Usa el modo Dibujar para crear uno.</p>`;
  }

  sidePanel.innerHTML = `<div class="lote-scroll">${html}</div>`;
  sidePanel.querySelectorAll<HTMLElement>("[data-lote-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void selectLote(Number(btn.dataset.loteId));
    });
  });
}

function renderLotForm(lote: LoteConModelo | NewLote, isNew: boolean): void {
  const id = isNew ? null : (lote as LoteConModelo).id;

  const draft = state.draft;
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
    ? "Nuevo lote"
    : titleModel
      ? `${titleModel} ${numeroLote}`
      : `Lote ${numeroLote}`;

  const modelosOptions = state.modelos
    .filter((m) => m.tipo === "casa")
    .map(
      (m) =>
        `<option value="${m.id}" ${String(m.id) === modeloId ? "selected" : ""}>${escapeHtml(m.nombre)}</option>`,
    )
    .join("");

  const backButton = isNew
    ? ""
    : '<button type="button" id="back-to-list" class="back-btn" aria-label="Volver a la lista de lotes"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></button>';

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
      <img src="${escapeHtml(img.path)}" alt="Imagen del lote" />
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
        <label>Imágenes del lote</label>
        <div class="lote-imgs" id="lote-imgs">
          ${keptHtml}${pendingHtml}
          ${imagenesAtLimit ? "" : `
          <label class="img-add" title="Subir imagen">
            <input type="file" id="lote-img-input" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
            <span>+</span>
          </label>`}
        </div>
        ${imagenesAtLimit ? `<small class="hint">Máximo ${MAX_IMAGENES_POR_LOTE} imágenes por lote</small>` : ""}
      </div>`;

  const saveDisabled = !isNew && !state.formDirty;

  sidePanel.innerHTML = `
    <form id="lot-form" class="form-col" autocomplete="off">
      <div class="form-head">
        ${backButton}
        <h2>${escapeHtml(title)}</h2>
        <span class="panel-spacer" aria-hidden="true"></span>
      </div>
      <div class="form-fields">
        <div class="field">
          <label for="numeroLote">Número de lote</label>
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
          <label for="modeloId">Modelo de casa</label>
          <select id="modeloId">
            <option value="" ${modeloId === "" ? "selected" : ""}>— Sin modelo —</option>
            ${modelosOptions}
          </select>
        </div>
        <div class="field">
          <label for="terrenoM2">Terreno (m²)</label>
          <input id="terrenoM2" type="number" step="0.01" min="0" value="${escapeHtml(terrenoM2)}" />
        </div>
        <div class="field">
          <label for="dimensionesLote">Dimensiones del lote</label>
          <input id="dimensionesLote" type="text" maxlength="64" value="${escapeHtml(dimensionesLote)}" placeholder="ej. 15m x 7m" />
        </div>
        ${imagenesHtml}
      </div>
      <div class="form-actions">
        <p id="form-error" class="form-error" hidden></p>
        <p id="form-success" class="form-success" hidden></p>
        <div class="actions">
          <button type="submit" id="save-lote-btn" class="btn-primary" ${saveDisabled ? "disabled" : ""}>${isNew ? "Crear lote" : "Aplicar cambios"}</button>
          ${!isNew ? '<button type="button" id="delete-lote" class="btn-danger">Eliminar lote</button>' : ""}
          ${isNew ? '<button type="button" id="cancel-new" class="btn-secondary">Cancelar</button>' : ""}
        </div>
      </div>
    </form>
  `;

  document.getElementById("lot-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveLote();
  });

  if (isNew) {
    document.getElementById("cancel-new")?.addEventListener("click", () => {
      state.pendingNewLote = null;
      state.currentPolygon = [];
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

  [numeroLoteEl, estadoEl, modeloSelect, terrenoInput, dimensionesInput].forEach((el) => {
    el?.addEventListener("input", markFormDirty);
    el?.addEventListener("change", markFormDirty);
  });

  modeloSelect?.addEventListener("change", () => {
    const id = Number(modeloSelect.value);
    if (!id) return;
    const modelo = state.modelos.find((m) => m.id === id);
    if (!modelo) return;
    if (isNew) {
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
      <img src="${escapeHtml(img.path)}" alt="Imagen del lote" />
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
    <label class="img-add" title="Subir imagen">
      <input type="file" id="lote-img-input" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
      <span>+</span>
    </label>`);

  const field = container.closest(".field");
  field?.querySelector(".hint")?.remove();
  if (atLimit && field) {
    field.insertAdjacentHTML(
      "beforeend",
      `<small class="hint">Máximo ${MAX_IMAGENES_POR_LOTE} imágenes por lote</small>`,
    );
  }

  bindImageHandlers();
}

function bindImageHandlers(): void {
  document.getElementById("lote-img-input")?.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) {
      state.pendingImageAdds.push({ file, url: URL.createObjectURL(file) });
      markFormDirty();
      renderLoteImages();
    }
  });
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
        if (removed) URL.revokeObjectURL(removed.url);
        markFormDirty();
        renderLoteImages();
      }
    });
  });
}

function renderModeButtons(): void {
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
}

function renderMapOpacity(): void {
  if (!planImage) return;
  planImage.setAttribute("opacity", state.polygonView === "estandar" ? "0.5" : "1");
}

function createSelectionToolbar(): void {
  const wrap = document.getElementById("canvas-wrap");
  if (!wrap) return;

  const el = document.createElement("div");
  el.className = "selection-toolbar";
  el.hidden = true;
  el.innerHTML = `
    <button type="button" data-action="edit" title="Editar lote" aria-label="Editar lote">${ICON_EDIT}</button>
    <button type="button" data-action="copy" title="Copiar lote (Ctrl+C)" aria-label="Copiar lote">${ICON_COPY}</button>
    <button type="button" data-action="delete" data-danger="true" title="Eliminar lote" aria-label="Eliminar lote">${ICON_TRASH}</button>
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
    polygon: lote.poligono.map((p) => ({ ...p })),
    numeroLote: lote.numeroLote,
    estado: lote.estado,
    modeloId: lote.modeloId ?? null,
    terrenoM2: lote.terrenoM2,
    dimensionesLote: lote.dimensionesLote,
  };
}

function copyLote(): void {
  const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
  if (!lote) return;
  state.clipboard = captureSnapshot(lote);
  renderPasteButton();
  showFormSuccess("Lote copiado. Pega con Ctrl+V o el botón Pegar lote.");
}

function numeroEnUso(modeloId: number | null, numeroLote: string): boolean {
  return state.lotes.some(
    (l) => (l.modeloId ?? null) === modeloId && l.numeroLote === numeroLote,
  );
}

function nextNumeroLote(base: string, modeloId: number | null): string {
  const parsed = Number.parseInt(base, 10);
  if (Number.isNaN(parsed)) {
    let candidate = `${base} copia`;
    let i = 2;
    while (numeroEnUso(modeloId, candidate)) candidate = `${base} copia ${i++}`;
    return candidate;
  }
  let n = parsed + 1;
  while (numeroEnUso(modeloId, String(n))) n++;
  return String(n);
}

async function pasteLote(): Promise<void> {
  const clip = state.clipboard;
  if (!clip) return;
  if (!(await confirmDiscard())) return;

  const numero = nextNumeroLote(clip.numeroLote, clip.modeloId);
  const lote: LoteConModelo = {
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

  state.lotes.push(lote);
  state.selectedLoteId = lote.id;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  resetPendingImages();
  clearFormDraft();
  state.editSnapshot = captureSnapshot(lote);
  commitHistory(`Pegar lote ${numero}`);
  render();
  showFormSuccess("Lote pegado. No olvides publicar.");
}

function renderPasteButton(): void {
  const group = document.getElementById("paste-group");
  if (group) group.hidden = state.clipboard === null;
}

function render(): void {
  renderViewTransform();
  updateCursor();
  renderLotsLayer();
  renderOverlayLayer();
  renderSidePanel();
  renderModeButtons();
  renderMapOpacity();
  renderPasteButton();
}

// ============ Mode & selection ============

function hasUnsavedChanges(): boolean {
  return (
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
    activeModal = overlay;
    (document.activeElement as HTMLElement | null)?.blur();

    const cleanup = (value: string): void => {
      overlay.remove();
      activeModal = null;
      resolve(value);
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

function discardChanges(): void {
  if (state.selectedLoteId !== null && state.editSnapshot) {
    const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
    if (lote) {
      lote.numeroLote = state.editSnapshot.numeroLote;
      lote.estado = state.editSnapshot.estado;
      lote.modeloId = state.editSnapshot.modeloId;
      lote.modelo =
        state.editSnapshot.modeloId !== null
          ? (state.modelos.find((m) => m.id === state.editSnapshot!.modeloId) ?? null)
          : null;
      lote.terrenoM2 = state.editSnapshot.terrenoM2;
      lote.dimensionesLote = state.editSnapshot.dimensionesLote;
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
      ? `El lote ${escapeHtml(numero)} tiene cambios sin guardar. ¿Qué deseas hacer?`
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
    title: "Eliminar lote",
    message: numero
      ? `¿Eliminar el lote ${escapeHtml(numero)}? Esta acción no se puede deshacer.`
      : "¿Eliminar este lote? Esta acción no se puede deshacer.",
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Eliminar lote", value: "confirm", className: "btn-danger" },
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
  if (mode === state.mode) return;
  if (!(await confirmDiscard())) return;
  state.mode = mode;
  state.currentPolygon = [];
  state.pendingNewLote = null;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  resetPendingImages();
  clearFormDraft();
  if (mode !== "lotes") {
    state.selectedLoteId = null;
  }
  render();
}

async function selectLote(id: number | null): Promise<void> {
  if (id === state.selectedLoteId) return;
  if (!(await confirmDiscard())) return;
  state.selectedLoteId = id;
  state.selectedVertex = null;
  state.draggingPolygon = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
  resetPendingImages();
  clearFormDraft();
  const lote = id !== null ? state.lotes.find((l) => l.id === id) : undefined;
  state.editSnapshot = lote ? captureSnapshot(lote) : null;
  render();
}

function closePolygon(): void {
  if (state.currentPolygon.length < 3) return;
  state.pendingNewLote = {
    numeroLote: "",
    estado: "disponible",
    poligono: [...state.currentPolygon],
    modeloId: null,
    terrenoM2: null,
    dimensionesLote: null,
  };
  state.currentPolygon = [];
  resetPendingImages();
  clearFormDraft();
  render();
}

function cancelDraw(): void {
  state.currentPolygon = [];
  state.pendingNewLote = null;
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
  renderViewTransform();
}

function zoomBy(factor: number): void {
  state.view = zoomViewBy(state.view, factor, state.initialView, svg);
  renderViewTransform();
}

function fitView(): void {
  state.view = makeFitView(state.initialView);
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

  if (state.mode === "lotes") {
    state.panFromBackground = true;
    startPan(e.clientX, e.clientY);
  } else if (state.mode === "draw") {
    if (state.pendingNewLote !== null) return;
    const p = svgToPoint(svg, e.clientX, e.clientY);
    state.currentPolygon.push(p);
    render();
  }
}

function handleDocumentMouseMove(e: MouseEvent): void {
  if (state.isPanning) {
    panTo(e.clientX, e.clientY);
  } else if (state.draggingVertex) {
    const p = svgToPoint(svg, e.clientX, e.clientY);
    const lote = state.lotes.find((l) => l.id === state.draggingVertex!.loteId);
    if (lote) {
      lote.poligono[state.draggingVertex.index] = p;
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
      lote.poligono = drag.original.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
      state.dragMoved = true;
      render();
    }
  }
}

function handleDocumentMouseUp(e: MouseEvent): void {
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
      if (lote) commitHistory(`Mover vértice lote ${lote.numeroLote}`, `vertex:${lote.id}`);
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
      if (lote) commitHistory(`Mover lote ${lote.numeroLote}`, `polygon:${lote.id}`);
    }
  }
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.1;
  zoomAtPoint(factor, e.clientX, e.clientY);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (activeModal !== null) return;

  const target = e.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

  if (e.key === "Escape" && isPublishMenuOpen()) {
    setPublishMenuOpen(false);
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

  if (e.key === "Escape") {
    if (state.pendingNewLote !== null) {
      state.pendingNewLote = null;
      state.currentPolygon = [];
      render();
    } else if (state.currentPolygon.length > 0) {
      state.currentPolygon = [];
      render();
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
        lote.poligono = lote.poligono.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        commitHistory(`Mover lote ${lote.numeroLote}`, `nudge:${lote.id}`);
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
        lote.poligono[idx] = { x: p.x + dx, y: p.y + dy };
        commitHistory(`Mover vértice lote ${lote.numeroLote}`, `nudge-vertex:${lote.id}`);
        e.preventDefault();
        render();
      }
    }
  }
}

// ============ API actions ============

function getFormData(): {
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
    showFormError("El número de lote es obligatorio");
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

  return { numeroLote, estado, modeloId, terrenoM2, dimensionesLote };
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
        if (img?.path.startsWith("blob:")) URL.revokeObjectURL(img.path);
      }
    }
    lote.imagenes = lote.imagenes.filter((img) => !removes.has(img.id));
  }
  for (const p of state.pendingImageAdds) {
    const id = genTempId();
    lote.imagenes.push({ id, path: p.url });
    state.pendingImageFiles.set(id, p.file);
  }
  state.pendingImageAdds = [];
  state.pendingImageRemoves = [];
}

function modeloById(id: number | null): LoteConModelo["modelo"] {
  if (id === null) return null;
  return state.modelos.find((m) => m.id === id) ?? null;
}

function saveLote(): boolean {
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

  const modeloId = data.modeloId ?? null;
  const duplicate = state.lotes.find(
    (l) =>
      l.id !== state.selectedLoteId &&
      (l.modeloId ?? null) === modeloId &&
      l.numeroLote === data.numeroLote,
  );
  if (duplicate) {
    showFormError(`El número de lote ${data.numeroLote} ya existe para este modelo`);
    return false;
  }

  if (isNew) {
    const lote: LoteConModelo = {
      id: genTempId(),
      numeroLote: data.numeroLote,
      estado: data.estado,
      poligono: poligono.map((p) => ({ ...p })),
      modeloId,
      terrenoM2: data.terrenoM2,
      dimensionesLote: data.dimensionesLote,
      modelo: modeloById(modeloId),
      imagenes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    consumePendingImages(lote);
    state.lotes.push(lote);
    state.selectedLoteId = lote.id;
    state.pendingNewLote = null;
    clearFormDraft();
    state.editSnapshot = captureSnapshot(lote);
    commitHistory(`Crear lote ${lote.numeroLote}`);
    render();
    showFormSuccess("Lote creado. No olvides publicar.");
    return true;
  }

  if (!current) return false;

  current.numeroLote = data.numeroLote;
  current.estado = data.estado;
  current.modeloId = modeloId;
  current.modelo = modeloById(modeloId);
  current.terrenoM2 = data.terrenoM2;
  current.dimensionesLote = data.dimensionesLote;
  current.poligono = poligono.map((p) => ({ ...p }));
  consumePendingImages(current);
  clearFormDraft();
  state.editSnapshot = captureSnapshot(current);
  commitHistory(`Editar lote ${current.numeroLote}`);
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
  commitHistory(`Eliminar lote ${lote?.numeroLote ?? ""}`.trim());
  render();
}

function resetPendingImages(): void {
  for (const p of state.pendingImageAdds) {
    URL.revokeObjectURL(p.url);
  }
  state.pendingImageAdds = [];
  state.pendingImageRemoves = [];
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

  try {
    const syncedById = new Map(state.synced.map((l) => [l.id, l]));
    const currentById = new Map(state.lotes.map((l) => [l.id, l]));

    for (const l of state.synced) {
      if (!currentById.has(l.id)) {
        const res = await fetch(`/api/admin/lotes/${l.id}`, { method: "DELETE" });
        const r = (await res.json()) as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Error al eliminar el lote");
      }
    }

    for (const lote of state.lotes) {
      if (!syncedById.has(lote.id)) {
        const res = await fetch("/api/admin/lotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loteBody(lote)),
        });
        const r = (await res.json()) as { ok: boolean; data?: LoteConModelo; error?: string };
        if (!r.ok || !r.data) throw new Error(r.error ?? "Error al crear el lote");
        loteIdMap.set(lote.id, r.data.id);
        const realId = r.data.id;
        if (lote.id > 0) {
          lote.imagenes = lote.imagenes.filter((img) => img.id < 0);
        }
        for (const img of lote.imagenes) {
          if (img.id < 0) {
            const file = state.pendingImageFiles.get(img.id);
            if (file) {
              const added = await uploadImage(realId, file);
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
          if (!r.ok) throw new Error(r.error ?? "Error al guardar el lote");
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
          if (file) {
            const added = await uploadImage(lote.id, file);
            imgIdMap.set(img.id, added);
          }
        }
      }
    }

    remapDocumentIds(loteIdMap, imgIdMap);
    state.synced = cloneLotes(state.lotes);
    state.pendingImageFiles.clear();
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

function showPublicacionesModal(): Promise<number | null> {
  if (activeModal !== null) return Promise.resolve(null);
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal publicaciones-modal" role="dialog" aria-modal="true">
        <h3>Publicaciones</h3>
        <p class="confirm-text">Historial de versiones publicadas. Restaurar reemplaza el borrador actual.</p>
        <div class="publicaciones-list" id="publicaciones-list">Cargando…</div>
        <div class="confirm-actions">
          <button type="button" class="btn-secondary" data-close="1">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    activeModal = overlay;
    (document.activeElement as HTMLElement | null)?.blur();

    const cleanup = (value: number | null): void => {
      overlay.remove();
      activeModal = null;
      resolve(value);
    };
    overlay.querySelector("[data-close]")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    void (async () => {
      const listEl = overlay.querySelector<HTMLElement>("#publicaciones-list");
      if (!listEl) return;
      try {
        const res = await fetch("/api/admin/lotes/publicaciones");
        const r = (await res.json()) as {
          ok: boolean;
          data?: PublicacionItem[];
          error?: string;
        };
        if (!r.ok || !r.data) throw new Error(r.error ?? "Error al cargar");
        if (r.data.length === 0) {
          listEl.innerHTML = `<p class="lote-vacio">Todavía no se ha publicado ninguna versión.</p>`;
          return;
        }
        listEl.innerHTML = r.data
          .map(
            (p, i) => `
          <div class="publicacion-row">
            <div class="publicacion-info">
              <span class="publicacion-fecha">${new Date(p.createdAt).toLocaleString("es-SV")}</span>
              <span class="publicacion-meta">${p.totalLotes} lote(s)${i === 0 ? " · actual" : ""}</span>
            </div>
            <button type="button" class="btn-secondary" data-restore="${p.id}">Restaurar</button>
          </div>`,
          )
          .join("");
        listEl.querySelectorAll<HTMLElement>("[data-restore]").forEach((btn) => {
          btn.addEventListener("click", () => cleanup(Number(btn.dataset.restore)));
        });
      } catch (err) {
        listEl.innerHTML = `<p class="form-error">${escapeHtml(err instanceof Error ? err.message : String(err))}</p>`;
      }
    })();
  });
}

async function openPublicaciones(): Promise<void> {
  const id = await showPublicacionesModal();
  if (id === null) return;
  const confirmed = await showModal({
    title: "Restaurar versión",
    message: "Se reemplazará el borrador actual por esta versión publicada. ¿Continuar?",
    defaultAction: "cancel",
    buttons: [
      { label: "Cancelar", value: "cancel", className: "btn-secondary" },
      { label: "Restaurar", value: "confirm", className: "btn-danger" },
    ],
  });
  if (confirmed === "confirm") await restaurarPublicacion(id);
}

function isPublishMenuOpen(): boolean {
  const menu = document.getElementById("publish-menu");
  return menu !== null && !menu.hidden;
}

function setPublishMenuOpen(open: boolean): void {
  const menu = document.getElementById("publish-menu");
  const toggle = document.getElementById("publish-toggle");
  if (menu) menu.hidden = !open;
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function setupPublishMenu(): void {
  const toggle = document.getElementById("publish-toggle");
  const menu = document.getElementById("publish-menu");
  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    setPublishMenuOpen(!isPublishMenuOpen());
  });
  menu?.addEventListener("click", (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>("[data-publish-action]");
    if (!item) return;
    const action = item.dataset.publishAction;
    setPublishMenuOpen(false);
    if (action === "draft") void guardarBorrador();
    else if (action === "restore") void openPublicaciones();
  });
  document.addEventListener("click", (e) => {
    if (!isPublishMenuOpen()) return;
    const group = document.getElementById("publish-group");
    if (group && !group.contains(e.target as Node)) setPublishMenuOpen(false);
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
      data?: { lotes: LoteConModelo[]; pendiente: boolean };
      error?: string;
    };
    if (!r.ok || !r.data) throw new Error(r.error ?? "Error al restaurar");
    loadDocument(r.data.lotes, { tienePublicacion: true, pendiente: r.data.pendiente });
    showFormSuccess("Versión restaurada en el borrador");
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
): void {
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
  overlayLayer = document.getElementById("overlay-layer") as unknown as SVGGElement;
  sidePanel = document.getElementById("side-panel") as HTMLElement;
  zoomDisplay = document.getElementById("zoom-display") as HTMLElement;
  planImage = document.getElementById("plan-image") as SVGGElement | null;
  createSelectionToolbar();

  state.initialView = { w: initialData.plan.anchoPx, h: initialData.plan.altoPx };
  state.view = { x: 0, y: 0, ...state.initialView };
  state.lotes = initialData.lotes;
  state.modelos = initialData.modelos;
  state.synced = cloneLotes(initialData.lotes);
  state.hasPublication = initialData.estadoPublicacion?.tienePublicacion ?? false;
  state.hasUnpublished = initialData.estadoPublicacion?.pendiente ?? false;
  commitHistory("Estado inicial");

  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode as Mode | undefined;
      if (mode) void setMode(mode);
    });
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
    void publicar();
  });
  setupPublishMenu();
  const historySelect = document.getElementById("history-select") as HTMLSelectElement | null;
  historySelect?.addEventListener("change", () => {
    goToHistory(Number(historySelect.value));
  });

  const viewSelect = document.getElementById("polygon-view") as HTMLSelectElement | null;
  if (viewSelect) {
    viewSelect.value = state.polygonView;
    viewSelect.addEventListener("change", () => {
      state.polygonView = viewSelect.value === "estandar" ? "estandar" : "disponibilidad";
      render();
    });
  }

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

  render();
  renderHistoryControls();
  updateDirtyIndicator();
}