// ============ Types ============

type Punto = { x: number; y: number };
type LoteEstado = "disponible" | "reservado" | "vendido";
type FilterStatus = "all" | LoteEstado;

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

type Plan = {
  id: number;
  nombre: string;
  imagenPath: string;
  anchoPx: number;
  altoPx: number;
};

type InitialData = {
  plan: Plan | null;
  lotes: Lote[];
  modelos: Modelo[];
};

type State = {
  view: { x: number; y: number; w: number; h: number };
  initialView: { w: number; h: number };
  isPanning: boolean;
  panStart: { clientX: number; clientY: number; vbX: number; vbY: number };
  filter: { status: FilterStatus; modeloId: number | null };
  selectedLoteId: number | null;
  lotes: Lote[];
  modelos: Modelo[];
};

// ============ Constants ============

const SVG_NS = "http://www.w3.org/2000/svg";
const CONTACT_EMAIL = "ventas@residencialamena.com";

const ESTADO_FILL: Record<LoteEstado, string> = {
  disponible: "rgba(34, 197, 94, 0.45)",
  reservado: "rgba(234, 179, 8, 0.45)",
  vendido: "rgba(239, 68, 68, 0.45)",
};

const ESTADO_STROKE: Record<LoteEstado, string> = {
  disponible: "#16a34a",
  reservado: "#ca8a04",
  vendido: "#dc2626",
};

const ESTADO_LABEL: Record<LoteEstado, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// ============ State ============

const state: State = {
  view: { x: 0, y: 0, w: 1, h: 1 },
  initialView: { w: 1, h: 1 },
  isPanning: false,
  panStart: { clientX: 0, clientY: 0, vbX: 0, vbY: 0 },
  filter: { status: "all", modeloId: null },
  selectedLoteId: null,
  lotes: [],
  modelos: [],
};

let svg!: SVGSVGElement;
let lotsLayer!: SVGGElement;
let drawer!: HTMLElement;
let drawerContent!: HTMLElement;
let drawerBackdrop!: HTMLElement;
let zoomDisplay!: HTMLElement;
let modeloFilter!: HTMLSelectElement;

let touchStart: { x: number; y: number } | null = null;
let touchMoved = false;
let suppressNextClick = false;

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function formatUSD(n: number): string {
  return usdFormatter.format(n);
}

function isLoteMatching(lote: Lote): boolean {
  if (state.filter.status !== "all" && lote.estado !== state.filter.status) return false;
  if (state.filter.modeloId !== null && lote.modeloId !== state.filter.modeloId) return false;
  return true;
}

function getLoteById(id: number): Lote | undefined {
  return state.lotes.find((l) => l.id === id);
}

// ============ Render ============

function applyViewTransform(): void {
  const { x, y, w, h } = state.view;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  if (zoomDisplay) {
    const zoom = state.initialView.w / w;
    zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
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
    polygon.setAttribute("fill", ESTADO_FILL[lote.estado]);
    polygon.setAttribute("stroke", ESTADO_STROKE[lote.estado]);
    polygon.setAttribute("stroke-width", "2");
    polygon.setAttribute("data-lote-id", String(lote.id));
    polygon.classList.add("lote-polygon", `lote-${lote.estado}`);
    if (!isLoteMatching(lote)) polygon.classList.add("dimmed");
    if (lote.id === state.selectedLoteId) polygon.classList.add("selected");
    polygon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (polygon.classList.contains("dimmed")) return;
      selectLote(lote.id);
    });
    lotsLayer.appendChild(polygon);

    if (lote.poligono.length > 0) {
      const cx = lote.poligono.reduce((s, p) => s + p.x, 0) / lote.poligono.length;
      const cy = lote.poligono.reduce((s, p) => s + p.y, 0) / lote.poligono.length;
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(cx));
      text.setAttribute("y", String(cy));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#fff");
      text.setAttribute("stroke", "#000");
      text.setAttribute("stroke-width", "0.6");
      text.setAttribute("paint-order", "stroke fill");
      text.setAttribute("font-size", "20");
      text.setAttribute("font-weight", "700");
      text.setAttribute("pointer-events", "none");
      text.textContent = lote.numeroLote;
      lotsLayer.appendChild(text);
    }
  }
}

function populateModeloFilter(): void {
  if (!modeloFilter) return;
  while (modeloFilter.options.length > 1) modeloFilter.remove(1);
  for (const m of state.modelos) {
    const opt = document.createElement("option");
    opt.value = String(m.id);
    opt.textContent = m.nombre;
    modeloFilter.appendChild(opt);
  }
  modeloFilter.value = state.filter.modeloId === null ? "" : String(state.filter.modeloId);
}

function renderFilterUI(): void {
  document.querySelectorAll<HTMLElement>("[data-status]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.status === state.filter.status);
  });
  if (modeloFilter) {
    modeloFilter.value = state.filter.modeloId === null ? "" : String(state.filter.modeloId);
  }
}

function renderDrawer(): void {
  const open = state.selectedLoteId !== null;
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  drawerBackdrop.classList.toggle("open", open);
  drawerBackdrop.setAttribute("aria-hidden", open ? "false" : "true");

  if (!open || state.selectedLoteId === null) {
    drawerContent.innerHTML = "";
    return;
  }

  const lote = getLoteById(state.selectedLoteId);
  if (!lote) {
    drawerContent.innerHTML = "";
    return;
  }

  const modelo = lote.modelo;
  const topFeatures = modelo ? modelo.caracteristicas.slice(0, 6) : [];
  const subject = encodeURIComponent(`Consulta sobre Lote ${lote.numeroLote} — Residencial Amena`);
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}`;

  drawerContent.innerHTML = `
    <div class="drawer-header">
      <div>
        <p class="drawer-eyebrow">Lote</p>
        <h2 class="drawer-title">${escapeHtml(lote.numeroLote)}</h2>
        <span class="status-badge status-${lote.estado}">${ESTADO_LABEL[lote.estado]}</span>
      </div>
    </div>
    <div class="drawer-body">
      <dl class="lot-specs">
        ${lote.terrenoM2 !== null
          ? `<div><dt>Terreno</dt><dd>${lote.terrenoM2} m²</dd></div>`
          : ""}
        ${lote.dimensionesLote
          ? `<div><dt>Dimensiones</dt><dd>${escapeHtml(lote.dimensionesLote)}</dd></div>`
          : ""}
        <div><dt>Estado</dt><dd>${ESTADO_LABEL[lote.estado]}</dd></div>
      </dl>

      ${modelo
        ? `
        <div class="modelo-block">
          <p class="modelo-eyebrow">Modelo de casa</p>
          <h3>${escapeHtml(modelo.nombre)}</h3>
          <p class="modelo-price">${formatUSD(modelo.precioBase)}</p>
          <dl class="modelo-specs">
            <div><dt>Construcción</dt><dd>${modelo.construccionM2} m²</dd></div>
            <div><dt>Habitaciones</dt><dd>${modelo.habitaciones}</dd></div>
            <div><dt>Baños</dt><dd>${modelo.banos}</dd></div>
            <div><dt>Parqueos</dt><dd>${modelo.parqueos}</dd></div>
          </dl>
          ${topFeatures.length > 0
            ? `
            <p class="modelo-eyebrow">Características destacadas</p>
            <ul class="features">
              ${topFeatures.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
          `
            : ""}
        </div>
        `
        : `
        <div class="modelo-block muted">
          <p>Este lote aún no tiene un modelo de casa asignado.</p>
        </div>
        `}
    </div>
    <div class="drawer-footer">
      <a class="cta-button" href="${mailto}">Más información</a>
      <p class="drawer-note">Te contactaremos a la brevedad.</p>
    </div>
  `;
}

function render(): void {
  applyViewTransform();
  renderLotsLayer();
  renderFilterUI();
  renderDrawer();
}

// ============ Actions ============

function setFilterStatus(s: FilterStatus): void {
  state.filter.status = s;
  render();
}

function setFilterModeloId(id: number | null): void {
  state.filter.modeloId = id;
  render();
}

function selectLote(id: number | null): void {
  state.selectedLoteId = id;
  render();
}

function closeDrawer(): void {
  state.selectedLoteId = null;
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
  const p0 = clientToSvg(clientX, clientY);
  state.view = {
    ...state.view,
    w: state.view.w * factor,
    h: state.view.h * factor,
  };
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

function setupEventListeners(): void {
  document.querySelectorAll<HTMLElement>("[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.status as FilterStatus | undefined;
      if (s) setFilterStatus(s);
    });
  });

  modeloFilter?.addEventListener("change", () => {
    const value = modeloFilter.value;
    setFilterModeloId(value ? Number(value) : null);
  });

  document.getElementById("zoom-in")?.addEventListener("click", () => zoomBy(0.8));
  document.getElementById("zoom-out")?.addEventListener("click", () => zoomBy(1.25));
  document.getElementById("zoom-fit")?.addEventListener("click", () => fitView());

  document.getElementById("drawer-close")?.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.selectedLoteId !== null) {
      closeDrawer();
    }
  });

  svg.addEventListener("mousedown", handleSvgMouseDown);
  svg.addEventListener("wheel", handleWheel, { passive: false });
  svg.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);

  // Touch support
  svg.addEventListener("touchstart", handleTouchStart, { passive: true });
  svg.addEventListener("touchmove", handleTouchMove, { passive: false });
  svg.addEventListener("touchend", handleTouchEnd);
  svg.addEventListener("click", () => {
    if (suppressNextClick) {
      suppressNextClick = false;
    }
  });
}

function handleSvgMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  startPan(e.clientX, e.clientY);
}

function handleDocumentMouseMove(e: MouseEvent): void {
  if (state.isPanning) {
    panTo(e.clientX, e.clientY);
  }
}

function handleDocumentMouseUp(): void {
  if (state.isPanning) {
    state.isPanning = false;
    svg.style.cursor = "grab";
  }
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.1;
  zoomAtPoint(factor, e.clientX, e.clientY);
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
  touchMoved = false;
  startPan(t.clientX, t.clientY);
}

function handleTouchMove(e: TouchEvent): void {
  if (e.touches.length !== 1 || !touchStart) return;
  e.preventDefault();
  const t = e.touches[0];
  if (Math.abs(t.clientX - touchStart.x) > 4 || Math.abs(t.clientY - touchStart.y) > 4) {
    touchMoved = true;
  }
  if (touchMoved) panTo(t.clientX, t.clientY);
}

function handleTouchEnd(): void {
  if (touchMoved) suppressNextClick = true;
  touchStart = null;
  if (state.isPanning) {
    state.isPanning = false;
    svg.style.cursor = "grab";
  }
}

// ============ Init ============

export function initPublicMap(): void {
  const dataEl = document.getElementById("map-data");
  if (!dataEl) return;
  let initialData: InitialData;
  try {
    initialData = JSON.parse(dataEl.textContent || "{}") as InitialData;
  } catch {
    console.error("public-map: invalid initial data");
    return;
  }
  if (!initialData.plan) return;

  svg = document.getElementById("canvas") as unknown as SVGSVGElement;
  lotsLayer = document.getElementById("lots-layer") as unknown as SVGGElement;
  drawer = document.getElementById("drawer") as HTMLElement;
  drawerContent = document.getElementById("drawer-content") as HTMLElement;
  drawerBackdrop = document.getElementById("drawer-backdrop") as HTMLElement;
  zoomDisplay = document.getElementById("zoom-display") as HTMLElement;
  modeloFilter = document.getElementById("modelo-filter") as HTMLSelectElement;

  state.initialView = { w: initialData.plan.anchoPx, h: initialData.plan.altoPx };
  state.view = { x: 0, y: 0, ...state.initialView };
  state.lotes = initialData.lotes;
  state.modelos = initialData.modelos;

  populateModeloFilter();
  setupEventListeners();
  render();
}
