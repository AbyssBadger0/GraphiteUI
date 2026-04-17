import type { CanonicalEdge, CanonicalGraphPayload } from "./node-system-canonical.ts";
import { listEditorInputPortsFromCanonicalNode, listEditorOutputPortsFromCanonicalNode } from "./node-system-canonical.ts";

export type CanonicalOrdinaryEdgePresentation = {
  id: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  sharedState: string | null;
};

export function resolveCanonicalOrdinaryEdgeSharedState(
  graph: CanonicalGraphPayload,
  edge: Pick<CanonicalEdge, "source" | "target">,
): string | null {
  const sourceNode = graph.nodes[edge.source];
  const targetNode = graph.nodes[edge.target];
  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceStates = new Set(
    listEditorOutputPortsFromCanonicalNode(sourceNode, graph.state_schema).map((port) => port.key),
  );
  const targetStates = new Set(
    listEditorInputPortsFromCanonicalNode(targetNode, graph.state_schema).map((port) => port.key),
  );
  const sharedStates = [...sourceStates].filter((stateKey) => targetStates.has(stateKey));
  return sharedStates.length === 1 ? sharedStates[0] : null;
}

export function resolveCanonicalOrdinaryEdgePresentation(
  graph: CanonicalGraphPayload,
  edge: Pick<CanonicalEdge, "source" | "target">,
): CanonicalOrdinaryEdgePresentation {
  const sharedState = resolveCanonicalOrdinaryEdgeSharedState(graph, edge);
  if (!sharedState) {
    return {
      id: buildCanonicalOrdinaryEdgeIdFromState(edge.source, edge.target, null),
      sourceHandle: null,
      targetHandle: null,
      sharedState: null,
    };
  }

  return {
    id: buildCanonicalOrdinaryEdgeIdFromState(edge.source, edge.target, sharedState),
    sourceHandle: `output:${sharedState}`,
    targetHandle: `input:${sharedState}`,
    sharedState,
  };
}

export function buildCanonicalOrdinaryEdgeId(
  graph: CanonicalGraphPayload,
  edge: Pick<CanonicalEdge, "source" | "target">,
): string {
  return buildCanonicalOrdinaryEdgeIdFromState(edge.source, edge.target, resolveCanonicalOrdinaryEdgeSharedState(graph, edge));
}

function buildCanonicalOrdinaryEdgeIdFromState(source: string, target: string, state: string | null): string {
  return state ? `edge:${source}:output:${state}:${target}:input:${state}` : `edge:${source}:${target}`;
}
