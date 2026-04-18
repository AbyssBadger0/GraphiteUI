import test from "node:test";
import assert from "node:assert/strict";

import { resolveWorkspaceSelectTriggerLabel } from "./workspaceSelectModel.ts";

test("resolveWorkspaceSelectTriggerLabel prefers selected option label", () => {
  assert.equal(
    resolveWorkspaceSelectTriggerLabel({
      value: "graph-1",
      placeholder: "打开已有图",
      options: [
        { value: "graph-1", label: "Hello World" },
        { value: "graph-2", label: "Knowledge Base" },
      ],
    }),
    "Hello World",
  );
});

test("resolveWorkspaceSelectTriggerLabel falls back to placeholder when empty", () => {
  assert.equal(
    resolveWorkspaceSelectTriggerLabel({
      value: "",
      placeholder: "从模板创建",
      options: [{ value: "hello_world", label: "Hello World" }],
    }),
    "从模板创建",
  );
});
