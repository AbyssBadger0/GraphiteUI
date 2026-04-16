import test from "node:test";
import assert from "node:assert/strict";

import type { CanonicalGraphPayload } from "./node-system-canonical.ts";
import type { InputBoundaryNode } from "./node-system-schema.ts";
import { projectCanonicalConfigsOntoNodes } from "./node-system-projection.ts";

test("projectCanonicalConfigsOntoNodes refreshes mirrored node config from canonical graph", () => {
  const graph: CanonicalGraphPayload = {
    graph_id: "graph_test",
    name: "Projection Test",
    state_schema: {
      question: {
        name: "Question",
        description: "User question",
        type: "text",
        value: "What is GraphiteUI?",
        color: "#d97706",
      },
    },
    nodes: {
      input_question: {
        kind: "input",
        name: "Input Question",
        description: "Collect the user question.",
        ui: {
          position: { x: 0, y: 0 },
          collapsed: false,
        },
        reads: [],
        writes: [{ state: "question", mode: "replace" }],
        config: {
          value: "What is GraphiteUI?",
        },
      },
    },
    edges: [],
    conditional_edges: [],
    metadata: {},
  };

  const staleConfig: InputBoundaryNode = {
    presetId: "node.input.input_question",
    family: "input",
    name: "Old Name",
    description: "Old description",
    valueType: "text",
    output: {
      key: "question",
      label: "Old Label",
      valueType: "text",
    },
    value: "stale value",
  };

  const nodes = [
    {
      id: "input_question",
      data: {
        config: staleConfig,
      },
    },
  ];

  const next = projectCanonicalConfigsOntoNodes(nodes, graph);
  const projected = next[0]?.data.config as InputBoundaryNode;

  assert.notEqual(next, nodes);
  assert.equal(projected.name, "Input Question");
  assert.equal(projected.description, "Collect the user question.");
  assert.equal(projected.output.label, "Question");
  assert.equal(projected.value, "What is GraphiteUI?");
});

test("projectCanonicalConfigsOntoNodes prefers canonical state default over stale input node config value", () => {
  const graph: CanonicalGraphPayload = {
    graph_id: "graph_test",
    name: "Projection Test",
    state_schema: {
      question: {
        name: "Question",
        description: "User question",
        type: "text",
        value: "Value from state schema",
        color: "#d97706",
      },
    },
    nodes: {
      input_question: {
        kind: "input",
        name: "Input Question",
        description: "Collect the user question.",
        ui: {
          position: { x: 0, y: 0 },
          collapsed: false,
        },
        reads: [],
        writes: [{ state: "question", mode: "replace" }],
        config: {
          value: "stale node config value",
        },
      },
    },
    edges: [],
    conditional_edges: [],
    metadata: {},
  };

  const next = projectCanonicalConfigsOntoNodes(
    [
      {
        id: "input_question",
        data: {
          config: {
            presetId: "node.input.input_question",
            family: "input" as const,
            name: "Input Question",
            description: "Collect the user question.",
            valueType: "text" as const,
            output: {
              key: "question",
              label: "Question",
              valueType: "text" as const,
            },
            value: "older mirrored value",
          },
        },
      },
    ],
    graph,
  );

  const projected = next[0]?.data.config as InputBoundaryNode;
  assert.equal(projected.value, "Value from state schema");
});

test("projectCanonicalConfigsOntoNodes is a no-op when mirrored config already matches canonical graph", () => {
  const graph: CanonicalGraphPayload = {
    graph_id: "graph_test",
    name: "Projection Test",
    state_schema: {
      answer: {
        name: "Answer",
        description: "",
        type: "text",
        value: undefined,
        color: "#d97706",
      },
    },
    nodes: {
      output_answer: {
        kind: "output",
        name: "Output Answer",
        description: "Show the final answer.",
        ui: {
          position: { x: 10, y: 20 },
          collapsed: false,
        },
        reads: [{ state: "answer", required: true }],
        writes: [],
        config: {
          displayMode: "auto",
          persistEnabled: false,
          persistFormat: "auto",
          fileNameTemplate: "",
        },
      },
    },
    edges: [],
    conditional_edges: [],
    metadata: {},
  };

  const next = projectCanonicalConfigsOntoNodes(
    [
      {
        id: "output_answer",
        data: {
          config: {
            presetId: "node.output.output_answer",
            family: "output" as const,
            name: "Output Answer",
            description: "Show the final answer.",
            input: {
              key: "answer",
              label: "Answer",
              valueType: "text" as const,
              required: true,
            },
            displayMode: "auto" as const,
            persistEnabled: false,
            persistFormat: "auto" as const,
            fileNameTemplate: "",
          },
        },
      },
    ],
    graph,
  );

  assert.equal(next[0]?.data.config.name, "Output Answer");
  assert.equal(next[0]?.data.config.description, "Show the final answer.");
  assert.equal(next[0]?.data.config.input.label, "Answer");
});
