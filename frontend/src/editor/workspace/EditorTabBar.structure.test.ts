import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorTabBar.vue"), "utf8");

test("EditorTabBar keeps the close control outside the tab activation button", () => {
  assert.match(componentSource, /editor-tab-bar__tab-activate/);
  assert.doesNotMatch(
    componentSource,
    /class="editor-tab-bar__tab"[\s\S]*class="editor-tab-bar__close"/,
  );
});
