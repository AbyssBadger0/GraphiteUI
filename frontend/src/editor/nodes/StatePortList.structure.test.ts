import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

test("StatePortList owns agent real state port rows and emits parent side effects", () => {
  const componentSource = readFileSync(resolve(currentDirectory, "StatePortList.vue"), "utf8").replace(/\r\n/g, "\n");

  assert.match(componentSource, /defineProps<\{[\s\S]*side: "input" \| "output";[\s\S]*ports: NodePortViewModel\[\];[\s\S]*nodeId: string;[\s\S]*stateEditorDraft: StateFieldDraft \| null;[\s\S]*\}>/);
  assert.match(componentSource, /<TransitionGroup[\s\S]*name="node-card-port-reorder"/);
  assert.match(componentSource, /v-for="port in ports"/);
  assert.match(componentSource, /data-port-reorder-node-id/);
  assert.match(componentSource, /@pointerdown\.stop="emit\('reorder-pointer-down', side, port\.key, \$event\)"/);
  assert.match(componentSource, /@click\.stop="emit\('port-click', anchorId\(port\.key\), port\.key\)"/);
  assert.match(componentSource, /@click\.stop="emit\('remove-click', anchorId\(port\.key\), side, port\.key\)"/);
  assert.match(componentSource, /<StateEditorPopover/);
  assert.match(componentSource, /\.node-card__port-pill \{/);
  assert.match(componentSource, /\.node-card__port-pill-remove \{/);
});
