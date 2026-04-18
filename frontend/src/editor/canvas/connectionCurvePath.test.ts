import test from "node:test";
import assert from "node:assert/strict";

import { buildConnectorCurvePath } from "./connectionCurvePath.ts";

test("buildConnectorCurvePath creates a horizontal bezier for right-to-left links", () => {
  assert.equal(
    buildConnectorCurvePath({
      sourceX: 120,
      sourceY: 200,
      targetX: 420,
      targetY: 260,
      sourceSide: "right",
      targetSide: "left",
    }),
    "M 120 200 C 255 200 285 260 420 260",
  );
});

test("buildConnectorCurvePath respects vertical departure for bottom-to-left links", () => {
  assert.equal(
    buildConnectorCurvePath({
      sourceX: 320,
      sourceY: 180,
      targetX: 520,
      targetY: 300,
      sourceSide: "bottom",
      targetSide: "left",
      sourceOffset: 46,
      targetOffset: 96,
    }),
    "M 320 180 C 320 226 424 300 520 300",
  );
});
