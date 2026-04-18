import test from "node:test";
import assert from "node:assert/strict";

import { filterWelcomeGraphs, filterWelcomeTemplates } from "./editorWelcomeSearch.ts";

test("filterWelcomeTemplates matches id label and description", () => {
  const templates = [
    {
      template_id: "hello_world",
      label: "Hello World",
      description: "A minimal hello world graph.",
      default_graph_name: "Hello World",
      state_schema: {},
      nodes: {},
      edges: [],
      conditional_edges: [],
      metadata: {},
    },
    {
      template_id: "knowledge_validation",
      label: "Knowledge Validation",
      description: "Checks docs retrieval.",
      default_graph_name: "Knowledge Validation",
      state_schema: {},
      nodes: {},
      edges: [],
      conditional_edges: [],
      metadata: {},
    },
  ];

  assert.equal(filterWelcomeTemplates(templates, "hello").length, 1);
  assert.equal(filterWelcomeTemplates(templates, "docs").length, 1);
  assert.equal(filterWelcomeTemplates(templates, "knowledge_validation").length, 1);
});

test("filterWelcomeGraphs matches graph id and name", () => {
  const graphs = [
    {
      graph_id: "graph_1",
      name: "Hello World",
      state_schema: {},
      nodes: {},
      edges: [],
      conditional_edges: [],
      metadata: {},
    },
    {
      graph_id: "graph_2",
      name: "Knowledge Validation",
      state_schema: {},
      nodes: {},
      edges: [],
      conditional_edges: [],
      metadata: {},
    },
  ];

  assert.equal(filterWelcomeGraphs(graphs, "hello").length, 1);
  assert.equal(filterWelcomeGraphs(graphs, "graph_2").length, 1);
});
