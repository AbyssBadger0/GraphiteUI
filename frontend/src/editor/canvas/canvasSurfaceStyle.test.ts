import test from "node:test";
import assert from "node:assert/strict";

import { resolveCanvasSurfaceStyle } from "./canvasSurfaceStyle.ts";

test("resolveCanvasSurfaceStyle shifts the dot grid with viewport panning", () => {
  assert.deepEqual(resolveCanvasSurfaceStyle({ x: 140, y: 80, scale: 1 }), {
    backgroundPosition: "140px 80px, 0 0",
    backgroundSize: "28px 28px, auto auto",
  });
});

test("resolveCanvasSurfaceStyle scales the dot grid with viewport zoom", () => {
  assert.deepEqual(resolveCanvasSurfaceStyle({ x: -35, y: 14, scale: 1.5 }), {
    backgroundPosition: "-35px 14px, 0 0",
    backgroundSize: "42px 42px, auto auto",
  });
});
