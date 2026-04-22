import test from "node:test";
import assert from "node:assert/strict";

import { exportLangGraphPython, importGraphFromPythonSource } from "./graphs.ts";
import type { GraphPayload } from "@/types/node-system";

const originalFetch = globalThis.fetch;

test("exportLangGraphPython posts graph payload and returns raw Python source", async () => {
  let requestedUrl = "";
  let requestBody = "";

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    requestBody = String(init?.body ?? "");
    return new Response("from langgraph.graph import StateGraph\n", {
      status: 200,
      headers: {
        "Content-Type": "text/x-python",
      },
    });
  }) as typeof fetch;

  const payload: GraphPayload = {
    graph_id: null,
    name: "Export Demo",
    state_schema: {},
    nodes: {},
    edges: [],
    conditional_edges: [],
    metadata: {},
  };

  const source = await exportLangGraphPython(payload);

  assert.equal(requestedUrl, "/api/graphs/export/langgraph-python");
  assert.deepEqual(JSON.parse(requestBody), payload);
  assert.equal(source, "from langgraph.graph import StateGraph\n");

  globalThis.fetch = originalFetch;
});

test("importGraphFromPythonSource posts Python source and returns an imported graph payload", async () => {
  let requestedUrl = "";
  let requestBody = "";

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    requestBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        graph_id: null,
        name: "Imported Graph",
        state_schema: {},
        nodes: {},
        edges: [],
        conditional_edges: [],
        metadata: {},
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  const graph = await importGraphFromPythonSource("GRAPHITEUI_EXPORT_VERSION = 1");

  assert.equal(requestedUrl, "/api/graphs/import/python");
  assert.deepEqual(JSON.parse(requestBody), { source: "GRAPHITEUI_EXPORT_VERSION = 1" });
  assert.equal(graph.name, "Imported Graph");

  globalThis.fetch = originalFetch;
});
