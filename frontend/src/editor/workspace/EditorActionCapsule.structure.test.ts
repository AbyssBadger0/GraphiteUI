import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorActionCapsule.vue"), "utf8");

test("EditorActionCapsule keeps graph tools compact while preserving Run as the only primary action", () => {
  assert.match(componentSource, /import \{ ElIcon, ElTooltip \} from "element-plus";/);
  assert.match(
    componentSource,
    /class="editor-action-capsule__tools"[\s\S]*class="editor-action-capsule__state-pill"[\s\S]*class="editor-action-capsule__run"/,
  );
  assert.match(componentSource, /:class="\{ 'editor-action-capsule__state-pill--active': isStatePanelOpen \}"/);
  assert.match(componentSource, /<span class="editor-action-capsule__state-count">\{\{ activeStateCount \}\}<\/span>/);
  assert.match(componentSource, /@click="\$emit\('toggle-state-panel'\)"/);
  assert.match(componentSource, /@click="\$emit\('run-active-graph'\)"/);
});

test("EditorActionCapsule renders non-primary graph actions as icon buttons with tooltips", () => {
  assert.match(
    componentSource,
    /<ElTooltip content="保存图" placement="bottom">[\s\S]*aria-label="保存图"[\s\S]*@click="\$emit\('save-active-graph'\)"/,
  );
  assert.match(
    componentSource,
    /<ElTooltip content="校验图" placement="bottom">[\s\S]*aria-label="校验图"[\s\S]*@click="\$emit\('validate-active-graph'\)"/,
  );
  assert.match(
    componentSource,
    /<ElTooltip content="导入 Python 图" placement="bottom">[\s\S]*aria-label="导入 Python 图"[\s\S]*@click="\$emit\('import-python-graph'\)"/,
  );
  assert.match(
    componentSource,
    /<ElTooltip content="导出 Python 图" placement="bottom">[\s\S]*aria-label="导出 Python 图"[\s\S]*@click="\$emit\('export-active-graph'\)"/,
  );
  assert.doesNotMatch(componentSource, /copy\.newGraph/);
});

test("EditorActionCapsule styles the state pill state and interactive controls", () => {
  assert.match(componentSource, /\.editor-action-capsule__state-pill--active\s*\{/);
  assert.match(componentSource, /\.editor-action-capsule__state-count\s*\{/);
  assert.match(componentSource, /\.editor-action-capsule__icon-button:hover\s*\{/);
  assert.match(componentSource, /\.editor-action-capsule__state-pill:hover\s*\{/);
  assert.match(componentSource, /\.editor-action-capsule__run:hover\s*\{/);
  assert.match(
    componentSource,
    /\.editor-action-capsule__icon-button:focus-visible,\s*\.editor-action-capsule__state-pill:focus-visible,\s*\.editor-action-capsule__run:focus-visible\s*\{/,
  );
});
