import { nextTick, ref } from "vue";

import {
  buildTextEditorDrafts,
  createTextTriggerPointerState,
  isTextEditorConfirmOpenState,
  isTextEditorOpenState,
  resolveTextEditorDraftValue,
  resolveTextEditorMetadataPatch,
  resolveTextEditorTitle,
  resolveTextEditorWidth,
  shouldActivateTextEditorFromPointerUp,
  updateTextTriggerPointerMoveState,
  type TextEditorField,
  type TextEditorMetadata,
  type TextTriggerPointerState,
} from "./textEditorModel.ts";

export type NodeCardTextEditorTimeoutScheduler = {
  setTimeout: (callback: () => void, delay?: number) => unknown;
  clearTimeout: (timeoutId: unknown) => void;
};

export type UseNodeCardTextEditorOptions = {
  getMetadata: () => TextEditorMetadata;
  guardLockedInteraction: () => boolean;
  prepareTextEditorAction: () => void;
  prepareOpenTextEditor: () => void;
  emitUpdateNodeMetadata: (patch: Partial<TextEditorMetadata>) => void;
  focusTitleInput: () => void;
  focusDescriptionInput: () => void;
  timeoutScheduler?: NodeCardTextEditorTimeoutScheduler;
};

const defaultTimeoutScheduler: NodeCardTextEditorTimeoutScheduler = {
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: (timeoutId) => globalThis.clearTimeout(timeoutId as ReturnType<typeof globalThis.setTimeout>),
};

export function useNodeCardTextEditor(options: UseNodeCardTextEditorOptions) {
  const timeoutScheduler = options.timeoutScheduler ?? defaultTimeoutScheduler;
  const activeTextEditor = ref<TextEditorField | null>(null);
  const activeTextEditorConfirmField = ref<TextEditorField | null>(null);
  const textTriggerPointerState = ref<TextTriggerPointerState | null>(null);
  const textEditorConfirmTimeoutRef = ref<unknown | null>(null);
  const textEditorFocusTimeoutRef = ref<unknown | null>(null);
  const titleEditorDraft = ref("");
  const descriptionEditorDraft = ref("");

  function syncTextEditorDraftsFromNode() {
    const drafts = buildTextEditorDrafts(options.getMetadata());
    titleEditorDraft.value = drafts.title;
    descriptionEditorDraft.value = drafts.description;
  }

  function isTextEditorOpen(field: TextEditorField) {
    return isTextEditorOpenState(activeTextEditor.value, field);
  }

  function textEditorDraftValue(field: TextEditorField) {
    return resolveTextEditorDraftValue(
      {
        title: titleEditorDraft.value,
        description: descriptionEditorDraft.value,
      },
      field,
    );
  }

  function setTextEditorDraftValue(field: TextEditorField, value: string) {
    if (field === "title") {
      titleEditorDraft.value = value;
      return;
    }
    descriptionEditorDraft.value = value;
  }

  function clearTextTriggerPointerState() {
    textTriggerPointerState.value = null;
  }

  function handleTextTriggerPointerDown(field: TextEditorField, event: PointerEvent) {
    if (options.guardLockedInteraction()) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    textTriggerPointerState.value = createTextTriggerPointerState(field, event.pointerId, event.clientX, event.clientY);
  }

  function handleTextTriggerPointerMove(field: TextEditorField, event: PointerEvent) {
    const pointerState = textTriggerPointerState.value;
    if (!pointerState) {
      return;
    }

    textTriggerPointerState.value = updateTextTriggerPointerMoveState(
      pointerState,
      field,
      event.pointerId,
      event.clientX,
      event.clientY,
    );
  }

  function handleTextTriggerPointerUp(field: TextEditorField, event: PointerEvent) {
    if (options.guardLockedInteraction()) {
      return;
    }
    const pointerState = textTriggerPointerState.value;
    clearTextTriggerPointerState();
    if (!shouldActivateTextEditorFromPointerUp(pointerState, field, event.pointerId, event.clientX, event.clientY)) {
      return;
    }
    handleTextEditorAction(field);
  }

  function focusTextEditorField(field: TextEditorField) {
    void nextTick(() => {
      clearTextEditorFocusTimeout();
      textEditorFocusTimeoutRef.value = timeoutScheduler.setTimeout(() => {
        textEditorFocusTimeoutRef.value = null;
        if (field === "title") {
          options.focusTitleInput();
          return;
        }
        options.focusDescriptionInput();
      }, 0);
    });
  }

  function clearTextEditorFocusTimeout() {
    if (textEditorFocusTimeoutRef.value !== null) {
      timeoutScheduler.clearTimeout(textEditorFocusTimeoutRef.value);
      textEditorFocusTimeoutRef.value = null;
    }
  }

  function clearTextEditorConfirmTimeout() {
    if (textEditorConfirmTimeoutRef.value !== null) {
      timeoutScheduler.clearTimeout(textEditorConfirmTimeoutRef.value);
      textEditorConfirmTimeoutRef.value = null;
    }
  }

  function clearTextEditorConfirmState() {
    clearTextEditorConfirmTimeout();
    activeTextEditorConfirmField.value = null;
  }

  function startTextEditorConfirmWindow(field: TextEditorField) {
    clearTextEditorConfirmTimeout();
    activeTextEditorConfirmField.value = field;
    textEditorConfirmTimeoutRef.value = timeoutScheduler.setTimeout(() => {
      textEditorConfirmTimeoutRef.value = null;
      if (activeTextEditorConfirmField.value === field) {
        activeTextEditorConfirmField.value = null;
      }
    }, 2000);
  }

  function isTextEditorConfirmOpen(field: TextEditorField) {
    return isTextEditorConfirmOpenState(activeTextEditorConfirmField.value, field);
  }

  function handleTextEditorAction(field: TextEditorField) {
    if (options.guardLockedInteraction()) {
      return;
    }
    if (isTextEditorOpen(field)) {
      return;
    }
    const wasConfirmOpen = isTextEditorConfirmOpen(field);
    clearTextEditorConfirmState();
    options.prepareTextEditorAction();
    if (wasConfirmOpen) {
      openTextEditor(field);
      return;
    }
    closeTextEditor();
    startTextEditorConfirmWindow(field);
  }

  function openTextEditor(field: TextEditorField) {
    if (options.guardLockedInteraction()) {
      return;
    }
    clearTextEditorConfirmState();
    options.prepareOpenTextEditor();
    syncTextEditorDraftsFromNode();
    activeTextEditor.value = field;
    focusTextEditorField(field);
  }

  function closeTextEditor() {
    clearTextEditorFocusTimeout();
    activeTextEditor.value = null;
    syncTextEditorDraftsFromNode();
  }

  function handleTextEditorDraftInput(field: TextEditorField, value: string | number) {
    if (options.guardLockedInteraction()) {
      return;
    }
    if (typeof value !== "string") {
      return;
    }
    setTextEditorDraftValue(field, value);
  }

  function commitTextEditor(field: TextEditorField | null = activeTextEditor.value) {
    if (options.guardLockedInteraction()) {
      return;
    }
    if (!field) {
      return;
    }

    const patch = resolveTextEditorMetadataPatch(field, textEditorDraftValue(field), options.getMetadata());
    if (patch) {
      options.emitUpdateNodeMetadata(patch);
    }
    closeTextEditor();
  }

  function commitOpenTextEditorIfNeeded() {
    commitTextEditor(activeTextEditor.value);
  }

  syncTextEditorDraftsFromNode();

  return {
    activeTextEditor,
    activeTextEditorConfirmField,
    clearTextEditorConfirmState,
    clearTextEditorConfirmTimeout,
    clearTextEditorFocusTimeout,
    clearTextTriggerPointerState,
    closeTextEditor,
    commitOpenTextEditorIfNeeded,
    commitTextEditor,
    handleTextEditorAction,
    handleTextEditorDraftInput,
    handleTextTriggerPointerDown,
    handleTextTriggerPointerMove,
    handleTextTriggerPointerUp,
    isTextEditorConfirmOpen,
    isTextEditorOpen,
    openTextEditor,
    syncTextEditorDraftsFromNode,
    textEditorDraftValue,
    textEditorTitle: resolveTextEditorTitle,
    textEditorWidth: resolveTextEditorWidth,
  };
}
