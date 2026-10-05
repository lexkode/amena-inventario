import assert from "node:assert/strict";
import { test } from "node:test";
import { fitBuildingView } from "./viewport";

const points = [{ x: 100, y: 200 }, { x: 500, y: 200 }, { x: 500, y: 450 }, { x: 100, y: 450 }];
for (const container of [{ w: 1440, h: 900 }, { w: 390, h: 844 }, { w: 844, h: 390 }]) {
  test(`edificio centrado y completo con margen en ${container.w}×${container.h}`, () => {
    const view = fitBuildingView(points, container);
    assert.equal(view.x + view.w / 2, 300);
    assert.ok((points[0].y - view.y) / view.h * container.h >= container.h * .25 - .000001);
    assert.ok((points[2].y - view.y) / view.h * container.h <= container.h * .70 + .000001);
    assert.ok(Math.abs(view.w / view.h - container.w / container.h) < .000001);
    for (const p of points) {
      assert.ok(p.x > view.x && p.x < view.x + view.w);
      assert.ok(p.y > view.y && p.y < view.y + view.h);
      const screenY = (p.y - view.y) / view.h * container.h;
      assert.ok(screenY >= container.h * .25 - .000001);
      assert.ok(screenY <= container.h * .70 + .000001);
    }
    const left = (Math.min(...points.map(p => p.x)) - view.x) / view.w * container.w;
    assert.ok(left >= 48 - .000001);
  });
}

test("el encuadre admite 15vh de margen a ambos lados en el breakpoint de tablet", () => {
  const container = { w: 1024, h: 768 };
  const sidePadding = container.h * 0.15;
  const view = fitBuildingView(points, container, sidePadding);
  const left = (Math.min(...points.map((p) => p.x)) - view.x) / view.w * container.w;
  const right = (view.x + view.w - Math.max(...points.map((p) => p.x))) / view.w * container.w;
  assert.ok(left >= sidePadding - 0.000001);
  assert.ok(right >= sidePadding - 0.000001);
});

test("en teléfono el edificio aprovecha el 90% del ancho sin invadir la zona inferior", () => {
  const container = { w: 390, h: 844 };
  const view = fitBuildingView(points, container, container.w * 0.05);
  const screenWidth = (points[1].x - points[0].x) / view.w * container.w;
  const buildingBottom = (points[2].y - view.y) / view.h * container.h;
  assert.ok(Math.abs(screenWidth - container.w * 0.9) < 0.000001);
  assert.ok(buildingBottom <= container.h * 0.7);
});
