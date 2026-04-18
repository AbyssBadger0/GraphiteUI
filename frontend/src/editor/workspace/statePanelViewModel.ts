import type { StateDefinition } from "@/types/node-system";

export type StatePanelRowViewModel = {
  key: string;
  title: string;
  description: string;
  typeLabel: string;
  valuePreview: string;
  color: string;
};

export type StatePanelViewModel = {
  count: number;
  rows: StatePanelRowViewModel[];
  emptyTitle: string;
  emptyBody: string;
};

export function buildStatePanelViewModel(stateSchema: Record<string, StateDefinition>): StatePanelViewModel {
  const rows = Object.entries(stateSchema)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, state]) => ({
      key,
      title: state.name.trim() || key,
      description: state.description.trim(),
      typeLabel: state.type.trim() || "unknown",
      valuePreview: formatStateValue(state.value),
      color: state.color,
    }));

  return {
    count: rows.length,
    rows,
    emptyTitle: "No State Yet",
    emptyBody: "Graph state objects will appear here once the graph defines them.",
  };
}

function formatStateValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || "Empty string";
  }
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "No default value";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
