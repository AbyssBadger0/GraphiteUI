import assert from "node:assert/strict";
import test from "node:test";

import { buildPendingConnectionPreviewPath } from "./connectionPreviewPath.ts";
import { buildConnectorCurvePath } from "./connectionCurvePath.ts";

test("buildPendingConnectionPreviewPath builds the same curved preview for flow and route drags", () => {
  const path = buildPendingConnectionPreviewPath({
    kind: "flow-out",
    sourceX: 100,
    sourceY: 120,
    targetX: 280,
    targetY: 240,
  });

  const routePath = buildPendingConnectionPreviewPath({
    kind: "route-out",
    sourceX: 100,
    sourceY: 120,
    targetX: 280,
    targetY: 240,
  });

  const expectedPath = buildConnectorCurvePath({
    sourceX: 100,
    sourceY: 120,
    targetX: 280,
    targetY: 240,
    sourceSide: "right",
    targetSide: "left",
  });

  assert.equal(path, expectedPath);
  assert.equal(routePath, expectedPath);
});
