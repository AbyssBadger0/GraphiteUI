import {
  buildEditorNodeConfigFromCanonicalNode,
  buildEditorStateFieldsFromCanonicalGraph,
  type CanonicalGraphPayload,
} from "./node-system-canonical.ts";
import type {
  NodeFamily,
  NodePresetDefinition,
  PortDefinition,
  StateField,
} from "./node-system-schema.ts";

export type StateBindingSummary = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeFamily: NodeFamily;
  portKey: string;
  portLabel: string;
  valid: boolean;
};

export type StateBindingNodeOption = {
  id: string;
  label: string;
  family: NodeFamily;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
};

function getCanonicalNodeDisplayName(canonicalGraph: CanonicalGraphPayload, nodeId: string) {
  return canonicalGraph.nodes[nodeId]?.name?.trim() || nodeId;
}

function getStateDisplayName(field: Pick<StateField, "key" | "name">) {
  return field.name.trim() || field.key;
}

function listInputPorts(config: NodePresetDefinition) {
  if (config.family === "agent") return config.inputs;
  if (config.family === "condition") return config.inputs;
  if (config.family === "output") return [config.input];
  return [] as PortDefinition[];
}

function listOutputPorts(config: NodePresetDefinition) {
  if (config.family === "agent") return config.outputs;
  if (config.family === "input") return [config.output];
  if (config.family === "condition") {
    return config.branches.map((branch) => ({ key: branch.key, label: branch.label, valueType: "any" as const }));
  }
  return [] as PortDefinition[];
}

function getBoundStateKeyForPort(config: NodePresetDefinition, side: "input" | "output", portKey: string) {
  if (side === "input") {
    if (config.family === "agent" || config.family === "condition" || config.family === "output") {
      return portKey;
    }
    return null;
  }

  if (config.family === "agent" || config.family === "input") {
    return portKey;
  }

  return null;
}

function resolvePortForDisplay(
  config: NodePresetDefinition,
  side: "input" | "output",
  port: PortDefinition,
  stateFields: StateField[],
): PortDefinition {
  const stateKey = getBoundStateKeyForPort(config, side, port.key);
  const stateField = stateKey ? stateFields.find((field) => field.key === stateKey) ?? null : null;
  if (!stateField) {
    return port;
  }

  return {
    ...port,
    label: getStateDisplayName(stateField),
  };
}

function resolvePortsForDisplay(
  config: NodePresetDefinition,
  side: "input" | "output",
  stateFields: StateField[],
) {
  const ports = side === "input" ? listInputPorts(config) : listOutputPorts(config);
  return ports.map((port) => resolvePortForDisplay(config, side, port, stateFields));
}

export function buildDisplayPortsForCanonicalNode(
  graph: CanonicalGraphPayload,
  nodeId: string,
): {
  inputs: PortDefinition[];
  outputs: PortDefinition[];
} {
  const node = graph.nodes[nodeId];
  if (!node) {
    return {
      inputs: [],
      outputs: [],
    };
  }

  const stateFields = buildEditorStateFieldsFromCanonicalGraph(graph);
  const config = buildEditorNodeConfigFromCanonicalNode(nodeId, node, graph.state_schema);

  return {
    inputs: resolvePortsForDisplay(config, "input", stateFields),
    outputs:
      config.family === "output"
        ? resolvePortsForDisplay(config, "input", stateFields)
        : resolvePortsForDisplay(config, "output", stateFields),
  };
}

export function buildStateBindingNodeOptionsFromCanonicalGraph(graph: CanonicalGraphPayload): StateBindingNodeOption[] {
  return buildStateBindingNodeOptions(graph);
}

export function buildStateBindingNodeOptions(
  graph: CanonicalGraphPayload,
): StateBindingNodeOption[] {
  return Object.entries(graph.nodes).map(([nodeId, node]) => {
    const config = buildEditorNodeConfigFromCanonicalNode(nodeId, node, graph.state_schema);
    const ports = buildDisplayPortsForCanonicalNode(graph, nodeId);

    return {
      id: nodeId,
      label: getCanonicalNodeDisplayName(graph, nodeId),
      family: config.family,
      inputs: ports.inputs,
      outputs: ports.outputs,
    };
  });
}

export function buildStateBindingsByKeyFromCanonicalGraph(graph: CanonicalGraphPayload): {
  readersByKey: Record<string, StateBindingSummary[]>;
  writersByKey: Record<string, StateBindingSummary[]>;
} {
  const stateFields = buildEditorStateFieldsFromCanonicalGraph(graph);
  const readersByKey: Record<string, StateBindingSummary[]> = {};
  const writersByKey: Record<string, StateBindingSummary[]> = {};

  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    const config = buildEditorNodeConfigFromCanonicalNode(nodeId, node, graph.state_schema);
    const nodeLabel = getCanonicalNodeDisplayName(graph, nodeId);
    const inputPorts = resolvePortsForDisplay(config, "input", stateFields);
    const outputPorts =
      config.family === "output"
        ? resolvePortsForDisplay(config, "input", stateFields)
        : resolvePortsForDisplay(config, "output", stateFields);

    for (const binding of node.reads) {
      const matchedPort = inputPorts.find((port) => port.key === binding.state);
      const summary: StateBindingSummary = {
        id: `${nodeId}:read:${binding.state}`,
        nodeId,
        nodeLabel,
        nodeFamily: config.family,
        portKey: binding.state,
        portLabel: matchedPort?.label ?? binding.state,
        valid: Boolean(matchedPort),
      };
      readersByKey[binding.state] = [...(readersByKey[binding.state] ?? []), summary];
    }

    for (const binding of node.writes) {
      const matchedPort = outputPorts.find((port) => port.key === binding.state);
      const summary: StateBindingSummary = {
        id: `${nodeId}:write:${binding.state}`,
        nodeId,
        nodeLabel,
        nodeFamily: config.family,
        portKey: binding.state,
        portLabel: matchedPort?.label ?? binding.state,
        valid: Boolean(matchedPort),
      };
      writersByKey[binding.state] = [...(writersByKey[binding.state] ?? []), summary];
    }
  }

  return {
    readersByKey,
    writersByKey,
  };
}

export function listStateBindingNodeIdsForCanonicalState(
  graph: CanonicalGraphPayload,
  stateKey: string,
): {
  readerNodeIds: string[];
  writerNodeIds: string[];
} {
  const readerNodeIds: string[] = [];
  const writerNodeIds: string[] = [];

  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    if (node.reads.some((binding) => binding.state === stateKey)) {
      readerNodeIds.push(nodeId);
    }
    if (node.writes.some((binding) => binding.state === stateKey)) {
      writerNodeIds.push(nodeId);
    }
  }

  return {
    readerNodeIds,
    writerNodeIds,
  };
}
