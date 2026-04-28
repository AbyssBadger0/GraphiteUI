import test from "node:test";
import assert from "node:assert/strict";

import type { ProjectedCanvasEdge } from "./edgeProjection.ts";
import { useCanvasEdgeInteractions } from "./useCanvasEdgeInteractions.ts";

const stateSchema = {
  answer: {
    name: "Answer",
    description: "Original description",
    type: "markdown" as const,
    value: "",
    color: "#2563eb",
  },
};

test("canvas edge interactions confirm and remove flow or route edges", () => {
  const routeEdge: ProjectedCanvasEdge = {
    id: "route:condition:pass->agent",
    kind: "route",
    source: "condition",
    target: "agent",
    branch: "pass",
    path: "M 0 0 C 10 0 10 10 20 10",
  };
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const selectedEdgeId = { value: null as string | null };
  const controller = useCanvasEdgeInteractions({
    stateSchema: () => stateSchema,
    isLocked: () => false,
    guardLockedInteraction: () => false,
    getSelectedEdgeId: () => selectedEdgeId.value,
    setSelectedEdgeId: (edgeId) => {
      selectedEdgeId.value = edgeId;
    },
    canDisconnectFlow: () => false,
    emitRemoveFlow: (payload) => emitted.push({ event: "remove-flow", payload }),
    emitRemoveRoute: (payload) => emitted.push({ event: "remove-route", payload }),
    emitDisconnectDataEdge: (payload) => emitted.push({ event: "disconnect-data-edge", payload }),
    emitUpdateState: (payload) => emitted.push({ event: "update-state", payload }),
    timeoutScheduler: createPausedTimeoutScheduler(),
  });

  controller.startFlowEdgeDeleteConfirm(routeEdge, { x: 32, y: 48 });

  assert.equal(selectedEdgeId.value, routeEdge.id);
  assert.equal(controller.isFlowEdgeDeleteConfirmOpen(routeEdge.id), true);
  assert.deepEqual(controller.flowEdgeDeleteConfirmStyle.value, {
    left: "32px",
    top: "48px",
  });

  controller.confirmFlowEdgeDelete();

  assert.deepEqual(emitted, [
    {
      event: "remove-route",
      payload: {
        sourceNodeId: "condition",
        branchKey: "pass",
      },
    },
  ]);
  assert.equal(controller.activeFlowEdgeDeleteConfirm.value, null);
  assert.equal(selectedEdgeId.value, null);
});

test("canvas edge interactions edit data-edge state drafts and disconnect active data edges", () => {
  const dataEdge: ProjectedCanvasEdge = {
    id: "data:agent:answer->output",
    kind: "data",
    source: "agent",
    target: "output",
    state: "answer",
    path: "M 0 0 C 10 0 10 10 20 10",
  };
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const selectedEdgeId = { value: null as string | null };
  const controller = useCanvasEdgeInteractions({
    stateSchema: () => stateSchema,
    isLocked: () => false,
    guardLockedInteraction: () => false,
    getSelectedEdgeId: () => selectedEdgeId.value,
    setSelectedEdgeId: (edgeId) => {
      selectedEdgeId.value = edgeId;
    },
    canDisconnectFlow: (sourceNodeId, targetNodeId) => sourceNodeId === "agent" && targetNodeId === "output",
    emitRemoveFlow: (payload) => emitted.push({ event: "remove-flow", payload }),
    emitRemoveRoute: (payload) => emitted.push({ event: "remove-route", payload }),
    emitDisconnectDataEdge: (payload) => emitted.push({ event: "disconnect-data-edge", payload }),
    emitUpdateState: (payload) => emitted.push({ event: "update-state", payload }),
    timeoutScheduler: createPausedTimeoutScheduler(),
  });

  controller.startDataEdgeStateConfirm(dataEdge, { x: 64, y: 96 });
  controller.openDataEdgeStateEditor();

  assert.equal(selectedEdgeId.value, dataEdge.id);
  assert.equal(controller.activeDataEdgeStateEditor.value?.mode, "edit");
  assert.equal(controller.isDataEdgeStateInteractionOpen(dataEdge), true);
  assert.deepEqual(controller.dataEdgeStateEditorStyle.value, {
    left: "64px",
    top: "96px",
  });

  controller.handleDataEdgeStateEditorNameInput("Final Answer");

  assert.equal(controller.dataEdgeStateDraft.value?.definition.name, "Final Answer");
  assert.deepEqual(emitted.at(-1), {
    event: "update-state",
    payload: {
      stateKey: "answer",
      patch: {
        name: "Final Answer",
        description: "Original description",
        type: "markdown",
        value: "",
        color: "#2563eb",
      },
    },
  });
  assert.equal(controller.shouldOfferDataEdgeFlowDisconnect(), true);

  controller.disconnectActiveDataEdgeFlow();

  assert.deepEqual(emitted.at(-1), {
    event: "disconnect-data-edge",
    payload: {
      sourceNodeId: "agent",
      targetNodeId: "output",
      stateKey: "answer",
      mode: "flow",
    },
  });
  assert.equal(controller.activeDataEdgeStateEditor.value, null);
  assert.equal(selectedEdgeId.value, null);
});

function createPausedTimeoutScheduler() {
  return {
    setTimeout: () => 1,
    clearTimeout: () => undefined,
  };
}
