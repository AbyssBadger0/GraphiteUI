import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorHumanReviewPanel.vue"), "utf8");

test("EditorHumanReviewPanel renders an action-first breakpoint task panel", () => {
  assert.match(componentSource, /buildHumanReviewPanelModel/);
  assert.match(componentSource, /class="editor-human-review-panel__action-bar"/);
  assert.match(componentSource, /class="editor-human-review-panel__resume"/);
  assert.match(componentSource, /@click="handleResumeClick"/);
  assert.match(componentSource, /class="editor-human-review-panel__focus"/);
  assert.match(componentSource, /@click="\$emit\('focus-node', currentFocusNodeId\)"/);
  assert.match(componentSource, /class="editor-human-review-panel__summary"/);
  assert.match(componentSource, /\{\{ panelModel\.summaryText \}\}/);
  assert.match(componentSource, /class="editor-human-review-panel__required-section"/);
  assert.match(componentSource, /v-for="row in panelModel\.requiredNow"/);
  assert.match(componentSource, /class="editor-human-review-panel__other-toggle"/);
  assert.match(componentSource, /v-if="otherRowsExpanded && panelModel\.otherRows\.length > 0"/);
  assert.doesNotMatch(componentSource, /editor-human-review-panel__run-card/);
  assert.doesNotMatch(componentSource, /pauseReason/);
});

test("EditorHumanReviewPanel keeps the continue guard message near the action bar", () => {
  assert.match(componentSource, /const resumeGuardMessage = ref<string \| null>\(null\);/);
  assert.match(componentSource, /class="editor-human-review-panel__guard"/);
  assert.match(componentSource, /还有 \$\{panelModel\.value\.requiredCount\} 项需要填写/);
});
