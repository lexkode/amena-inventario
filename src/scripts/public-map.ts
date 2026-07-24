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
  lotModalLoteId: number | null;
  contactModalLoteId: number | null;
  lotes: Lote[];
  modelos: Modelo[];
};

// ============ Constants ============

const SVG_NS = "http://www.w3.org/2000/svg";

const ESTADO_FILL: Record<LoteEstado, string> = {
  disponible: "rgba(34, 197, 94, 0.7)",
  reservado: "rgba(234, 179, 8, 0.7)",
  vendido: "rgba(239, 68, 68, 0.7)",
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
  lotModalLoteId: null,
  contactModalLoteId: null,
  lotes: [],
  modelos: [],
};

let svg!: SVGSVGElement;
let lotsLayer!: SVGGElement;
let lotModal!: HTMLElement;
let lotModalBackdrop!: HTMLElement;
let lotModalGallery!: HTMLElement;
let lotModalInfo!: HTMLElement;
let contactModal!: HTMLElement;
let contactModalBackdrop!: HTMLElement;
let contactHeader!: HTMLElement;
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

function getLoteBBox(lote: Lote): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of lote.poligono) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// ============ Render: lots layer (main canvas) ============

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
    if (lote.id === state.lotModalLoteId) polygon.classList.add("selected");
    polygon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (polygon.classList.contains("dimmed")) return;
      openLotModal(lote.id);
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

// ============ Render: filter UI ============

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

// ============ Render: lot modal ============

function renderLotGallery(lote: Lote, plan: Plan): void {
  while (lotModalGallery.firstChild) lotModalGallery.removeChild(lotModalGallery.firstChild);

  const bbox = getLoteBBox(lote);
  const padX = Math.max(bbox.w * 0.4, 60);
  const padY = Math.max(bbox.h * 0.4, 60);
  const vbX = bbox.minX - padX;
  const vbY = bbox.minY - padY;
  const vbW = bbox.w + 2 * padX;
  const vbH = bbox.h + 2 * padY;
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  const svgEl = document.createElementNS(SVG_NS, "svg");
  svgEl.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgEl.classList.add("gallery-svg");

  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", plan.imagenPath);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", String(plan.anchoPx));
  image.setAttribute("height", String(plan.altoPx));
  image.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgEl.appendChild(image);

  const polygon = document.createElementNS(SVG_NS, "polygon");
  polygon.setAttribute(
    "points",
    lote.poligono.map((p) => `${p.x},${p.y}`).join(" "),
  );
  polygon.setAttribute("fill", ESTADO_FILL[lote.estado]);
  polygon.setAttribute("stroke", ESTADO_STROKE[lote.estado]);
  const strokeW = Math.max(Math.min(bbox.w, bbox.h) / 25, 6);
  polygon.setAttribute("stroke-width", String(strokeW));
  polygon.style.filter = `drop-shadow(0 0 ${Math.max(bbox.w / 12, 24)}px ${ESTADO_STROKE[lote.estado]})`;
  svgEl.appendChild(polygon);

  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", String(cx));
  label.setAttribute("y", String(cy));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("font-size", String(Math.max(Math.min(bbox.w, bbox.h) / 5, 28)));
  label.setAttribute("font-weight", "800");
  label.setAttribute("fill", "#fff");
  label.setAttribute("stroke", "#000");
  label.setAttribute("stroke-width", "2");
  label.setAttribute("paint-order", "stroke fill");
  label.style.pointerEvents = "none";
  label.textContent = lote.numeroLote;
  svgEl.appendChild(label);

  lotModalGallery.appendChild(svgEl);

  const caption = document.createElement("div");
  caption.className = "gallery-caption";
  const capLote = document.createElement("span");
  capLote.className = "gallery-caption-lote";
  capLote.textContent = lote.numeroLote;
  const capDivider = document.createElement("span");
  capDivider.className = "gallery-caption-divider";
  capDivider.textContent = "·";
  const capModelo = document.createElement("span");
  capModelo.className = "gallery-caption-modelo";
  capModelo.textContent = lote.modelo?.nombre ?? "Lote disponible";
  caption.appendChild(capLote);
  caption.appendChild(capDivider);
  caption.appendChild(capModelo);
  lotModalGallery.appendChild(caption);
}

function renderLotInfo(lote: Lote): void {
  const modelo = lote.modelo;
  const topFeatures = modelo ? modelo.caracteristicas.slice(0, 6) : [];

  lotModalInfo.innerHTML = `
    <div class="info-header">
      <p class="info-eyebrow">Lote</p>
      <h2 class="info-title" id="lot-modal-title">${escapeHtml(lote.numeroLote)}</h2>
      <span class="status-badge status-${lote.estado}">${ESTADO_LABEL[lote.estado]}</span>
    </div>
    <div class="info-body">
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
    <div class="info-footer">
      <button type="button" class="info-cta" id="lot-cta-consultar">Consultar por este Lote</button>
      <p class="info-cta-note">Te contactaremos a la brevedad.</p>
    </div>
  `;

	document.getElementById("lot-cta-consultar")?.addEventListener("click", (e) => {
		e.stopPropagation();
		openContactModal();
	});
}

function renderLotModal(): void {
  const open = state.lotModalLoteId !== null;
  lotModalBackdrop.classList.toggle("open", open);
  lotModalBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
  lotModal.setAttribute("aria-hidden", open ? "false" : "true");

  if (!open || state.lotModalLoteId === null) return;

  const lote = getLoteById(state.lotModalLoteId);
  if (!lote) {
    state.lotModalLoteId = null;
    return;
  }

  const plan = (() => {
    const dataEl = document.getElementById("map-data");
    if (!dataEl) return null;
    try {
      return (JSON.parse(dataEl.textContent || "{}") as InitialData).plan;
    } catch {
      return null;
    }
  })();

  if (plan) renderLotGallery(lote, plan);
  renderLotInfo(lote);
}

// ============ Render: contact modal ============

function renderContactModal(): void {
  const open = state.contactModalLoteId !== null;
  contactModalBackdrop.classList.toggle("open", open);
  contactModalBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
  contactModal.setAttribute("aria-hidden", open ? "false" : "true");

  if (!open || state.contactModalLoteId === null) {
    contactHeader.innerHTML = "";
    return;
  }

  const lote = getLoteById(state.contactModalLoteId);
  if (!lote) {
    contactHeader.innerHTML = "";
    return;
  }

  const modeloNombre = lote.modelo?.nombre;
  const separator = '<span class="contact-header-title-divider">·</span>';
  const modeloPart = modeloNombre
    ? `${separator}<span class="contact-header-title-modelo">${escapeHtml(modeloNombre)}</span>`
    : "";

  contactHeader.innerHTML = `
    <p class="contact-header-eyebrow">Formulario de contacto</p>
    <h2 class="contact-header-title">
      Consulta sobre <strong>${escapeHtml(lote.numeroLote)}</strong>${modeloPart}
    </h2>
  `;
}

// ============ Render entry ============

function render(): void {
  applyViewTransform();
  renderLotsLayer();
  renderFilterUI();
  renderLotModal();
  renderContactModal();
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

function openLotModal(id: number): void {
  state.lotModalLoteId = id;
  state.contactModalLoteId = null;
  render();
}

function closeLotModal(): void {
  state.lotModalLoteId = null;
  state.contactModalLoteId = null;
  render();
}

function openContactModal(): void {
  if (state.lotModalLoteId === null) return;
  state.contactModalLoteId = state.lotModalLoteId;
  render();
}

function closeContactModal(): void {
  state.contactModalLoteId = null;
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

	document.getElementById("lot-modal-close")?.addEventListener("click", closeLotModal);
	lotModalBackdrop.addEventListener("click", (e) => {
		if (lotModal.contains(e.target as Node)) return;
		closeLotModal();
	});

  document.getElementById("contact-modal-close")?.addEventListener("click", closeContactModal);
  contactModalBackdrop.addEventListener("click", (e) => {
    if (contactModal.contains(e.target as Node)) return;
    closeContactModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (state.contactModalLoteId !== null) {
      closeContactModal();
    } else if (state.lotModalLoteId !== null) {
      closeLotModal();
    }
  });

  svg.addEventListener("mousedown", handleSvgMouseDown);
  svg.addEventListener("wheel", handleWheel, { passive: false });
  svg.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);

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
  lotModal = document.getElementById("lot-modal") as HTMLElement;
  lotModalBackdrop = document.getElementById("lot-modal-backdrop") as HTMLElement;
  lotModalGallery = document.getElementById("lot-modal-gallery") as HTMLElement;
  lotModalInfo = document.getElementById("lot-modal-info") as HTMLElement;
  contactModal = document.getElementById("contact-modal") as HTMLElement;
  contactModalBackdrop = document.getElementById("contact-modal-backdrop") as HTMLElement;
  contactHeader = document.getElementById("contact-header") as HTMLElement;
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
