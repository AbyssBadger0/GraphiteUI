import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEditorNodeConfigFromCanonicalNode,
  buildEditorNodeConfigFromCanonicalPreset,
  buildEditorStateFieldsFromCanonicalStateSchema,
  type CanonicalPresetDocument,
} from "./node-system-canonical.ts";

test("buildEditorNodeConfigFromCanonicalPreset derives a usable editor config directly from canonical preset data", () => {
  const preset: CanonicalPresetDocument = {
    presetId: "preset.local.research_helper.123456",
    sourcePresetId: "preset.agent.empty.v0",
    definition: {
      label: "Research Helper",
      description: "Research workflow preset",
      state_schema: {
        question: {
          name: "Question",
          description: "User question",
          type: "text",
          value: "What is GraphiteUI?",
          color: "#d97706",
        },
        answer: {
          name: "Answer",
          description: "Final answer",
          type: "text",
          value: "",
          color: "#2563eb",
        },
      },
      node: {
        kind: "agent",
        name: "research_helper",
        description: "Handles research prompts",
        ui: {
          position: { x: 0, y: 0 },
          collapsed: false,
        },
        reads: [{ state: "question", required: true }],
        writes: [{ state: "answer", mode: "replace" }],
        config: {
          skills: ["search_knowledge_base"],
          systemInstruction: "You are a helpful researcher.",
          taskInstruction: "Answer the user's question.",
          modelSource: "global",
          model: "",
          thinkingMode: "on",
          temperature: 0.2,
        },
      },
    },
  };

  const config = buildEditorNodeConfigFromCanonicalPreset(preset);

  assert.equal(config.presetId, preset.presetId);
  assert.equal(config.family, "agent");
  assert.equal(config.name, "research_helper");
  assert.equal(config.description, "Research workflow preset");
  assert.deepEqual(
    config.inputs.map((input) => ({ key: input.key, label: input.label, required: input.required })),
    [{ key: "question", label: "Question", required: true }],
  );
  assert.deepEqual(
    config.outputs.map((output) => ({ key: output.key, label: output.label })),
    [{ key: "answer", label: "Answer" }],
  );
});

test("buildEditorStateFieldsFromCanonicalStateSchema derives editor state fields without wrapping them in a preset record", () => {
  const stateFields = buildEditorStateFieldsFromCanonicalStateSchema({
    question: {
      name: "Question",
      description: "User question",
      type: "text",
      value: "What is GraphiteUI?",
      color: "#d97706",
    },
    answer: {
      name: "Answer",
      description: "Final answer",
      type: "text",
      value: "",
      color: "#2563eb",
    },
  });

  assert.deepEqual(stateFields, [
    {
      key: "question",
      name: "Question",
      description: "User question",
      type: "string",
      value: "What is GraphiteUI?",
      ui: {
        color: "#d97706",
      },
    },
    {
      key: "answer",
      name: "Answer",
      description: "Final answer",
      type: "string",
      value: "",
      ui: {
        color: "#2563eb",
      },
    },
  ]);
});

test("buildEditorNodeConfigFromCanonicalNode keeps agent skills as direct string keys", () => {
  const config = buildEditorNodeConfigFromCanonicalNode(
    "research_helper",
    {
      kind: "agent",
      name: "research_helper",
      description: "Handles research prompts",
      ui: {
        position: { x: 0, y: 0 },
        collapsed: false,
      },
      reads: [],
      writes: [],
      config: {
        skills: ["search_knowledge_base", "markdown_formatter"],
        systemInstruction: "You are a helpful researcher.",
        taskInstruction: "Answer the user's question.",
        modelSource: "global",
        model: "",
        thinkingMode: "on",
        temperature: 0.2,
      },
    },
    {},
  );

  assert.equal(config.family, "agent");
  assert.deepEqual(config.skills, ["search_knowledge_base", "markdown_formatter"]);
});
