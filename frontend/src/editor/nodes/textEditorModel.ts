export type TextEditorField = "title" | "description";

export type TextEditorDrafts = {
  title: string;
  description: string;
};

export type TextEditorMetadata = {
  name: string;
  description: string;
};

export type TextTriggerPointerState = {
  field: TextEditorField;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};

export const TEXT_TRIGGER_MOVE_THRESHOLD = 3;

export function buildTextEditorDrafts(metadata: TextEditorMetadata): TextEditorDrafts {
  return {
    title: metadata.name,
    description: metadata.description,
  };
}

export function isTextEditorOpenState(activeField: TextEditorField | null, field: TextEditorField) {
  return activeField === field;
}

export function isTextEditorConfirmOpenState(activeConfirmField: TextEditorField | null, field: TextEditorField) {
  return activeConfirmField === field;
}

export function resolveTextEditorWidth(field: TextEditorField) {
  return field === "title" ? 360 : 420;
}

export function resolveTextEditorTitle(field: TextEditorField) {
  return field === "title" ? "Edit Name" : "Edit Description";
}

export function resolveTextEditorDraftValue(drafts: TextEditorDrafts, field: TextEditorField) {
  return field === "title" ? drafts.title : drafts.description;
}

export function createTextTriggerPointerState(
  field: TextEditorField,
  pointerId: number,
  clientX: number,
  clientY: number,
): TextTriggerPointerState {
  return {
    field,
    pointerId,
    startClientX: clientX,
    startClientY: clientY,
    moved: false,
  };
}

export function updateTextTriggerPointerMoveState(
  pointerState: TextTriggerPointerState,
  field: TextEditorField,
  pointerId: number,
  clientX: number,
  clientY: number,
) {
  if (pointerState.field !== field || pointerState.pointerId !== pointerId) {
    return pointerState;
  }

  return {
    ...pointerState,
    moved:
      pointerState.moved ||
      hasTextTriggerMovedPastThreshold(pointerState.startClientX, pointerState.startClientY, clientX, clientY),
  };
}

export function shouldActivateTextEditorFromPointerUp(
  pointerState: TextTriggerPointerState | null,
  field: TextEditorField,
  pointerId: number,
  clientX: number,
  clientY: number,
) {
  if (!pointerState || pointerState.field !== field || pointerState.pointerId !== pointerId) {
    return false;
  }
  if (pointerState.moved) {
    return false;
  }
  return !hasTextTriggerMovedPastThreshold(pointerState.startClientX, pointerState.startClientY, clientX, clientY);
}

export function resolveTextEditorMetadataPatch(
  field: TextEditorField,
  draftValue: string,
  metadata: TextEditorMetadata,
) {
  const nextValue = draftValue.trim();
  if (field === "title") {
    return nextValue && nextValue !== metadata.name ? { name: nextValue } : null;
  }
  return nextValue !== metadata.description ? { description: nextValue } : null;
}

function hasTextTriggerMovedPastThreshold(startClientX: number, startClientY: number, clientX: number, clientY: number) {
  return (
    Math.abs(clientX - startClientX) > TEXT_TRIGGER_MOVE_THRESHOLD ||
    Math.abs(clientY - startClientY) > TEXT_TRIGGER_MOVE_THRESHOLD
  );
}
