import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorHumanReviewPanel.vue"), "utf8");

function assertSourceOrder(first: RegExp, second: RegExp, message: string) {
  const firstMatch = componentSource.match(first);
  const secondMatch = componentSource.match(second);

  assert.ok(firstMatch, `Missing first pattern for order assertion: ${first}`);
  assert.ok(secondMatch, `Missing second pattern for order assertion: ${second}`);
  assert.ok(
    componentSource.indexOf(firstMatch[0]) < componentSource.indexOf(secondMatch[0]),
    message,
  );
}

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
  assertSourceOrder(
    /class="editor-human-review-panel__action-bar"/,
    /class="editor-human-review-panel__summary"/,
    "Action bar should appear before summary in source order",
  );
  assertSourceOrder(
    /class="editor-human-review-panel__summary"/,
    /class="editor-human-review-panel__required-section"/,
    "Summary should appear before required section in source order",
  );
  assertSourceOrder(
    /class="editor-human-review-panel__required-section"/,
    /class="editor-human-review-panel__other-toggle"/,
    "Required section should appear before the other toggle in source order",
  );
  assert.doesNotMatch(componentSource, /editor-human-review-panel__run-card/);
  assert.doesNotMatch(componentSource, /Paused Run/);
  assert.doesNotMatch(componentSource, /editor-human-review-panel__footer/);
  assert.doesNotMatch(componentSource, /class="editor-human-review-panel__header"/);
  assert.doesNotMatch(componentSource, /pauseReason/);
});

test("EditorHumanReviewPanel keeps the continue guard message near the action bar", () => {
  assert.match(componentSource, /const resumeGuardMessage = ref<string \| null>\(null\);/);
  assert.match(componentSource, /class="editor-human-review-panel__guard"/);
  assert.match(componentSource, /还有 \$\{remainingEmptyRequiredDraftCount\.value\} 项需要填写/);
});

test("EditorHumanReviewPanel uses the shared right-side glass inspector surface", () => {
  assert.match(componentSource, /\.editor-human-review-panel \{[^}]*box-sizing:\s*border-box;/);
  assert.match(componentSource, /\.editor-human-review-panel \{[^}]*width:\s*100%;/);
  assert.match(componentSource, /\.editor-human-review-panel \{[\s\S]*padding:\s*12px;/);
  assert.match(componentSource, /\.editor-human-review-panel \{[\s\S]*background:\s*transparent;/);
  assert.match(componentSource, /\.editor-human-review-panel__surface \{[\s\S]*border:\s*1px solid var\(--graphite-glass-border\);/);
  assert.match(
    componentSource,
    /\.editor-human-review-panel__surface \{[\s\S]*border-radius:\s*28px;[\s\S]*background:\s*var\(--graphite-glass-specular\),\s*var\(--graphite-glass-lens\),\s*var\(--graphite-glass-bg-strong\);/,
  );
  assert.match(componentSource, /\.editor-human-review-panel__surface \{[\s\S]*background-blend-mode:\s*screen,\s*screen,\s*normal;/);
  assert.match(
    componentSource,
    /\.editor-human-review-panel__surface \{[\s\S]*box-shadow:\s*var\(--graphite-glass-shadow\),\s*var\(--graphite-glass-highlight\),\s*var\(--graphite-glass-rim\);/,
  );
  assert.match(componentSource, /\.editor-human-review-panel__surface \{[\s\S]*backdrop-filter:\s*blur\(34px\) saturate\(1\.7\) contrast\(1\.02\);/);
});
