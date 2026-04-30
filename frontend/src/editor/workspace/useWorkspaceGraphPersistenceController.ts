import type { ComputedRef, Ref } from "vue";

import { cloneGraphDocument, pruneUnreferencedStateSchemaInDocument } from "../../lib/graph-document.ts";
import {
  applyDocumentMetaToWorkspaceTab,
  type EditorWorkspaceTab,
  type PersistedEditorWorkspace,
} from "../../lib/editor-workspace.ts";
import type { GraphDocument, GraphPayload, GraphSaveResponse, GraphValidationResponse } from "../../types/node-system.ts";

import { buildPythonExportFileName } from "./pythonExportModel.ts";
import { formatValidationFeedback } from "./runFeedbackModel.ts";
import type { WorkspaceRunFeedback } from "./useWorkspaceRunVisualState.ts";

type WorkspaceRouteTab = Pick<EditorWorkspaceTab, "graphId" | "kind" | "templateId" | "defaultTemplateId">;

type WorkspaceGraphPersistenceControllerInput = {
  activeTab: ComputedRef<EditorWorkspaceTab | null> | Ref<EditorWorkspaceTab | null>;
  workspace: Ref<PersistedEditorWorkspace>;
  documentsByTabId: Ref<Record<string, GraphPayload | GraphDocument>>;
  guardGraphEditForTab: (tabId: string) => boolean;
  commitDirtyDocumentForTab: (tabId: string, document: GraphPayload | GraphDocument) => void;
  registerDocumentForTab: (tabId: string, document: GraphPayload | GraphDocument) => void;
  updateWorkspace: (nextWorkspace: PersistedEditorWorkspace) => void;
  updateWorkspaceTab: (tabId: string, updater: (tab: EditorWorkspaceTab) => EditorWorkspaceTab) => void;
  syncRouteToTab: (tab: WorkspaceRouteTab, mode: "push" | "replace") => void;
  loadGraphs: () => Promise<void>;
  saveGraph: (document: GraphPayload | GraphDocument) => Promise<GraphSaveResponse>;
  fetchGraph: (graphId: string) => Promise<GraphDocument>;
  validateGraph: (document: GraphPayload | GraphDocument) => Promise<GraphValidationResponse>;
  exportLangGraphPython: (document: GraphPayload | GraphDocument) => Promise<string>;
  downloadPythonSource: (source: string, fileName: string) => void;
  setMessageFeedbackForTab: (
    tabId: string,
    feedback: { tone: WorkspaceRunFeedback["tone"]; message: string; activeRunId?: string | null; activeRunStatus?: string | null },
  ) => void;
};

export function useWorkspaceGraphPersistenceController(input: WorkspaceGraphPersistenceControllerInput) {
  function renameActiveGraph(name: string) {
    const tab = input.activeTab.value;
    if (!tab) {
      return;
    }
    if (input.guardGraphEditForTab(tab.tabId)) {
      return;
    }
    const document = input.documentsByTabId.value[tab.tabId];
    if (!document) {
      return;
    }

    const nextDocument = cloneGraphDocument(document);
    nextDocument.name = name;
    input.commitDirtyDocumentForTab(tab.tabId, nextDocument);
  }

  async function saveTab(tabId: string) {
    const document = input.documentsByTabId.value[tabId];
    if (!document) {
      return false;
    }

    try {
      const documentToSave = pruneUnreferencedStateSchemaInDocument(document);
      const response = await input.saveGraph(documentToSave);
      const savedGraph = await input.fetchGraph(response.graph_id);
      input.registerDocumentForTab(tabId, savedGraph);

      input.updateWorkspaceTab(tabId, (tab) => ({
        ...tab,
        kind: "existing",
        graphId: savedGraph.graph_id,
        title: savedGraph.name,
        dirty: false,
        templateId: null,
      }));
      input.updateWorkspace(
        applyDocumentMetaToWorkspaceTab(input.workspace.value, tabId, {
          title: savedGraph.name,
          dirty: false,
          graphId: savedGraph.graph_id,
        }),
      );
      await input.loadGraphs();
      if (input.workspace.value.activeTabId === tabId) {
        input.syncRouteToTab(
          {
            graphId: savedGraph.graph_id,
            kind: "existing",
            templateId: null,
            defaultTemplateId: null,
          },
          "replace",
        );
      }

      input.setMessageFeedbackForTab(tabId, {
        tone: "success",
        message: `Saved graph ${savedGraph.graph_id}.`,
      });
      return response.saved;
    } catch (error) {
      input.setMessageFeedbackForTab(tabId, {
        tone: "danger",
        message: error instanceof Error ? error.message : "Failed to save graph.",
      });
      throw error;
    }
  }

  async function saveActiveGraph() {
    if (!input.activeTab.value) {
      return;
    }
    await saveTab(input.activeTab.value.tabId);
  }

  async function validateActiveGraph() {
    const tab = input.activeTab.value;
    if (!tab) {
      return;
    }
    const document = input.documentsByTabId.value[tab.tabId];
    if (!document) {
      return;
    }

    try {
      const response = await input.validateGraph(document);
      const feedback = formatValidationFeedback(response);
      input.setMessageFeedbackForTab(tab.tabId, feedback);
    } catch (error) {
      input.setMessageFeedbackForTab(tab.tabId, {
        tone: "danger",
        message: error instanceof Error ? error.message : "Failed to validate graph.",
      });
    }
  }

  async function exportActiveGraph() {
    const tab = input.activeTab.value;
    if (!tab) {
      return;
    }
    const document = input.documentsByTabId.value[tab.tabId];
    if (!document) {
      return;
    }

    try {
      const exportDocument = cloneGraphDocument(document);
      const source = await input.exportLangGraphPython(exportDocument);
      const fileName = buildPythonExportFileName(exportDocument.name || tab.title);
      input.downloadPythonSource(source, fileName);
      input.setMessageFeedbackForTab(tab.tabId, {
        tone: "success",
        message: `Exported ${fileName}.`,
      });
    } catch (error) {
      input.setMessageFeedbackForTab(tab.tabId, {
        tone: "danger",
        message: error instanceof Error ? error.message : "Failed to export Python code.",
      });
    }
  }

  return {
    renameActiveGraph,
    saveActiveGraph,
    saveTab,
    validateActiveGraph,
    exportActiveGraph,
  };
}
