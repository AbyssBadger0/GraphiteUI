import test from "node:test";
import assert from "node:assert/strict";

import { isGraphiteUiPythonExportFile, isGraphiteUiPythonExportSource } from "./pythonImportModel.ts";

test("isGraphiteUiPythonExportSource only accepts marked GraphiteUI Python exports", () => {
  assert.equal(isGraphiteUiPythonExportSource("GRAPHITEUI_EXPORT_VERSION = 1\nGRAPHITEUI_EDITOR_GRAPH = {}"), true);
  assert.equal(isGraphiteUiPythonExportSource("print('ordinary python')"), false);
  assert.equal(isGraphiteUiPythonExportSource("GRAPH_PAYLOAD = {}"), false);
});

test("isGraphiteUiPythonExportFile limits graph import probing to Python files", () => {
  assert.equal(isGraphiteUiPythonExportFile(new File([""], "workflow.py", { type: "text/x-python" })), true);
  assert.equal(isGraphiteUiPythonExportFile(new File([""], "notes.txt", { type: "text/plain" })), false);
});
