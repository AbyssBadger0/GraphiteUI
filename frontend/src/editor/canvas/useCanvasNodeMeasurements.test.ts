import test from "node:test";
import assert from "node:assert/strict";

import type { GraphPayload } from "../../types/node-system.ts";
import { useCanvasNodeMeasurements } from "./useCanvasNodeMeasurements.ts";

const document: GraphPayload = {
  name: "measurement test",
  state_schema: {},
  metadata: {},
  nodes: {},
  edges: [],
  conditional_edges: [],
};

test("canvas node measurements clear anchor offsets and node sizes for an unmounted node", () => {
  const measurements = useCanvasNodeMeasurements({
    document: () => document,
    viewportScale: () => 1,
  });
  measurements.measuredAnchorOffsets.value = {
    "agent:state-in:answer": { offsetX: 8, offsetY: 24 },
    "output:state-in:answer": { offsetX: 6, offsetY: 32 },
  };
  measurements.measuredNodeSizes.value = {
    agent: { width: 460, height: 300 },
    output: { width: 380, height: 220 },
  };

  measurements.registerNodeRef("agent", null);

  assert.deepEqual(measurements.measuredAnchorOffsets.value, {
    "output:state-in:answer": { offsetX: 6, offsetY: 32 },
  });
  assert.deepEqual(measurements.measuredNodeSizes.value, {
    output: { width: 380, height: 220 },
  });
});
