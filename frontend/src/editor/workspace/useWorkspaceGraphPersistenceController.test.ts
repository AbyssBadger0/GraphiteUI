import assert from "node:assert/strict";
import test from "node:test";
import { ref } from "vue";

import type { EditorWorkspaceTab, PersistedEditorWorkspace } from "@/lib/editor-workspace";
import type { GraphDocument, GraphPayload, GraphSaveResponse, GraphValidationResponse } from "@/types/node-system";

import { useWorkspaceGraphPersistenceController } from "./useWorkspaceGraphPersistenceController.ts";
import type { WorkspaceRunFeedback } from "./useWorkspaceRunVisualState.ts";

function graphDocument(name: string, graphId: string | null = null): GraphPayload | GraphDocument {
  return {
    graph_id: graphId,
    name,
    nodes: {
      node_a: {
        id: "node_a",
        kind: "agent",
        name: "Agent",
        description: "",
        reads: [],
        writes: [],
        config: {
          skills: [],
          taskInstruction: "",
          modelSource: "global",
          model: "",
          thinkingMode: "off",
          temperature: 0,
        },
        ui: { position: { x: 0, y: 0 } },
      },
    },
    edges: [],
    conditional_edges: [],
    state_schema: {},
    metadata: {},
  } as unknown as GraphPayload | GraphDocument;
}

function createHarness(options: { locked?: boolean } = {}) {
  const initialTab: EditorWorkspaceTab = {
    tabId: "tab_a",
    kind: "new",
    graphId: null,
    title: "Draft",
    dirty: true,
    templateId: "template_a",
    defaultTemplateId: null,
  };
  const activeTab = ref<EditorWorkspaceTab | null>(initialTab);
  const workspace = ref<PersistedEditorWorkspace>({
    activeTabId: "tab_a",
    tabs: [initialTab],
  });
  const documentsByTabId = ref<Record<string, GraphPayload | GraphDocument>>({
    tab_a: graphDocument("Draft"),
  });
  const savedGraph = graphDocument("Saved Graph", "graph_saved") as GraphDocument;
  const savedDocuments: Array<GraphPayload | GraphDocument> = [];
  const registeredDocuments: Array<{ tabId: string; document: GraphPayload | GraphDocument }> = [];
  const routeSyncs: Array<{ graphId: string | null; mode: "push" | "replace" | "none" }> = [];
  const committedDocuments: Array<{ tabId: string; document: GraphPayload | GraphDocument }> = [];
  const feedback: Array<{ tabId: string; feedback: Partial<WorkspaceRunFeedback> }> = [];
  const downloads: Array<{ source: string; fileName: string }> = [];
  let graphLoadCount = 0;

  const controller = useWorkspaceGraphPersistenceController({
    activeTab,
    workspace,
    documentsByTabId,
    guardGraphEditForTab: () => Boolean(options.locked),
    commitDirtyDocumentForTab: (tabId, document) => {
      committedDocuments.push({ tabId, document });
      documentsByTabId.value = { ...documentsByTabId.value, [tabId]: document };
    },
    registerDocumentForTab: (tabId, document) => {
      registeredDocuments.push({ tabId, document });
      documentsByTabId.value = { ...documentsByTabId.value, [tabId]: document };
    },
    updateWorkspace: (nextWorkspace) => {
      workspace.value = nextWorkspace;
      activeTab.value = nextWorkspace.tabs.find((tab) => tab.tabId === nextWorkspace.activeTabId) ?? null;
    },
    updateWorkspaceTab: (tabId, updater) => {
      workspace.value = {
        ...workspace.value,
        tabs: workspace.value.tabs.map((tab) => (tab.tabId === tabId ? updater(tab) : tab)),
      };
      activeTab.value = workspace.value.tabs.find((tab) => tab.tabId === workspace.value.activeTabId) ?? null;
    },
    syncRouteToTab: (tab, mode) => {
      routeSyncs.push({ graphId: tab.graphId, mode });
    },
    loadGraphs: async () => {
      graphLoadCount += 1;
    },
    saveGraph: async (document) => {
      savedDocuments.push(document);
      return {
        graph_id: "graph_saved",
        saved: true,
        validation: { valid: true, issues: [] },
      } satisfies GraphSaveResponse;
    },
    fetchGraph: async () => savedGraph,
    validateGraph: async () =>
      ({
        valid: false,
        issues: [{ code: "missing", message: "Missing edge", path: null }],
      }) satisfies GraphValidationResponse,
    exportLangGraphPython: async () => "print('graph')\n",
    downloadPythonSource: (source, fileName) => {
      downloads.push({ source, fileName });
    },
    setMessageFeedbackForTab: (tabId, nextFeedback) => {
      feedback.push({ tabId, feedback: nextFeedback });
    },
  });

  return {
    activeTab,
    workspace,
    documentsByTabId,
    savedGraph,
    savedDocuments,
    registeredDocuments,
    routeSyncs,
    committedDocuments,
    feedback,
    downloads,
    get graphLoadCount() {
      return graphLoadCount;
    },
    controller,
  };
}

test("useWorkspaceGraphPersistenceController saves the active tab as an existing graph and syncs the route", async () => {
  const harness = createHarness();

  const saved = await harness.controller.saveTab("tab_a");

  assert.equal(saved, true);
  assert.equal(harness.savedDocuments[0]?.name, "Draft");
  assert.deepEqual(harness.registeredDocuments, [{ tabId: "tab_a", document: harness.savedGraph }]);
  assert.equal(harness.workspace.value.tabs[0]?.kind, "existing");
  assert.equal(harness.workspace.value.tabs[0]?.graphId, "graph_saved");
  assert.equal(harness.workspace.value.tabs[0]?.title, "Saved Graph");
  assert.equal(harness.workspace.value.tabs[0]?.dirty, false);
  assert.deepEqual(harness.routeSyncs, [{ graphId: "graph_saved", mode: "replace" }]);
  assert.equal(harness.graphLoadCount, 1);
  assert.equal(harness.feedback.at(-1)?.feedback.tone, "success");
});

test("useWorkspaceGraphPersistenceController renames through dirty commits and honors locked graphs", () => {
  const harness = createHarness();

  harness.controller.renameActiveGraph("Renamed");

  assert.equal(harness.committedDocuments[0]?.tabId, "tab_a");
  assert.equal(harness.committedDocuments[0]?.document.name, "Renamed");

  const lockedHarness = createHarness({ locked: true });
  lockedHarness.controller.renameActiveGraph("Blocked");

  assert.equal(lockedHarness.committedDocuments.length, 0);
});

test("useWorkspaceGraphPersistenceController validates and exports the active graph with scoped feedback", async () => {
  const harness = createHarness();

  await harness.controller.validateActiveGraph();
  await harness.controller.exportActiveGraph();

  assert.equal(harness.feedback[0]?.feedback.tone, "danger");
  assert.equal(harness.feedback[0]?.feedback.message, "Missing edge");
  assert.deepEqual(harness.downloads, [{ source: "print('graph')\n", fileName: "Draft.py" }]);
  assert.equal(harness.feedback.at(-1)?.feedback.tone, "success");
  assert.equal(harness.feedback.at(-1)?.feedback.message, "Exported Draft.py.");
});
