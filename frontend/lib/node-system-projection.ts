import {
  buildEditorNodeConfigFromCanonicalNode,
  type CanonicalGraphPayload,
} from "./node-system-canonical.ts";
import type { NodePresetDefinition } from "./node-system-schema.ts";

type NodeConfigCarrier = {
  id: string;
  data: {
    config: NodePresetDefinition;
  };
};

function serializeConfig(config: NodePresetDefinition) {
  return JSON.stringify(config);
}

export function projectCanonicalConfigsOntoNodes<T extends NodeConfigCarrier>(
  nodes: readonly T[],
  graph: CanonicalGraphPayload,
): T[] {
  let changed = false;

  const nextNodes = nodes.map((node) => {
    const canonicalNode = graph.nodes[node.id];
    if (!canonicalNode) {
      return node;
    }

    const nextConfig = buildEditorNodeConfigFromCanonicalNode(node.id, canonicalNode, graph.state_schema);
    if (serializeConfig(node.data.config) === serializeConfig(nextConfig)) {
      return node;
    }

    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        config: nextConfig,
      },
    };
  });

  return changed ? nextNodes : (nodes as T[]);
}
