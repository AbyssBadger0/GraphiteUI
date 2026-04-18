import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorWorkspaceShell.vue"), "utf8");

test("EditorWorkspaceShell uses reka-ui tabs root and tab content for workspace panes", () => {
  assert.match(componentSource, /import \{[\s\S]*TabsContent,[\s\S]*TabsRoot[\s\S]*\} from "reka-ui";/);
  assert.match(componentSource, /<TabsRoot[\s\S]*:model-value="workspace\.activeTabId \?\? undefined"/);
  assert.match(componentSource, /@update:model-value="handleWorkspaceTabsValueChange"/);
  assert.match(componentSource, /:unmount-on-hide="false"/);
  assert.match(componentSource, /<TabsContent[\s\S]*v-for="tab in workspace\.tabs"/);
  assert.match(componentSource, /as-child/);
  assert.doesNotMatch(componentSource, /editor-workspace-shell__editor--active/);
});
