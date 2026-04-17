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
      id: `edge:${edge.source}:${edge.target}`,
      sourceHandle: null,
      targetHandle: null,
      sharedState: null,
    };
  }

  return {
    id: `edge:${edge.source}:output:${sharedState}:${edge.target}:input:${sharedState}`,
    sourceHandle: `output:${sharedState}`,
    targetHandle: `input:${sharedState}`,
    sharedState,
  };
}
