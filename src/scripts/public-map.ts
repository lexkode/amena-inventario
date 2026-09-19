// ============ Types ============

import type { LoteEstado, LoteConModelo } from "@features/lots/lote.types";
import type { ModeloConCaracteristicas } from "@features/catalog/modelo.types";
import type { PuntoInteres } from "@features/points/punto.types";
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
import { puntoMarkerRadius } from "@shared/map/punto-marker";

type FilterStatus = "all" | LoteEstado;

type InitialData = {
  plan: Plano | null;
  lotes: LoteConModelo[];
  puntos: PuntoInteres[];
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
  puntoModalId: number | null;
  lotes: LoteConModelo[];
  puntos: PuntoInteres[];
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
  puntoModalId: null,
  lotes: [],
  puntos: [],
  modelos: [],
};

let svg!: SVGSVGElement;
let lotsLayer!: SVGGElement;
let puntosLayer!: SVGGElement;
let lotModal!: HTMLElement;
let lotModalBackdrop!: HTMLElement;
let lotModalGallery!: HTMLElement;
let lotModalInfo!: HTMLElement;
let contactModal!: HTMLElement;
let contactModalBackdrop!: HTMLElement;
let contactHeader!: HTMLElement;
let puntoModal!: HTMLElement;
let puntoModalBackdrop!: HTMLElement;
let puntoModalGallery!: HTMLElement;
let puntoModalInfo!: HTMLElement;
let zoomDisplay!: HTMLInputElement;
let modeloFilter!: HTMLSelectElement;
let filterResetBtn!: HTMLButtonElement;
let filterResetSlot!: HTMLElement;

let planAncho = 1;
let planAlto = 1;

let touchStart: { x: number; y: number } | null = null;
let touchMoved = false;
let suppressNextClick = false;
let pinchDist = 0;

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

// ============ Render: points of interest ============

function renderPuntosLayer(): void {
  while (puntosLayer.firstChild) puntosLayer.removeChild(puntosLayer.firstChild);

  const r = puntoMarkerRadius(planAncho, planAlto);
  for (const punto of state.puntos) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "punto-marker");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(punto.x));
    circle.setAttribute("cy", String(punto.y));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "var(--c-accent)");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", String(r * 0.22));
    group.appendChild(circle);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(punto.x));
    dot.setAttribute("cy", String(punto.y));
    dot.setAttribute("r", String(r * 0.3));
    dot.setAttribute("fill", "#ffffff");
    group.appendChild(dot);

    group.addEventListener("click", (e) => {
      e.stopPropagation();
      openPuntoModal(punto.id);
    });
    puntosLayer.appendChild(group);
  }
}

function renderPuntoGallery(punto: PuntoInteres): void {
  while (puntoModalGallery.firstChild) puntoModalGallery.removeChild(puntoModalGallery.firstChild);

  if (punto.imagenes.length === 0) {
    const galleryEmpty = document.createElement("div");
    galleryEmpty.className = "lot-gallery";
    const placeholder = document.createElement("div");
    placeholder.className = "poi-placeholder";
    placeholder.textContent = punto.nombre;
    galleryEmpty.appendChild(placeholder);
    puntoModalGallery.appendChild(galleryEmpty);
    return;
  }

  let current = 0;
  const gallery = document.createElement("div");
  gallery.className = "lot-gallery";

  const viewer = document.createElement("div");
  viewer.className = "lot-gallery-viewer";

  const img = document.createElement("img");
  img.className = "lot-gallery-img";
  img.src = punto.imagenes[0].path;
  img.alt = punto.nombre;

  const counter = document.createElement("div");
  counter.className = "lot-gallery-counter";
  counter.textContent = `1 / ${punto.imagenes.length}`;

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

  const update = (): void => {
    img.src = punto.imagenes[current].path;
    counter.textContent = `${current + 1} / ${punto.imagenes.length}`;
    thumbs.querySelectorAll<HTMLElement>(".lot-gallery-thumb").forEach((t, i) => {
      t.classList.toggle("active", i === current);
    });
  };

  prev.addEventListener("click", () => {
    current = (current - 1 + punto.imagenes.length) % punto.imagenes.length;
    update();
  });
  next.addEventListener("click", () => {
    current = (current + 1) % punto.imagenes.length;
    update();
  });

  const thumbs = document.createElement("div");
  thumbs.className = "lot-gallery-thumbs";
  punto.imagenes.forEach((im, i) => {
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
  puntoModalGallery.appendChild(gallery);
}

function renderPuntoInfo(punto: PuntoInteres): void {
  const info = punto.informacion.trim();
  puntoModalInfo.innerHTML = `
    <div class="info-scroll">
      <div class="info-header">
        <div class="info-title-row">
          <h2 class="info-title" id="punto-modal-title">${escapeHtml(punto.nombre)}</h2>
        </div>
        <p class="info-model-name muted">Punto de interés</p>
      </div>
      <div class="info-body">
        ${info ? `<p class="poi-info-text">${escapeHtml(info)}</p>` : `<p class="poi-info-text muted">Sin información adicional.</p>`}
      </div>
    </div>
  `;
}

function renderPuntoModal(): void {
  const open = state.puntoModalId !== null;
  puntoModalBackdrop.classList.toggle("open", open);
  puntoModalBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
  puntoModal.setAttribute("aria-hidden", open ? "false" : "true");

  if (!open || state.puntoModalId === null) return;

  const punto = state.puntos.find((p) => p.id === state.puntoModalId);
  if (!punto) {
    state.puntoModalId = null;
    return;
  }
  renderPuntoGallery(punto);
  renderPuntoInfo(punto);
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
  const hasActiveFilters =
    state.filter.status !== "all" || state.filter.modeloId !== null;
  if (filterResetBtn) filterResetBtn.disabled = !hasActiveFilters;
  if (filterResetSlot) {
    filterResetSlot.classList.toggle("collapsed", !hasActiveFilters);
  }
  svg.classList.toggle("has-active-filters", hasActiveFilters);
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
    <div class="info-scroll">
    <div class="info-header">
      <span class="status-badge status-${lote.estado}">${ESTADO_LABEL[lote.estado]}</span>
      <h2 class="info-title" id="lot-modal-title">Lote ${escapeHtml(lote.numeroLote)}${
        modelo
          ? ` <span class="info-model-name">${escapeHtml(modelo.nombre)}</span>`
          : ` <span class="info-model-name muted">Sin modelo de casa asignado</span>`
      }</h2>
      ${modelo ? `<p class="info-model-price">${formatUSD(modelo.precioBase)}</p>` : ""}
    </div>
    <div class="info-body">
      <dl class="lot-specs">
        <div class="spec"><dt>Terreno</dt><dd>${lote.terrenoM2 !== null ? `${lote.terrenoM2} m²` : "—"}</dd></div>
        <div class="spec"><dt>Dimensiones</dt><dd>${lote.dimensionesLote ? escapeHtml(lote.dimensionesLote) : "—"}</dd></div>
      </dl>

      ${modelo
        ? `
        <dl class="modelo-specs">
          <div class="spec"><dt>Construcción</dt><dd>${modelo.construccionM2} m²</dd></div>
          <div class="spec"><dt>Habitaciones</dt><dd>${modelo.habitaciones}</dd></div>
          <div class="spec"><dt>Baños</dt><dd>${modelo.banos}</dd></div>
          <div class="spec"><dt>Parqueos</dt><dd>${modelo.parqueos}</dd></div>
        </dl>
        ${topFeatures.length > 0
          ? `
          <div class="features-block">
            <p class="features-eyebrow">Características</p>
            <ul class="features">
              ${topFeatures.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
          </div>`
          : ""}`
        : ""}
    </div>
    </div>
    <div class="info-footer">
      <button type="button" class="info-cta" id="lot-cta-consultar">Consultar por este Lote</button>
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
  renderPuntosLayer();
  renderFilterUI();
  renderLotModal();
  renderPuntoModal();
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

function resetFilters(): void {
  state.filter.status = "all";
  state.filter.modeloId = null;
  render();
}

function openLotModal(id: number): void {
  state.lotModalLoteId = id;
  state.contactModalLoteId = null;
  state.puntoModalId = null;
  render();
}

function closeLotModal(): void {
  state.lotModalLoteId = null;
  state.contactModalLoteId = null;
  render();
}

function openPuntoModal(id: number): void {
  state.puntoModalId = id;
  state.lotModalLoteId = null;
  state.contactModalLoteId = null;
  render();
}

function closePuntoModal(): void {
  state.puntoModalId = null;
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

function setZoomPercent(percent: number): void {
  const currentZoom = state.initialView.w / state.view.w;
  const targetZoom = Math.max(percent / 100, 1);
  const rect = svg.getBoundingClientRect();
  zoomAtPoint(
    currentZoom / targetZoom,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
}

function applyZoomDisplay(): void {
  const raw = zoomDisplay.value.replace("%", "").trim();
  const percent = Number.parseFloat(raw);
  if (Number.isFinite(percent) && percent > 0) {
    setZoomPercent(percent);
  } else {
    renderViewTransform();
  }
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

  filterResetBtn?.addEventListener("click", resetFilters);

  const filterBar = document.getElementById("filter-bar");
  const filterToggle = document.getElementById("filter-toggle");
  filterToggle?.addEventListener("click", () => {
    const collapsed = filterBar?.classList.toggle("collapsed") ?? false;
    svg.classList.toggle("filters-hidden", collapsed);
    const label = collapsed ? "Mostrar filtros" : "Ocultar filtros";
    filterToggle.setAttribute("aria-expanded", String(!collapsed));
    filterToggle.setAttribute("aria-label", label);
    const labelEl = filterToggle.querySelector<HTMLElement>(".filter-toggle-label");
    if (labelEl) labelEl.textContent = label;
  });

  document.getElementById("zoom-in")?.addEventListener("click", () => zoomBy(0.8));
  document.getElementById("zoom-out")?.addEventListener("click", () => zoomBy(1.25));
  document.getElementById("zoom-fit")?.addEventListener("click", () => fitView());

  zoomDisplay.addEventListener("focus", () => zoomDisplay.select());
  zoomDisplay.addEventListener("blur", applyZoomDisplay);
  zoomDisplay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      zoomDisplay.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      renderViewTransform();
      zoomDisplay.blur();
    }
  });

	document.getElementById("lot-modal-close")?.addEventListener("click", closeLotModal);
	lotModalBackdrop.addEventListener("click", (e) => {
		if (lotModal.contains(e.target as Node)) return;
		closeLotModal();
	});

	document.getElementById("punto-modal-close")?.addEventListener("click", closePuntoModal);
	puntoModalBackdrop.addEventListener("click", (e) => {
		if (puntoModal.contains(e.target as Node)) return;
		closePuntoModal();
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
    } else if (state.puntoModalId !== null) {
      closePuntoModal();
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

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchMidpoint(a: Touch, b: Touch): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length === 2) {
    state.isPanning = false;
    touchStart = null;
    touchMoved = true;
    pinchDist = touchDistance(e.touches[0], e.touches[1]);
    return;
  }
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
  touchMoved = false;
  startPan(t.clientX, t.clientY);
}

function handleTouchMove(e: TouchEvent): void {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = touchDistance(e.touches[0], e.touches[1]);
    const mid = touchMidpoint(e.touches[0], e.touches[1]);
    if (pinchDist > 0 && dist > 0) {
      zoomAtPoint(pinchDist / dist, mid.x, mid.y);
    }
    pinchDist = dist;
    touchMoved = true;
    return;
  }
  if (e.touches.length !== 1 || !touchStart) return;
  e.preventDefault();
  const t = e.touches[0];
  if (Math.abs(t.clientX - touchStart.x) > 4 || Math.abs(t.clientY - touchStart.y) > 4) {
    touchMoved = true;
  }
  if (touchMoved) panTo(t.clientX, t.clientY);
}

function handleTouchEnd(e: TouchEvent): void {
  if (touchMoved) suppressNextClick = true;
  pinchDist = 0;
  if (e.touches.length === 1) {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
    startPan(t.clientX, t.clientY);
    return;
  }
  touchStart = null;
  if (state.isPanning) {
    state.isPanning = false;
    svg.style.cursor = "grab";
  }
}

// ============ Init ============

const PAGE_LOADER_MIN_MS = 300;
const pageLoaderShownAt = performance.now();
let pageLoaderHidden = false;

function hidePageLoader(): void {
  if (pageLoaderHidden) return;
  pageLoaderHidden = true;
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  const elapsed = performance.now() - pageLoaderShownAt;
  window.setTimeout(
    () => loader.classList.add("is-hidden"),
    Math.max(0, PAGE_LOADER_MIN_MS - elapsed),
  );
}

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
  puntosLayer = document.getElementById("puntos-layer") as unknown as SVGGElement;
  lotModal = document.getElementById("lot-modal") as HTMLElement;
  lotModalBackdrop = document.getElementById("lot-modal-backdrop") as HTMLElement;
  lotModalGallery = document.getElementById("lot-modal-gallery") as HTMLElement;
  lotModalInfo = document.getElementById("lot-modal-info") as HTMLElement;
  puntoModal = document.getElementById("punto-modal") as HTMLElement;
  puntoModalBackdrop = document.getElementById("punto-modal-backdrop") as HTMLElement;
  puntoModalGallery = document.getElementById("punto-modal-gallery") as HTMLElement;
  puntoModalInfo = document.getElementById("punto-modal-info") as HTMLElement;
  contactModal = document.getElementById("contact-modal") as HTMLElement;
  contactModalBackdrop = document.getElementById("contact-modal-backdrop") as HTMLElement;
  contactHeader = document.getElementById("contact-header") as HTMLElement;
  zoomDisplay = document.getElementById("zoom-display") as HTMLInputElement;
  modeloFilter = document.getElementById("modelo-filter") as HTMLSelectElement;
  filterResetBtn = document.getElementById("filter-reset") as HTMLButtonElement;
  filterResetSlot = document.getElementById("filter-reset-slot") as HTMLElement;

  state.initialView = { w: initialData.plan.anchoPx, h: initialData.plan.altoPx };
  state.view = makeFitView(state.initialView);
  planAncho = initialData.plan.anchoPx;
  planAlto = initialData.plan.altoPx;
  state.lotes = initialData.lotes;
  state.puntos = initialData.puntos ?? [];
  state.modelos = initialData.modelos;

  populateModeloFilter();
  setupEventListeners();
  render();

  const planImg = document.getElementById("plan-image");
  planImg?.addEventListener("load", hidePageLoader, { once: true });
  planImg?.addEventListener("error", hidePageLoader, { once: true });
  window.addEventListener("load", hidePageLoader, { once: true });
  window.setTimeout(hidePageLoader, 8000);
}