// ============ Types ============

type Punto = { x: number; y: number };
type LoteEstado = "disponible" | "reservado" | "vendido";
type Mode = "view" | "draw" | "edit";

type Modelo = {
  id: number;
  nombre: string;
  tipo: "casa" | "apartamento";
  precioBase: number;
  terrenoM2: number;
  construccionM2: number;
  habitaciones: number;
  banos: number;
  parqueos: number;
  dimensionesLote: string | null;
  caracteristicas: string[];
  orden: number;
  createdAt: number;
};

type Lote = {
  id: number;
  numeroLote: string;
  estado: LoteEstado;
  poligono: Punto[];
  modeloId: number | null;
  modelo: Modelo | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
  createdAt: number;
  updatedAt: number;
};

type NewLote = {
  numeroLote: string;
  estado: LoteEstado;
  poligono: Punto[];
  modeloId: number | null;
  terrenoM2: number | null;
  dimensionesLote: string | null;
};

type State = {
  mode: Mode;
  view: { x: number; y: number; w: number; h: number };
  initialView: { w: number; h: number };
  isPanning: boolean;
  panStart: { clientX: number; clientY: number; vbX: number; vbY: number };
  currentPolygon: Punto[];
  pendingNewLote: NewLote | null;
  selectedLoteId: number | null;
  selectedVertex: { loteId: number; index: number } | null;
  draggingVertex: { loteId: number; index: number } | null;
  lotes: Lote[];
  modelos: Modelo[];
};

type InitialData = {
  plan: {
    id: number;
    nombre: string;
    imagenPath: string;
    anchoPx: number;
    altoPx: number;
  } | null;
  lotes: Lote[];
  modelos: Modelo[];
};

// ============ State ============

const state: State = {
  mode: "view",
  view: { x: 0, y: 0, w: 1, h: 1 },
  initialView: { w: 1, h: 1 },
  isPanning: false,
  panStart: { clientX: 0, clientY: 0, vbX: 0, vbY: 0 },
  currentPolygon: [],
  pendingNewLote: null,
  selectedLoteId: null,
  selectedVertex: null,
  draggingVertex: null,
  lotes: [],
  modelos: [],
};

const SVG_NS = "http://www.w3.org/2000/svg";
const VERTEX_RADIUS = 6; // radio unificado (mitad del original más grande)
const VERTEX_STROKE = 2; // borde unificado
let svg!: SVGSVGElement;
let lotsLayer!: SVGGElement;
let overlayLayer!: SVGGElement;
let sidePanel!: HTMLElement;
let zoomDisplay!: HTMLElement;
let initialData: InitialData;

// ============ Helpers ============

function clientToSvg(clientX: number, clientY: number): Punto {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

function getEstadoFill(estado: LoteEstado): string {
  return {
    disponible: "rgba(34, 197, 94, 0.7)",
    reservado: "rgba(234, 179, 8, 0.7)",
    vendido: "rgba(239, 68, 68, 0.7)",
  }[estado];
}

function getEstadoStroke(estado: LoteEstado): string {
  return {
    disponible: "#16a34a",
    reservado: "#ca8a04",
    vendido: "#dc2626",
  }[estado];
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

// ============ Render ============

function applyViewTransform(): void {
  const { x, y, w, h } = state.view;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  const zoom = state.initialView.w / w;
  if (zoomDisplay) zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
}

function updateCursor(): void {
  if (state.isPanning) {
    svg.style.cursor = "grabbing";
  } else if (state.mode === "view") {
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
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute(
      "points",
      lote.poligono.map((p) => `${p.x},${p.y}`).join(" "),
    );
    polygon.setAttribute("fill", getEstadoFill(lote.estado));
    polygon.setAttribute("stroke", getEstadoStroke(lote.estado));
    polygon.setAttribute(
      "stroke-width",
      lote.id === state.selectedLoteId ? "3" : "2",
    );
    polygon.setAttribute(
      "stroke-opacity",
      lote.id === state.selectedLoteId ? "0.5" : "1",
    );
    polygon.setAttribute("data-lote-id", String(lote.id));
    polygon.classList.add("lote-polygon");
    if (lote.id === state.selectedLoteId) {
      polygon.classList.add("selected");
    }
    polygon.style.cursor = state.mode === "edit" ? "pointer" : "default";
    polygon.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.shiftKey) return;
      e.stopPropagation();
      if (state.mode === "edit") {
        selectLote(lote.id);
      }
    });
    lotsLayer.appendChild(polygon);

    if (lote.poligono.length > 0) {
      const cx =
        lote.poligono.reduce((s, p) => s + p.x, 0) / lote.poligono.length;
      const cy =
        lote.poligono.reduce((s, p) => s + p.y, 0) / lote.poligono.length;
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(cx));
      text.setAttribute("y", String(cy));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#fff");
      text.setAttribute("stroke", "#000");
      text.setAttribute("stroke-width", "0.5");
      text.setAttribute("paint-order", "stroke fill");
      text.setAttribute("font-size", "22");
      text.setAttribute("font-weight", "700");
      text.setAttribute("pointer-events", "none");
      text.textContent = lote.numeroLote;
      lotsLayer.appendChild(text);
    }
  }
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
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", String(VERTEX_RADIUS));
      c.setAttribute("fill", "#fff");
      c.setAttribute("stroke", "#dc832f");
      c.setAttribute("stroke-width", String(VERTEX_STROKE));
      overlayLayer.appendChild(c);
    }
  }

  if (state.mode === "edit" && state.selectedLoteId !== null) {
    const lote = state.lotes.find((l) => l.id === state.selectedLoteId);
    if (lote) {
      for (let i = 0; i < lote.poligono.length; i++) {
        const p = lote.poligono[i];
        const handle = document.createElementNS(SVG_NS, "circle");
        handle.setAttribute("cx", String(p.x));
        handle.setAttribute("cy", String(p.y));
        handle.setAttribute("r", String(VERTEX_RADIUS));
        handle.setAttribute("fill", "#fff");
        handle.setAttribute("stroke", "#dc832f");
        handle.setAttribute("stroke-width", String(VERTEX_STROKE));
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

  sidePanel.innerHTML = `
    <h2 style="margin-top:0">Editor de Plano</h2>
    <p style="color:#5a7682;font-size:.9rem">Selecciona un modo para comenzar:</p>
    <ul style="color:#5a7682;font-size:.85rem;line-height:1.7;padding-left:1.2rem;margin-top:.75rem">
      <li><strong>Ver</strong>: pan y zoom del plano</li>
      <li><strong>Dibujar</strong>: clic para crear un nuevo lote</li>
      <li><strong>Editar</strong>: clic en un lote existente para modificarlo</li>
    </ul>
    <p style="color:#5a7682;font-size:.8rem;margin-top:1rem">Tip: <kbd>Shift</kbd>+arrastrar = panear en cualquier modo. Rueda = zoom. <kbd>Esc</kbd> = cancelar.</p>
  `;
}

function renderLotForm(lote: Lote | NewLote, isNew: boolean): void {
  const modelosOptions = state.modelos
    .filter((m) => m.tipo === "casa")
    .map(
      (m) =>
        `<option value="${m.id}" ${m.id === lote.modeloId ? "selected" : ""}>${escapeHtml(m.nombre)}</option>`,
    )
    .join("");

  const id = isNew ? null : (lote as Lote).id;
  const title = isNew ? "Nuevo lote" : `Lote #${id}`;
  const numeroLote = isNew ? "" : (lote as Lote).numeroLote;
  const dimensionesLote =
    lote.dimensionesLote === null || lote.dimensionesLote === undefined
      ? ""
      : lote.dimensionesLote;

  sidePanel.innerHTML = `
    <h2 style="margin-top:0">${title}</h2>
    <form id="lot-form" autocomplete="off">
      <div class="field">
        <label for="numeroLote">Número de lote</label>
        <input id="numeroLote" type="text" required maxlength="64" value="${escapeHtml(numeroLote)}" />
      </div>
      <div class="field">
        <label for="estado">Estado</label>
        <select id="estado">
          <option value="disponible" ${lote.estado === "disponible" ? "selected" : ""}>Disponible</option>
          <option value="reservado" ${lote.estado === "reservado" ? "selected" : ""}>Reservado</option>
          <option value="vendido" ${lote.estado === "vendido" ? "selected" : ""}>Vendido</option>
        </select>
      </div>
      <div class="field">
        <label for="modeloId">Modelo de casa</label>
        <select id="modeloId">
          <option value="" ${lote.modeloId === null ? "selected" : ""}>— Sin modelo —</option>
          ${modelosOptions}
        </select>
      </div>
      <div class="field">
        <label for="terrenoM2">Terreno (m²)</label>
        <input id="terrenoM2" type="number" step="0.01" min="0" value="${lote.terrenoM2 ?? ""}" />
      </div>
      <div class="field">
        <label for="dimensionesLote">Dimensiones del lote</label>
        <input id="dimensionesLote" type="text" maxlength="64" value="${escapeHtml(dimensionesLote)}" placeholder="ej. 15m x 7m" />
      </div>
      <div class="actions">
        <button type="submit" class="btn-primary">${isNew ? "Crear lote" : "Guardar cambios"}</button>
        ${!isNew ? '<button type="button" id="delete-lote" class="btn-danger">Eliminar</button>' : ""}
        ${isNew ? '<button type="button" id="cancel-new" class="btn-secondary">Cancelar</button>' : ""}
      </div>
      <p id="form-error" class="form-error" hidden></p>
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
    document.getElementById("delete-lote")?.addEventListener("click", () => {
      if (confirm("¿Eliminar este lote? Esta acción no se puede deshacer.")) {
        void deleteLote();
      }
    });
  }

  const modeloSelect = document.getElementById("modeloId") as HTMLSelectElement | null;
  const terrenoInput = document.getElementById("terrenoM2") as HTMLInputElement | null;
  const dimensionesInput = document.getElementById("dimensionesLote") as HTMLInputElement | null;
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

function renderModeButtons(): void {
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
}

function render(): void {
  applyViewTransform();
  updateCursor();
  renderLotsLayer();
  renderOverlayLayer();
  renderSidePanel();
  renderModeButtons();
}

// ============ Mode & selection ============

function setMode(mode: Mode): void {
  state.mode = mode;
  state.currentPolygon = [];
  state.pendingNewLote = null;
  state.selectedVertex = null;
  if (mode !== "edit") {
    state.selectedLoteId = null;
  }
  render();
}

function selectLote(id: number | null): void {
  state.selectedLoteId = id;
  state.selectedVertex = null;
  state.pendingNewLote = null;
  state.currentPolygon = [];
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
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const scale = ctm.a;
  state.view.x = state.panStart.vbX - (clientX - state.panStart.clientX) / scale;
  state.view.y = state.panStart.vbY - (clientY - state.panStart.clientY) / scale;
  applyViewTransform();
}

function zoomAtPoint(factor: number, clientX: number, clientY: number): void {
  const newW = state.view.w * factor;
  const newH = state.view.h * factor;
  if (newW > state.initialView.w || newH > state.initialView.h) {
    state.view = { x: 0, y: 0, ...state.initialView };
    applyViewTransform();
    return;
  }
  const p0 = clientToSvg(clientX, clientY);
  state.view = { ...state.view, w: newW, h: newH };
  applyViewTransform();
  const p1 = clientToSvg(clientX, clientY);
  state.view.x += p0.x - p1.x;
  state.view.y += p0.y - p1.y;
  applyViewTransform();
}

function zoomBy(factor: number): void {
  const rect = svg.getBoundingClientRect();
  zoomAtPoint(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function fitView(): void {
  state.view = { x: 0, y: 0, ...state.initialView };
  applyViewTransform();
}

// ============ Event handlers ============

function handleSvgMouseDown(e: MouseEvent): void {
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

  if (state.mode === "view") {
    startPan(e.clientX, e.clientY);
  } else if (state.mode === "draw") {
    if (state.pendingNewLote !== null) return;
    const p = clientToSvg(e.clientX, e.clientY);
    state.currentPolygon.push(p);
    render();
  } else if (state.mode === "edit") {
    selectLote(null);
  }
}

function handleDocumentMouseMove(e: MouseEvent): void {
  if (state.isPanning) {
    panTo(e.clientX, e.clientY);
  } else if (state.draggingVertex) {
    const p = clientToSvg(e.clientX, e.clientY);
    const lote = state.lotes.find((l) => l.id === state.draggingVertex!.loteId);
    if (lote) {
      lote.poligono[state.draggingVertex.index] = p;
      render();
    }
  }
}

function handleDocumentMouseUp(): void {
  if (state.isPanning) {
    state.isPanning = false;
    updateCursor();
  }
  if (state.draggingVertex) {
    state.draggingVertex = null;
  }
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.1;
  zoomAtPoint(factor, e.clientX, e.clientY);
}

function handleKeyDown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

  if (e.key === "Escape") {
    if (state.pendingNewLote !== null) {
      state.pendingNewLote = null;
      state.currentPolygon = [];
    } else if (state.currentPolygon.length > 0) {
      state.currentPolygon = [];
    } else if (state.selectedLoteId !== null) {
      state.selectedLoteId = null;
      state.selectedVertex = null;
    }
    render();
  } else if ((e.key === "Delete" || e.key === "Backspace") && state.selectedLoteId !== null && state.mode === "edit") {
    if (confirm("¿Eliminar este lote?")) void deleteLote();
  } else if (state.selectedVertex !== null && state.mode === "edit") {
    const lote = state.lotes.find((l) => l.id === state.selectedVertex!.loteId);
    if (lote) {
      const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      if (dx !== 0 || dy !== 0) {
        const idx = state.selectedVertex!.index;
        const p = lote.poligono[idx];
        lote.poligono[idx] = { x: p.x + dx, y: p.y + dy };
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

async function saveLote(): Promise<void> {
  clearFormError();
  const data = getFormData();
  if (!data) return;

  const isNew = state.pendingNewLote !== null;
  const poligono = isNew
    ? state.pendingNewLote!.poligono
    : (state.lotes.find((l) => l.id === state.selectedLoteId)?.poligono ?? []);

  if (poligono.length < 3) {
    showFormError("El polígono debe tener al menos 3 puntos");
    return;
  }

  const body = { ...data, poligono };
  const url = isNew ? "/api/admin/lotes" : `/api/admin/lotes/${state.selectedLoteId}`;
  const method = isNew ? "POST" : "PATCH";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { ok: boolean; data?: Lote; error?: string };
    if (!result.ok || !result.data) {
      showFormError(result.error ?? "Error desconocido");
      return;
    }
    if (isNew) {
      state.lotes.push(result.data);
      state.selectedLoteId = result.data.id;
    } else {
      const idx = state.lotes.findIndex((l) => l.id === result.data!.id);
      if (idx >= 0) state.lotes[idx] = result.data;
    }
    state.pendingNewLote = null;
    render();
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
  }
}

async function deleteLote(): Promise<void> {
  if (state.selectedLoteId === null) return;
  const id = state.selectedLoteId;
  try {
    const response = await fetch(`/api/admin/lotes/${id}`, { method: "DELETE" });
    const result = (await response.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      showFormError(result.error ?? "Error al eliminar");
      return;
    }
    state.lotes = state.lotes.filter((l) => l.id !== id);
    state.selectedLoteId = null;
    render();
  } catch (err) {
    showFormError(err instanceof Error ? err.message : String(err));
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

  state.initialView = { w: initialData.plan.anchoPx, h: initialData.plan.altoPx };
  state.view = { x: 0, y: 0, ...state.initialView };
  state.lotes = initialData.lotes;
  state.modelos = initialData.modelos;

  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode as Mode | undefined;
      if (mode) setMode(mode);
    });
  });
  document.getElementById("zoom-in")?.addEventListener("click", () => zoomBy(0.8));
  document.getElementById("zoom-out")?.addEventListener("click", () => zoomBy(1.25));
  document.getElementById("zoom-fit")?.addEventListener("click", () => fitView());

  svg.addEventListener("mousedown", handleSvgMouseDown);
  svg.addEventListener("wheel", handleWheel, { passive: false });
  svg.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);
  document.addEventListener("keydown", handleKeyDown);

  render();
}
