// ============ Types ============

import type { LoteEstado, LoteConModelo } from "@features/lots/lote.types";
import type { ModeloConCaracteristicas } from "@features/catalog/modelo.types";
import type { Plano } from "@db/schema";
import {
  applyViewTransform as applySvgView,
  fitView as makeFitView,
  panTo as panView,
  zoomAtPoint as zoomViewAt,
  zoomBy as zoomViewBy,
} from "@shared/map/viewport";
import { escapeHtml } from "@shared/map/svg-utils";
import { createLotLabel, createLotPolygon } from "@shared/map/lot-renderer";
import { ESTADO_FILL, ESTADO_LABEL, ESTADO_STROKE } from "@shared/map/lot-colors";

type FilterStatus = "all" | LoteEstado;

type InitialData = {
  plan: Plano | null;
  lotes: LoteConModelo[];
  modelos: ModeloConCaracteristicas[];
  counts: {
    all: number;
    disponible: number;
    reservado: number;
    vendido: number;
  };
};

type State = {
  view: { x: number; y: number; w: number; h: number };
  initialView: { w: number; h: number };
  isPanning: boolean;
  panStart: { clientX: number; clientY: number; vbX: number; vbY: number };
  filter: { status: FilterStatus; modeloId: number | null };
  lotModalLoteId: number | null;
  contactModalLoteId: number | null;
  lotes: LoteConModelo[];
  modelos: ModeloConCaracteristicas[];
};

// ============ Constants ============

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

function formatUSD(n: number): string {
  return usdFormatter.format(n);
}

function isLoteMatching(lote: LoteConModelo): boolean {
  if (state.filter.status !== "all" && lote.estado !== state.filter.status) return false;
  if (state.filter.modeloId !== null && lote.modeloId !== state.filter.modeloId) return false;
  return true;
}

function getLoteById(id: number): LoteConModelo | undefined {
  return state.lotes.find((l) => l.id === id);
}

function getLoteBBox(lote: LoteConModelo): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
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

function renderViewTransform(): void {
  applySvgView(svg, state.view, state.initialView.w, zoomDisplay);
}

function renderLotsLayer(): void {
  while (lotsLayer.firstChild) lotsLayer.removeChild(lotsLayer.firstChild);

  for (const lote of state.lotes) {
    const polygon = createLotPolygon(lote, {
      fill: ESTADO_FILL[lote.estado],
      stroke: ESTADO_STROKE[lote.estado],
      selected: lote.id === state.lotModalLoteId,
      dimmed: !isLoteMatching(lote),
    });
    polygon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (polygon.classList.contains("dimmed")) return;
      openLotModal(lote.id);
    });
    lotsLayer.appendChild(polygon);

    const label = createLotLabel(lote);
    if (label) lotsLayer.appendChild(label);
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
  renderPillCounts();
}

function renderPillCounts(): void {
  const filtered = state.lotes.filter((l) =>
    state.filter.modeloId === null ? true : l.modeloId === state.filter.modeloId,
  );
  const counts = {
    all: filtered.length,
    disponible: filtered.filter((l) => l.estado === "disponible").length,
    reservado: filtered.filter((l) => l.estado === "reservado").length,
    vendido: filtered.filter((l) => l.estado === "vendido").length,
  };
  document.querySelectorAll<HTMLElement>("[data-status]").forEach((btn) => {
    const status = btn.dataset.status as FilterStatus | undefined;
    if (!status) return;
    const span = btn.querySelector<HTMLElement>(".pill-count");
    if (span) span.textContent = String(counts[status]);
  });
}

// ============ Render: lot modal ============

function renderLotGallery(lote: LoteConModelo, plan: Plano): void {
  while (lotModalGallery.firstChild) lotModalGallery.removeChild(lotModalGallery.firstChild);

  const images = lote.imagenes;
  if (images.length > 0) {
    renderImageGallery(lote, images);
    return;
  }

  renderLotZoom(lote, plan);
}

function renderLotZoom(lote: LoteConModelo, plan: Plano): void {
  const bbox = getLoteBBox(lote);
  const padX = Math.max(bbox.w * 0.4, 60);
  const padY = Math.max(bbox.h * 0.4, 60);
  const vbX = bbox.minX - padX;
  const vbY = bbox.minY - padY;
  const vbW = bbox.w + 2 * padX;
  const vbH = bbox.h + 2 * padY;
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgEl.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgEl.classList.add("gallery-svg");

  const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
  image.setAttribute("href", plan.imagenPath);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", String(plan.anchoPx));
  image.setAttribute("height", String(plan.altoPx));
  image.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgEl.appendChild(image);

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
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

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
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

function renderImageGallery(
  lote: LoteConModelo,
  images: LoteConModelo["imagenes"],
): void {
  let current = 0;

  const gallery = document.createElement("div");
  gallery.className = "lot-gallery";

  const viewer = document.createElement("div");
  viewer.className = "lot-gallery-viewer";

  const img = document.createElement("img");
  img.className = "lot-gallery-img";
  img.src = images[0].path;
  img.alt = `Imagen del lote ${lote.numeroLote}`;

  const counter = document.createElement("div");
  counter.className = "lot-gallery-counter";
  counter.textContent = `1 / ${images.length}`;

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "lot-gallery-nav lot-gallery-prev";
  prev.setAttribute("aria-label", "Imagen anterior");
  prev.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';

  const next = document.createElement("button");
  next.type = "button";
  next.className = "lot-gallery-nav lot-gallery-next";
  next.setAttribute("aria-label", "Imagen siguiente");
  next.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  viewer.appendChild(img);
  viewer.appendChild(counter);
  viewer.appendChild(prev);
  viewer.appendChild(next);
  gallery.appendChild(viewer);

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
  viewer.appendChild(caption);

  const thumbs = document.createElement("div");
  thumbs.className = "lot-gallery-thumbs";
  images.forEach((im, i) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "lot-gallery-thumb" + (i === 0 ? " active" : "");
    thumb.setAttribute("aria-label", `Ver imagen ${i + 1}`);
    const thumbImg = document.createElement("img");
    thumbImg.src = im.path;
    thumbImg.alt = "";
    thumb.appendChild(thumbImg);
    thumb.addEventListener("click", () => {
      current = i;
      update();
    });
    thumbs.appendChild(thumb);
  });
  gallery.appendChild(thumbs);

  lotModalGallery.appendChild(gallery);

  function update(): void {
    img.src = images[current].path;
    counter.textContent = `${current + 1} / ${images.length}`;
    thumbs.querySelectorAll<HTMLElement>(".lot-gallery-thumb").forEach((t, i) => {
      t.classList.toggle("active", i === current);
    });
  }

  prev.addEventListener("click", () => {
    current = (current - 1 + images.length) % images.length;
    update();
  });
  next.addEventListener("click", () => {
    current = (current + 1) % images.length;
    update();
  });
}

function renderLotInfo(lote: LoteConModelo): void {
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
  renderViewTransform();
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