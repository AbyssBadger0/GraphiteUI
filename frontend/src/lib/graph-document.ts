import type { GraphPayload, TemplateRecord } from "../types/node-system.ts";

export function createDraftFromTemplate(template: TemplateRecord): GraphPayload {
  return structuredClone({
    graph_id: null,
    name: template.default_graph_name,
    state_schema: template.state_schema,
    nodes: template.nodes,
    edges: template.edges,
    conditional_edges: template.conditional_edges,
    metadata: template.metadata,
  });
}
