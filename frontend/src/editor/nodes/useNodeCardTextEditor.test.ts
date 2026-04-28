import test from "node:test";
import assert from "node:assert/strict";

import { nextTick } from "vue";

import { useNodeCardTextEditor } from "./useNodeCardTextEditor.ts";
import type { TextEditorMetadata } from "./textEditorModel.ts";

test("node card text editor opens through confirmation and commits trimmed metadata", async () => {
  const metadata: TextEditorMetadata = {
    name: "Agent",
    description: "Original description",
  };
  const emittedPatches: Array<Partial<TextEditorMetadata>> = [];
  const scheduler = createManualTimeoutScheduler();
  let actionPreparationCount = 0;
  let openPreparationCount = 0;
  let titleFocusCount = 0;

  const controller = useNodeCardTextEditor({
    getMetadata: () => metadata,
    guardLockedInteraction: () => false,
    prepareTextEditorAction: () => {
      actionPreparationCount += 1;
    },
    prepareOpenTextEditor: () => {
      openPreparationCount += 1;
    },
    emitUpdateNodeMetadata: (patch) => {
      emittedPatches.push(patch);
    },
    focusTitleInput: () => {
      titleFocusCount += 1;
    },
    focusDescriptionInput: () => undefined,
    timeoutScheduler: scheduler,
  });

  controller.handleTextEditorAction("title");

  assert.equal(controller.isTextEditorConfirmOpen("title"), true);
  assert.equal(controller.isTextEditorOpen("title"), false);
  assert.equal(actionPreparationCount, 1);
  assert.equal(openPreparationCount, 0);

  controller.handleTextEditorAction("title");
  await nextTick();

  assert.equal(controller.isTextEditorConfirmOpen("title"), false);
  assert.equal(controller.isTextEditorOpen("title"), true);
  assert.equal(actionPreparationCount, 2);
  assert.equal(openPreparationCount, 1);

  scheduler.runNext();

  assert.equal(titleFocusCount, 1);

  controller.handleTextEditorDraftInput("title", " Renamed Agent ");
  controller.commitTextEditor();

  assert.deepEqual(emittedPatches, [{ name: "Renamed Agent" }]);
  assert.equal(controller.isTextEditorOpen("title"), false);
  assert.equal(controller.textEditorDraftValue("title"), "Agent");
});

test("node card text trigger pointer ignores drags and activates clicks", () => {
  const metadata: TextEditorMetadata = {
    name: "Agent",
    description: "Original description",
  };
  const controller = useNodeCardTextEditor({
    getMetadata: () => metadata,
    guardLockedInteraction: () => false,
    prepareTextEditorAction: () => undefined,
    prepareOpenTextEditor: () => undefined,
    emitUpdateNodeMetadata: () => undefined,
    focusTitleInput: () => undefined,
    focusDescriptionInput: () => undefined,
    timeoutScheduler: createManualTimeoutScheduler(),
  });

  controller.handleTextTriggerPointerDown("description", pointerEvent({ pointerId: 7, clientX: 10, clientY: 10 }));
  controller.handleTextTriggerPointerMove("description", pointerEvent({ pointerId: 7, clientX: 20, clientY: 10 }));
  controller.handleTextTriggerPointerUp("description", pointerEvent({ pointerId: 7, clientX: 20, clientY: 10 }));

  assert.equal(controller.isTextEditorConfirmOpen("description"), false);

  controller.handleTextTriggerPointerDown("description", pointerEvent({ pointerId: 8, clientX: 10, clientY: 10 }));
  controller.handleTextTriggerPointerUp("description", pointerEvent({ pointerId: 8, clientX: 11, clientY: 11 }));

  assert.equal(controller.isTextEditorConfirmOpen("description"), true);
});

function pointerEvent(options: { pointerId: number; clientX: number; clientY: number; button?: number }) {
  return {
    button: options.button ?? 0,
    pointerId: options.pointerId,
    clientX: options.clientX,
    clientY: options.clientY,
  } as PointerEvent;
}

function createManualTimeoutScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    setTimeout(callback: () => void) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    clearTimeout(id: unknown) {
      callbacks.delete(Number(id));
    },
    runNext() {
      const nextEntry = callbacks.entries().next();
      assert.equal(nextEntry.done, false, "expected a scheduled timeout");
      if (nextEntry.done) {
        return;
      }
      const [id, callback] = nextEntry.value;
      callbacks.delete(id);
      callback();
    },
  };
}
