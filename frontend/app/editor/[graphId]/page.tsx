import { notFound } from "next/navigation";

import {
  EditorClient,
  type EditorClientGraphPayload,
  type EditorClientTemplateRecord,
} from "@/components/editor/editor-client";
import { apiGet } from "@/lib/api";
import {
  buildLegacyGraphFromCanonicalGraph,
  buildLegacyTemplateRecordFromCanonicalTemplate,
  type CanonicalGraphPayload,
  type CanonicalTemplateRecord,
} from "@/lib/node-system-canonical";

type EditorGraphPageProps = {
  params: Promise<{ graphId: string }>;
};

async function loadTemplates() {
  try {
    const templates = await apiGet<CanonicalTemplateRecord[]>("/api/templates");
    return templates.map(buildLegacyTemplateRecordFromCanonicalTemplate);
  } catch {
    return [] as EditorClientTemplateRecord[];
  }
}

async function loadGraph(graphId: string) {
  try {
    const graph = await apiGet<CanonicalGraphPayload>(`/api/graphs/${graphId}`);
    return buildLegacyGraphFromCanonicalGraph(graph);
  } catch {
    return null;
  }
}

export default async function EditorGraphPage({ params }: EditorGraphPageProps) {
  const { graphId } = await params;
  const [graph, templates] = await Promise.all([loadGraph(graphId), loadTemplates()]);

  if (!graph) {
    notFound();
  }

  return <EditorClient mode="existing" graphId={graphId} initialGraph={graph} templates={templates} />;
}
