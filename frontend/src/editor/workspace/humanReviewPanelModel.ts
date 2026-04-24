import type { GraphDocument, GraphPayload } from "@/types/node-system";
import type { RunDetail } from "@/types/run";

import {
  formatStateValueInput,
  parseStateValueInput,
  STATE_FIELD_TYPE_OPTIONS,
  type StateFieldType,
} from "./statePanelFields.ts";
import { sortHumanReviewStateKeys } from "./stateOrdering.ts";

export type HumanReviewRow = {
  key: string;
  label: string;
  description: string;
  type: StateFieldType;
  color: string;
  value: unknown;
  draft: string;
};

export type HumanReviewPanelModel = {
  requiredNow: HumanReviewRow[];
  otherRows: HumanReviewRow[];
  allRows: HumanReviewRow[];
  requiredCount: number;
  hasBlockingEmptyRequiredField: boolean;
  firstBlockingRequiredKey: string | null;
  summaryText: string;
};

const stateFieldTypeSet = new Set<string>(STATE_FIELD_TYPE_OPTIONS);

export function resolveHumanReviewStateValues(run: RunDetail | null): Record<string, unknown> {
  if (!run) {
    return {};
  }
  return run.artifacts.state_values ?? run.state_snapshot.values ?? {};
}

export function resolveHumanReviewStateType(type: string | undefined): StateFieldType {
  const normalized = String(type ?? "").trim();
  return stateFieldTypeSet.has(normalized) ? (normalized as StateFieldType) : "text";
}

export function formatHumanReviewDraftValue(type: string | undefined, value: unknown) {
  return formatStateValueInput(resolveHumanReviewStateType(type), value);
}

export function buildHumanReviewRows(run: RunDetail | null, document: GraphPayload | GraphDocument): HumanReviewRow[] {
  const values = resolveHumanReviewStateValues(run);
  return sortHumanReviewStateKeys(Object.keys(values), document).map((key) => {
    const definition = document.state_schema[key];
    const type = resolveHumanReviewStateType(definition?.type);
    const label = definition?.name?.trim() || key;
    return {
      key,
      label,
      description: definition?.description ?? "",
      type,
      color: definition?.color || "#d97706",
      value: values[key],
      draft: formatHumanReviewDraftValue(type, values[key]),
    };
  });
}

export function buildHumanReviewPanelModel(
  run: RunDetail | null,
  document: GraphPayload | GraphDocument,
): HumanReviewPanelModel {
  const allRows = buildHumanReviewRows(run, document);
  const inputBackedStates = new Set(
    Object.entries(document.nodes)
      .filter(([, node]) => node.kind === "input")
      .flatMap(([, node]) => node.writes.map((binding) => binding.state)),
  );
  const currentNodeId = run?.current_node_id ?? null;
  const currentNodeWrites = currentNodeId
    ? new Set(document.nodes[currentNodeId]?.writes.map((binding) => binding.state) ?? [])
    : new Set<string>();
  const downstreamNodeIds = collectLinearDownstreamNodes(document, currentNodeId);
  const requiredKeys = new Set<string>();

  for (const nodeId of downstreamNodeIds) {
    const node = document.nodes[nodeId];
    if (!node || (node.kind !== "agent" && node.kind !== "condition")) {
      continue;
    }
    for (const binding of node.reads) {
      if (inputBackedStates.has(binding.state) || currentNodeWrites.has(binding.state)) {
        continue;
      }
      requiredKeys.add(binding.state);
    }
  }

  const requiredNow = allRows.filter((row) => requiredKeys.has(row.key));
  const otherRows = allRows.filter((row) => !requiredKeys.has(row.key));
  const firstBlockingRequiredKey = requiredNow.find(rowDraftIsEmpty)?.key ?? null;

  return {
    requiredNow,
    otherRows,
    allRows,
    requiredCount: requiredNow.length,
    hasBlockingEmptyRequiredField: firstBlockingRequiredKey !== null,
    firstBlockingRequiredKey,
    summaryText:
      requiredNow.length === 0
        ? "当前断点后没有需要人工补充的输入"
        : `到下一个断点前，需人工填写 ${requiredNow.length} 项输入`,
  };
}

function resolveGraphSuccessors(document: GraphPayload | GraphDocument) {
  const successors = new Map<string, string[]>();
  for (const nodeId of Object.keys(document.nodes)) {
    successors.set(nodeId, []);
  }
  for (const edge of document.edges) {
    successors.set(edge.source, [...(successors.get(edge.source) ?? []), edge.target]);
  }
  for (const edge of document.conditional_edges) {
    successors.set(edge.source, [...(successors.get(edge.source) ?? []), ...Object.values(edge.branches)]);
  }
  return successors;
}

function collectLinearDownstreamNodes(document: GraphPayload | GraphDocument, startNodeId: string | null) {
  if (!startNodeId) {
    return [];
  }
  const successors = resolveGraphSuccessors(document);
  const result: string[] = [];
  const queue = [...(successors.get(startNodeId) ?? [])];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (seen.has(nodeId)) {
      continue;
    }
    seen.add(nodeId);
    result.push(nodeId);
    queue.push(...(successors.get(nodeId) ?? []));
  }
  return result;
}

function rowDraftIsEmpty(row: HumanReviewRow) {
  return row.draft.trim().length === 0;
}

export function buildHumanReviewResumePayload(rows: HumanReviewRow[], draftsByKey: Record<string, string>) {
  const payload: Record<string, unknown> = {};
  for (const row of rows) {
    const draft = draftsByKey[row.key] ?? row.draft;
    if (draft === row.draft) {
      continue;
    }
    payload[row.key] = parseStateValueInput(row.type, draft);
  }
  return payload;
}
