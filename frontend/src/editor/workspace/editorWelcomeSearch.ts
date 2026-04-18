import type { GraphDocument, TemplateRecord } from "@/types/node-system";

export const EDITOR_WELCOME_SEARCH_DEBOUNCE_MS = 300;

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function includesQuery(parts: Array<string | null | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return parts.some((part) => normalizeSearchText(part ?? "").includes(query));
}

export function filterWelcomeTemplates(templates: TemplateRecord[], rawQuery: string) {
  const query = normalizeSearchText(rawQuery);
  if (!query) {
    return templates;
  }

  return templates.filter((template) =>
    includesQuery([template.template_id, template.label, template.description], query),
  );
}

export function filterWelcomeGraphs(graphs: GraphDocument[], rawQuery: string) {
  const query = normalizeSearchText(rawQuery);
  if (!query) {
    return graphs;
  }

  return graphs.filter((graph) => includesQuery([graph.graph_id, graph.name], query));
}
