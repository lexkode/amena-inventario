export type View = { x: number; y: number; w: number; h: number };

export type PanStart = { clientX: number; clientY: number; vbX: number; vbY: number };

export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

export function applyViewTransform(
  svg: SVGSVGElement,
  view: View,
  initialWidth: number,
  zoomDisplay?: HTMLElement | null,
): void {
  const { x, y, w, h } = view;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  if (zoomDisplay) {
    const zoom = initialWidth / w;
    zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
  }
}

export function panTo(
  view: View,
  panStart: PanStart,
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): View {
  const ctm = svg.getScreenCTM();
  if (!ctm) return view;
  const scale = ctm.a;
  return {
    ...view,
    x: panStart.vbX - (clientX - panStart.clientX) / scale,
    y: panStart.vbY - (clientY - panStart.clientY) / scale,
  };
}

export function zoomAtPoint(
  view: View,
  factor: number,
  clientX: number,
  clientY: number,
  initial: { w: number; h: number },
  svg: SVGSVGElement,
): View {
  const newW = view.w * factor;
  const newH = view.h * factor;
  if (newW > initial.w || newH > initial.h) {
    return { x: 0, y: 0, w: initial.w, h: initial.h };
  }
  const p0 = clientToSvg(svg, clientX, clientY);
  const next = { ...view, w: newW, h: newH };
  const p1 = clientToSvg(svg, clientX, clientY);
  return { x: next.x + p0.x - p1.x, y: next.y + p0.y - p1.y, w: newW, h: newH };
}

export function zoomBy(
  view: View,
  factor: number,
  initial: { w: number; h: number },
  svg: SVGSVGElement,
): View {
  const rect = svg.getBoundingClientRect();
  return zoomAtPoint(
    view,
    factor,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
    initial,
    svg,
  );
}

export function fitView(initial: { w: number; h: number }): View {
  return { x: 0, y: 0, w: initial.w, h: initial.h };
}