import { computed, nextTick, ref, watch } from "vue";

import {
  buildStateEditorDraftFromSchema,
  resolveStateEditorUpdatePatch,
  updateStateEditorDraftColor,
  updateStateEditorDraftDescription,
  updateStateEditorDraftName,
  updateStateEditorDraftType,
} from "../nodes/stateEditorModel.ts";
import { resolveStateColorOptions, type StateFieldDraft } from "../workspace/statePanelFields.ts";
import type { GraphPosition, StateDefinition } from "../../types/node-system.ts";
import {
  buildDataEdgeStateConfirmFromEdge,
  buildDataEdgeStateDisconnectPayload,
  buildDataEdgeStateEditorFromConfirm,
  buildDataEdgeStateEditorFromRequest,
  buildFloatingCanvasPointStyle,
  isActiveDataEdge,
  isDataEdgeStateInteractionOpen as resolveDataEdgeStateInteractionOpen,
  shouldOfferDataEdgeFlowDisconnect as resolveShouldOfferDataEdgeFlowDisconnect,
  type DataEdgeStateConfirmTarget,
  type DataEdgeStateDisconnectPayload,
  type DataEdgeStateEditorTarget,
  type FloatingCanvasPoint,
} from "./canvasDataEdgeStateModel.ts";
import type { ProjectedCanvasEdge } from "./edgeProjection.ts";
import {
  buildFlowEdgeDeleteConfirmFromEdge,
  buildFlowEdgeDeleteConfirmStyle,
  isFlowEdgeDeleteConfirmActive,
  resolveFlowEdgeDeleteAction,
  type FlowEdgeDeleteConfirmTarget,
} from "./flowEdgeDeleteModel.ts";

type TimeoutHandle = unknown;

export type CanvasEdgeStateEditorRequest = {
  requestId: string;
  sourceNodeId: string;
  targetNodeId: string;
  stateKey: string;
  position: GraphPosition;
};

export type CanvasEdgeInteractionTimeoutScheduler = {
  setTimeout: (callback: () => void, timeout: number) => TimeoutHandle;
  clearTimeout: (handle: TimeoutHandle) => void;
};

export type CanvasEdgeInteractionsInput = {
  stateSchema: () => Record<string, StateDefinition>;
  stateEditorRequest?: () => CanvasEdgeStateEditorRequest | null | undefined;
  isLocked: () => boolean;
  guardLockedInteraction: () => boolean;
  getSelectedEdgeId: () => string | null;
  setSelectedEdgeId: (edgeId: string | null) => void;
  canDisconnectFlow: (sourceNodeId: string, targetNodeId: string) => boolean;
  emitRemoveFlow: (payload: { sourceNodeId: string; targetNodeId: string }) => void;
  emitRemoveRoute: (payload: { sourceNodeId: string; branchKey: string }) => void;
  emitDisconnectDataEdge: (payload: DataEdgeStateDisconnectPayload) => void;
  emitUpdateState: (payload: { stateKey: string; patch: Partial<StateDefinition> }) => void;
  timeoutMs?: number;
  timeoutScheduler?: CanvasEdgeInteractionTimeoutScheduler;
};

const defaultTimeoutScheduler: CanvasEdgeInteractionTimeoutScheduler = {
  setTimeout: (callback, timeout) => setTimeout(callback, timeout),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function useCanvasEdgeInteractions(input: CanvasEdgeInteractionsInput) {
  const timeoutMs = input.timeoutMs ?? 2000;
  const timeoutScheduler = input.timeoutScheduler ?? defaultTimeoutScheduler;
  const activeFlowEdgeDeleteConfirm = ref<FlowEdgeDeleteConfirmTarget | null>(null);
  const flowEdgeDeleteConfirmTimeoutRef = ref<TimeoutHandle | null>(null);
  const activeDataEdgeStateConfirm = ref<DataEdgeStateConfirmTarget | null>(null);
  const dataEdgeStateConfirmTimeoutRef = ref<TimeoutHandle | null>(null);
  const activeDataEdgeStateEditor = ref<DataEdgeStateEditorTarget | null>(null);
  const lastOpenedStateEditorRequestId = ref<string | null>(null);
  const dataEdgeStateDraft = ref<StateFieldDraft | null>(null);
  const dataEdgeStateError = ref<string | null>(null);

  const flowEdgeDeleteConfirmStyle = computed(() => buildFlowEdgeDeleteConfirmStyle(activeFlowEdgeDeleteConfirm.value));
  const dataEdgeStateConfirmStyle = computed(() => buildFloatingCanvasPointStyle(activeDataEdgeStateConfirm.value));
  const dataEdgeStateEditorStyle = computed(() => buildFloatingCanvasPointStyle(activeDataEdgeStateEditor.value));
  const dataEdgeStateColorOptions = computed(() => resolveStateColorOptions(dataEdgeStateDraft.value?.definition.color ?? ""));

  if (input.stateEditorRequest) {
    watch(
      input.stateEditorRequest,
      (request) => {
        if (!request || lastOpenedStateEditorRequestId.value === request.requestId) {
          return;
        }
        lastOpenedStateEditorRequestId.value = request.requestId;
        void nextTick().then(() => {
          openDataEdgeStateEditorFromRequest(request);
        });
      },
      { immediate: true },
    );
  }

  function clearFlowEdgeDeleteConfirmTimeout() {
    if (flowEdgeDeleteConfirmTimeoutRef.value !== null) {
      timeoutScheduler.clearTimeout(flowEdgeDeleteConfirmTimeoutRef.value);
      flowEdgeDeleteConfirmTimeoutRef.value = null;
    }
  }

  function clearFlowEdgeDeleteConfirmState() {
    clearFlowEdgeDeleteConfirmTimeout();
    const confirmEdgeId = activeFlowEdgeDeleteConfirm.value?.id ?? null;
    activeFlowEdgeDeleteConfirm.value = null;
    if (confirmEdgeId && input.getSelectedEdgeId() === confirmEdgeId) {
      input.setSelectedEdgeId(null);
    }
  }

  function clearDataEdgeStateConfirmTimeout() {
    if (dataEdgeStateConfirmTimeoutRef.value !== null) {
      timeoutScheduler.clearTimeout(dataEdgeStateConfirmTimeoutRef.value);
      dataEdgeStateConfirmTimeoutRef.value = null;
    }
  }

  function clearDataEdgeStateConfirmState() {
    clearDataEdgeStateConfirmTimeout();
    const confirmEdgeId = activeDataEdgeStateConfirm.value?.id ?? null;
    activeDataEdgeStateConfirm.value = null;
    if (confirmEdgeId && activeDataEdgeStateEditor.value?.id !== confirmEdgeId && input.getSelectedEdgeId() === confirmEdgeId) {
      input.setSelectedEdgeId(null);
    }
  }

  function closeDataEdgeStateEditor() {
    const editorEdgeId = activeDataEdgeStateEditor.value?.id ?? null;
    activeDataEdgeStateEditor.value = null;
    dataEdgeStateDraft.value = null;
    dataEdgeStateError.value = null;
    if (editorEdgeId && input.getSelectedEdgeId() === editorEdgeId) {
      input.setSelectedEdgeId(null);
    }
  }

  function clearDataEdgeStateInteraction() {
    clearDataEdgeStateConfirmState();
    closeDataEdgeStateEditor();
  }

  function clearAll() {
    clearFlowEdgeDeleteConfirmState();
    clearDataEdgeStateInteraction();
  }

  function startFlowEdgeDeleteConfirm(edge: ProjectedCanvasEdge, point: FloatingCanvasPoint) {
    clearFlowEdgeDeleteConfirmTimeout();
    const nextConfirm = buildFlowEdgeDeleteConfirmFromEdge(edge, point);
    if (!nextConfirm) {
      return;
    }

    activeFlowEdgeDeleteConfirm.value = nextConfirm;
    input.setSelectedEdgeId(edge.id);
    flowEdgeDeleteConfirmTimeoutRef.value = timeoutScheduler.setTimeout(() => {
      flowEdgeDeleteConfirmTimeoutRef.value = null;
      if (activeFlowEdgeDeleteConfirm.value?.id === edge.id) {
        clearFlowEdgeDeleteConfirmState();
      }
    }, timeoutMs);
  }

  function confirmFlowEdgeDelete() {
    if (input.guardLockedInteraction()) {
      return;
    }
    if (!activeFlowEdgeDeleteConfirm.value) {
      return;
    }

    const action = resolveFlowEdgeDeleteAction(activeFlowEdgeDeleteConfirm.value);
    if (!action) {
      return;
    }

    if (action.kind === "route") {
      input.emitRemoveRoute({
        sourceNodeId: action.sourceNodeId,
        branchKey: action.branchKey,
      });
      clearFlowEdgeDeleteConfirmState();
      return;
    }

    input.emitRemoveFlow({
      sourceNodeId: action.sourceNodeId,
      targetNodeId: action.targetNodeId,
    });
    clearFlowEdgeDeleteConfirmState();
  }

  function startDataEdgeStateConfirm(edge: ProjectedCanvasEdge, point: FloatingCanvasPoint) {
    const nextConfirm = buildDataEdgeStateConfirmFromEdge(edge, point);
    if (!nextConfirm) {
      return;
    }

    clearDataEdgeStateConfirmTimeout();
    activeDataEdgeStateConfirm.value = nextConfirm;
    input.setSelectedEdgeId(edge.id);
    dataEdgeStateConfirmTimeoutRef.value = timeoutScheduler.setTimeout(() => {
      dataEdgeStateConfirmTimeoutRef.value = null;
      if (activeDataEdgeStateConfirm.value?.id === edge.id) {
        clearDataEdgeStateConfirmState();
      }
    }, timeoutMs);
  }

  function openDataEdgeStateEditor() {
    if (input.guardLockedInteraction()) {
      return;
    }
    if (!activeDataEdgeStateConfirm.value) {
      return;
    }

    const nextDraft = buildStateEditorDraftFromSchema(activeDataEdgeStateConfirm.value.stateKey, input.stateSchema());
    if (!nextDraft) {
      clearDataEdgeStateConfirmState();
      return;
    }

    activeDataEdgeStateEditor.value = buildDataEdgeStateEditorFromConfirm(activeDataEdgeStateConfirm.value);
    dataEdgeStateDraft.value = nextDraft;
    dataEdgeStateError.value = null;
    clearDataEdgeStateConfirmState();
  }

  function openDataEdgeStateEditorFromRequest(request: CanvasEdgeStateEditorRequest) {
    if (input.isLocked()) {
      return;
    }

    const nextDraft = buildStateEditorDraftFromSchema(request.stateKey, input.stateSchema());
    if (!nextDraft) {
      return;
    }

    const nextEditor = buildDataEdgeStateEditorFromRequest(request);
    clearFlowEdgeDeleteConfirmState();
    clearDataEdgeStateConfirmState();
    input.setSelectedEdgeId(nextEditor.id);
    activeDataEdgeStateEditor.value = nextEditor;
    dataEdgeStateDraft.value = nextDraft;
    dataEdgeStateError.value = null;
  }

  function confirmCreatedDataEdgeStateEditor() {
    closeDataEdgeStateEditor();
  }

  function isCreatedDataEdgeStateEditorOpen() {
    return activeDataEdgeStateEditor.value?.mode === "create";
  }

  function shouldOfferDataEdgeFlowDisconnect() {
    return resolveShouldOfferDataEdgeFlowDisconnect({
      editor: activeDataEdgeStateEditor.value,
      canDisconnectFlow: input.canDisconnectFlow,
    });
  }

  function disconnectActiveDataEdgeStateReference() {
    disconnectActiveDataEdge("state");
  }

  function disconnectActiveDataEdgeFlow() {
    disconnectActiveDataEdge("flow");
  }

  function disconnectActiveDataEdge(mode: "state" | "flow") {
    if (input.guardLockedInteraction()) {
      return;
    }
    const payload = buildDataEdgeStateDisconnectPayload(activeDataEdgeStateEditor.value, mode);
    if (!payload) {
      return;
    }

    input.emitDisconnectDataEdge(payload);
    closeDataEdgeStateEditor();
  }

  function syncDataEdgeStateDraft(nextDraft: StateFieldDraft) {
    const currentEditor = activeDataEdgeStateEditor.value;
    if (!currentEditor || !dataEdgeStateDraft.value) {
      return;
    }

    dataEdgeStateDraft.value = nextDraft;

    const currentStateKey = currentEditor.stateKey;
    if (!currentStateKey) {
      dataEdgeStateError.value = "State key cannot be empty.";
      return;
    }

    dataEdgeStateError.value = null;

    input.emitUpdateState({
      stateKey: currentStateKey,
      patch: resolveStateEditorUpdatePatch(nextDraft, currentStateKey),
    });
  }

  function handleDataEdgeStateEditorNameInput(value: string | number) {
    if (input.guardLockedInteraction()) {
      return;
    }
    if (typeof value !== "string" || !dataEdgeStateDraft.value) {
      return;
    }
    syncDataEdgeStateDraft(updateStateEditorDraftName(dataEdgeStateDraft.value, value));
  }

  function handleDataEdgeStateEditorDescriptionInput(value: string | number) {
    if (input.guardLockedInteraction()) {
      return;
    }
    if (typeof value !== "string" || !dataEdgeStateDraft.value) {
      return;
    }
    syncDataEdgeStateDraft(updateStateEditorDraftDescription(dataEdgeStateDraft.value, value));
  }

  function handleDataEdgeStateEditorColorInput(value: string | number) {
    if (input.guardLockedInteraction()) {
      return;
    }
    if (typeof value !== "string" || !dataEdgeStateDraft.value) {
      return;
    }
    syncDataEdgeStateDraft(updateStateEditorDraftColor(dataEdgeStateDraft.value, value));
  }

  function handleDataEdgeStateEditorTypeValue(value: string | number | boolean | undefined) {
    if (input.guardLockedInteraction()) {
      return;
    }
    if (typeof value !== "string" || !dataEdgeStateDraft.value) {
      return;
    }
    syncDataEdgeStateDraft(updateStateEditorDraftType(dataEdgeStateDraft.value, value));
  }

  function isFlowEdgeDeleteConfirmOpen(edgeId: string) {
    return isFlowEdgeDeleteConfirmActive(activeFlowEdgeDeleteConfirm.value, edgeId);
  }

  function isDataEdgeStateInteractionOpen(edge: Pick<ProjectedCanvasEdge, "kind" | "source" | "target" | "state">) {
    return resolveDataEdgeStateInteractionOpen(edge, {
      confirm: activeDataEdgeStateConfirm.value,
      editor: activeDataEdgeStateEditor.value,
    });
  }

  function clearMissingProjectedEdges(edges: readonly ProjectedCanvasEdge[]) {
    if (activeFlowEdgeDeleteConfirm.value && !edges.some((edge) => edge.id === activeFlowEdgeDeleteConfirm.value?.id)) {
      clearFlowEdgeDeleteConfirmState();
    }

    if (activeDataEdgeStateConfirm.value && !edges.some((edge) => isActiveDataEdge(edge, activeDataEdgeStateConfirm.value))) {
      clearDataEdgeStateConfirmState();
    }

    if (activeDataEdgeStateEditor.value && !edges.some((edge) => isActiveDataEdge(edge, activeDataEdgeStateEditor.value))) {
      closeDataEdgeStateEditor();
    }
  }

  return {
    activeFlowEdgeDeleteConfirm,
    activeDataEdgeStateConfirm,
    activeDataEdgeStateEditor,
    dataEdgeStateDraft,
    dataEdgeStateError,
    flowEdgeDeleteConfirmStyle,
    dataEdgeStateConfirmStyle,
    dataEdgeStateEditorStyle,
    dataEdgeStateColorOptions,
    clearFlowEdgeDeleteConfirmState,
    clearDataEdgeStateConfirmState,
    closeDataEdgeStateEditor,
    clearDataEdgeStateInteraction,
    clearAll,
    startFlowEdgeDeleteConfirm,
    confirmFlowEdgeDelete,
    startDataEdgeStateConfirm,
    openDataEdgeStateEditor,
    openDataEdgeStateEditorFromRequest,
    confirmCreatedDataEdgeStateEditor,
    isCreatedDataEdgeStateEditorOpen,
    shouldOfferDataEdgeFlowDisconnect,
    disconnectActiveDataEdgeStateReference,
    disconnectActiveDataEdgeFlow,
    syncDataEdgeStateDraft,
    handleDataEdgeStateEditorNameInput,
    handleDataEdgeStateEditorDescriptionInput,
    handleDataEdgeStateEditorColorInput,
    handleDataEdgeStateEditorTypeValue,
    isFlowEdgeDeleteConfirmOpen,
    isDataEdgeStateInteractionOpen,
    clearMissingProjectedEdges,
  };
}
