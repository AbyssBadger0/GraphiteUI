import type {
  AgentNode,
  BranchDefinition,
  ConditionNode,
  GraphPosition,
  InputBoundaryNode,
  NodePresetDefinition,
  NodeSystemGraphEdge,
  NodeSystemGraphNode,
  NodeSystemGraphPayload,
  NodeSystemTemplateRecord,
  NodeViewportSize,
  OutputBoundaryNode,
  PortDefinition,
  StateField,
  StateFieldType,
  ValueType,
} from "@/lib/node-system-schema";

export type CanonicalStateType =
  | "text"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "markdown"
  | "json"
  | "file_list"
  | "image"
  | "audio"
  | "video"
  | "file"
  | "knowledge_base";

export type CanonicalStateDefinition = {
  name: string;
  description: string;
  type: CanonicalStateType;
  value?: unknown;
  color: string;
};

export type CanonicalReadBinding = {
  state: string;
  required?: boolean;
};

export type CanonicalWriteBinding = {
  state: string;
  mode?: "replace";
};

export type CanonicalNodeUi = {
  position: GraphPosition;
  collapsed?: boolean;
  expandedSize?: NodeViewportSize | null;
  collapsedSize?: NodeViewportSize | null;
};

export type CanonicalInputNode = {
  kind: "input";
  name: string;
  description: string;
  ui: CanonicalNodeUi;
  reads: CanonicalReadBinding[];
  writes: CanonicalWriteBinding[];
  config: {
    value: unknown;
  };
};

export type CanonicalAgentNode = {
  kind: "agent";
  name: string;
  description: string;
  ui: CanonicalNodeUi;
  reads: CanonicalReadBinding[];
  writes: CanonicalWriteBinding[];
  config: {
    skills: string[];
    systemInstruction: string;
    taskInstruction: string;
    modelSource: "global" | "override";
    model: string;
    thinkingMode: "off" | "on";
    temperature: number;
  };
};

export type CanonicalConditionNode = {
  kind: "condition";
  name: string;
  description: string;
  ui: CanonicalNodeUi;
  reads: CanonicalReadBinding[];
  writes: CanonicalWriteBinding[];
  config: {
    branches: string[];
    conditionMode: "rule" | "cycle";
    branchMapping: Record<string, string>;
    rule: ConditionNode["rule"];
  };
};

export type CanonicalOutputNode = {
  kind: "output";
  name: string;
  description: string;
  ui: CanonicalNodeUi;
  reads: CanonicalReadBinding[];
  writes: CanonicalWriteBinding[];
  config: {
    displayMode: "auto" | "plain" | "markdown" | "json";
    persistEnabled: boolean;
    persistFormat: "txt" | "md" | "json" | "auto";
    fileNameTemplate: string;
  };
};

export type CanonicalNode =
  | CanonicalInputNode
  | CanonicalAgentNode
  | CanonicalConditionNode
  | CanonicalOutputNode;

export type CanonicalEdge = {
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
};

export type CanonicalConditionalEdge = {
  source: string;
  branches: Record<string, string>;
};

export type CanonicalGraphPayload = {
  graph_id?: string | null;
  name: string;
  state_schema: Record<string, CanonicalStateDefinition>;
  nodes: Record<string, CanonicalNode>;
  edges: CanonicalEdge[];
  conditional_edges: CanonicalConditionalEdge[];
  metadata: Record<string, unknown>;
};

export type CanonicalTemplateRecord = {
  template_id: string;
  label: string;
  description: string;
  default_graph_name: string;
  state_schema: Record<string, CanonicalStateDefinition>;
  nodes: Record<string, CanonicalNode>;
  edges: CanonicalEdge[];
  conditional_edges: CanonicalConditionalEdge[];
  metadata: Record<string, unknown>;
};

const LEGACY_GENERIC_PORT_KEYS = new Set(["value", "input", "output", "result", "text"]);

function stripString(value: unknown): string {
  return String(value ?? "").trim();
}

function canonicalStateTypeFromLegacy(stateType: StateFieldType | string | undefined): CanonicalStateType {
  switch (stateType) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "array":
      return "array";
    case "markdown":
      return "markdown";
    case "json":
      return "json";
    case "file_list":
      return "file_list";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "file":
      return "file";
    case "knowledge_base":
      return "knowledge_base";
    case "string":
    case "text":
    default:
      return "text";
  }
}

function canonicalStateTypeFromValueType(valueType: string | undefined): CanonicalStateType {
  switch (valueType) {
    case "json":
      return "json";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "file":
      return "file";
    case "knowledge_base":
      return "knowledge_base";
    case "text":
    case "any":
    default:
      return "text";
  }
}

function legacyStateTypeFromCanonical(stateType: CanonicalStateType): StateFieldType {
  return stateType === "text" ? "string" : stateType;
}

function valueTypeFromCanonicalState(stateType: CanonicalStateType): ValueType {
  switch (stateType) {
    case "json":
      return "json";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "file":
      return "file";
    case "knowledge_base":
      return "knowledge_base";
    default:
      return "text";
  }
}

function ensureStateDefinition(
  stateSchema: Record<string, CanonicalStateDefinition>,
  stateKey: string,
  preferredType?: CanonicalStateType,
): void {
  if (!stateSchema[stateKey]) {
    stateSchema[stateKey] = {
      name: stateKey,
      description: "",
      type: preferredType ?? "text",
      value: preferredType === "number" ? 0 : preferredType === "boolean" ? false : preferredType === "json" || preferredType === "object" ? {} : preferredType === "array" || preferredType === "file_list" ? [] : "",
      color: "",
    };
    return;
  }

  if (
    preferredType &&
    stateSchema[stateKey].type === "text" &&
    preferredType !== "text"
  ) {
    stateSchema[stateKey] = {
      ...stateSchema[stateKey],
      type: preferredType,
    };
  }
}

function chooseConnectedStateName(sourceState: string, targetState: string): string {
  if (sourceState === targetState) return sourceState;
  const sourceGeneric = LEGACY_GENERIC_PORT_KEYS.has(sourceState);
  const targetGeneric = LEGACY_GENERIC_PORT_KEYS.has(targetState);
  if (sourceGeneric && !targetGeneric) return targetState;
  if (targetGeneric && !sourceGeneric) return sourceState;
  return sourceState;
}

function getPortKeyFromHandle(handleId?: string | null): string {
  if (!handleId) return "";
  const [, key] = handleId.split(":", 2);
  return stripString(key);
}

function extractLegacyStateReads(config: NodePresetDefinition): Record<string, { stateKey: string; required?: boolean }> {
  const result: Record<string, { stateKey: string; required?: boolean }> = {};
  for (const binding of config.stateReads ?? []) {
    result[binding.inputKey] = {
      stateKey: binding.stateKey,
      required: binding.required,
    };
  }

  if (config.family === "agent" || config.family === "condition") {
    for (const input of config.inputs) {
      if (!result[input.key]) {
        result[input.key] = {
          stateKey: input.key,
          required: input.required,
        };
      }
    }
  } else if (config.family === "output") {
    result[config.input.key] = result[config.input.key] ?? {
      stateKey: config.input.key,
      required: config.input.required,
    };
  }

  return result;
}

function extractLegacyStateWrites(config: NodePresetDefinition): Record<string, { stateKey: string }> {
  const result: Record<string, { stateKey: string }> = {};
  for (const binding of config.stateWrites ?? []) {
    result[binding.outputKey] = {
      stateKey: binding.stateKey,
    };
  }

  if (config.family === "agent") {
    for (const output of config.outputs) {
      if (!result[output.key]) {
        result[output.key] = { stateKey: output.key };
      }
    }
  } else if (config.family === "input") {
    result[config.output.key] = result[config.output.key] ?? { stateKey: config.output.key };
  }

  return result;
}

export function buildCanonicalNodeFromLegacyNode(node: NodeSystemGraphNode): CanonicalNode {
  const config = node.data.config;
  const readsByPort = extractLegacyStateReads(config);
  const writesByPort = extractLegacyStateWrites(config);
  const ui: CanonicalNodeUi = {
    position: node.position,
    collapsed: config.family === "input" ? false : !Boolean(node.data.isExpanded),
    expandedSize: node.data.expandedSize ?? null,
    collapsedSize: node.data.collapsedSize ?? null,
  };
  const name =
    stripString((config as { name?: string }).name) ||
    stripString((config as { label?: string }).label) ||
    node.id;
  const description = stripString((config as { description?: string }).description);

  if (config.family === "input") {
    const legacyConfig = config as InputBoundaryNode & { defaultValue?: unknown };
    return {
      kind: "input",
      name,
      description,
      ui,
      reads: [],
      writes: Object.values(writesByPort).map((binding) => ({ state: binding.stateKey, mode: "replace" })),
      config: {
        value: legacyConfig.value ?? legacyConfig.defaultValue,
      },
    };
  }

  if (config.family === "agent") {
    return {
      kind: "agent",
      name,
      description,
      ui,
      reads: Object.values(readsByPort).map((binding) => ({ state: binding.stateKey, required: binding.required })),
      writes: Object.values(writesByPort).map((binding) => ({ state: binding.stateKey, mode: "replace" })),
      config: {
        skills: config.skills.map((skill) => skill.skillKey),
        systemInstruction: config.systemInstruction,
        taskInstruction: config.taskInstruction,
        modelSource: config.modelSource ?? "global",
        model: config.model ?? "",
        thinkingMode: config.thinkingMode ?? "on",
        temperature: typeof config.temperature === "number" ? config.temperature : 0.2,
      },
    };
  }

  if (config.family === "condition") {
    return {
      kind: "condition",
      name,
      description,
      ui,
      reads: Object.values(readsByPort).map((binding) => ({ state: binding.stateKey, required: binding.required })),
      writes: Object.values(writesByPort).map((binding) => ({ state: binding.stateKey, mode: "replace" })),
      config: {
        branches: config.branches.map((branch) => branch.key),
        conditionMode: config.conditionMode,
        branchMapping: config.branchMapping,
        rule: config.rule,
      },
    };
  }

  const outputConfig = config as OutputBoundaryNode;
  return {
    kind: "output",
    name,
    description,
    ui,
    reads: Object.values(readsByPort).map((binding) => ({ state: binding.stateKey, required: binding.required })),
    writes: [],
    config: {
      displayMode: outputConfig.displayMode,
      persistEnabled: outputConfig.persistEnabled,
      persistFormat: outputConfig.persistFormat,
      fileNameTemplate: outputConfig.fileNameTemplate,
    },
  };
}

export function buildCanonicalGraphFromLegacyGraph(graph: NodeSystemGraphPayload): CanonicalGraphPayload {
  const stateSchema: Record<string, CanonicalStateDefinition> = {};
  for (const field of graph.state_schema) {
    const legacyField = field as StateField & { defaultValue?: unknown };
    stateSchema[field.key] = {
      name: stripString((field as StateField & { title?: string }).name) || stripString((field as StateField & { title?: string }).title) || field.key,
      description: field.description,
      type: canonicalStateTypeFromLegacy(field.type),
      value: legacyField.value ?? legacyField.defaultValue,
      color: field.ui?.color ?? "",
    };
  }

  const nodes = Object.fromEntries(
    graph.nodes.map((node) => [node.id, buildCanonicalNodeFromLegacyNode(node)]),
  );
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const conditionalEdgesBySource: Record<string, Record<string, string>> = {};
  const edges: CanonicalEdge[] = [];

  for (const edge of graph.edges) {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourceConfig = sourceNode.data.config;
    const targetConfig = targetNode.data.config;
    const sourcePortKey = getPortKeyFromHandle(edge.sourceHandle);
    const targetPortKey = getPortKeyFromHandle(edge.targetHandle);

    if (sourceConfig.family === "condition") {
      if (sourcePortKey) {
        conditionalEdgesBySource[edge.source] = {
          ...(conditionalEdgesBySource[edge.source] ?? {}),
          [sourcePortKey]: edge.target,
        };
      }
      continue;
    }

    if (!sourcePortKey || !targetPortKey) continue;

    const sourceBindings = extractLegacyStateWrites(sourceConfig);
    const targetBindings = extractLegacyStateReads(targetConfig);
    const sourceState = sourceBindings[sourcePortKey]?.stateKey ?? sourcePortKey;
    const targetState = targetBindings[targetPortKey]?.stateKey ?? targetPortKey;
    const stateKey = chooseConnectedStateName(sourceState, targetState);

    const sourcePreferredType =
      sourceConfig.family === "input"
        ? canonicalStateTypeFromValueType(sourceConfig.output.valueType)
        : sourceConfig.family === "agent"
          ? canonicalStateTypeFromValueType(sourceConfig.outputs.find((item) => item.key === sourcePortKey)?.valueType)
          : "text";
    const targetPreferredType =
      targetConfig.family === "output"
        ? canonicalStateTypeFromValueType(targetConfig.input.valueType)
        : targetConfig.family === "agent" || targetConfig.family === "condition"
          ? canonicalStateTypeFromValueType(targetConfig.inputs.find((item) => item.key === targetPortKey)?.valueType)
          : "text";
    ensureStateDefinition(stateSchema, stateKey, sourcePreferredType);
    ensureStateDefinition(stateSchema, stateKey, targetPreferredType);

    edges.push({
      source: edge.source,
      target: edge.target,
      sourceHandle: `write:${stateKey}`,
      targetHandle: `read:${stateKey}`,
    });
  }

  return {
    graph_id: graph.graph_id ?? null,
    name: graph.name,
    state_schema: stateSchema,
    nodes,
    edges,
    conditional_edges: Object.entries(conditionalEdgesBySource).map(([source, branches]) => ({
      source,
      branches,
    })),
    metadata: graph.metadata,
  };
}

export function buildLegacyStateSchemaFromCanonicalGraph(graph: CanonicalGraphPayload): StateField[] {
  return Object.entries(graph.state_schema).map(([key, definition]) => ({
    key,
    name: stripString(definition.name) || key,
    description: definition.description,
    type: legacyStateTypeFromCanonical(definition.type),
    value: definition.value,
    ui: {
      color: definition.color,
    },
  }));
}

function firstLegacyInputHandle(node: CanonicalNode): string | null {
  if (node.kind === "agent" || node.kind === "condition") {
    const firstRead = node.reads[0];
    return firstRead ? `input:${firstRead.state}` : null;
  }
  if (node.kind === "output") {
    const firstRead = node.reads[0];
    return firstRead ? `input:${firstRead.state}` : null;
  }
  return null;
}

function buildLegacyPort(
  stateKey: string,
  stateSchema: Record<string, CanonicalStateDefinition>,
  required = false,
): PortDefinition {
  const definition = stateSchema[stateKey];
  const label = stripString(definition?.name) || stateKey;
  return {
    key: stateKey,
    label,
    valueType: valueTypeFromCanonicalState(definition?.type ?? "text"),
    required,
  };
}

function buildLegacyConditionBranches(branches: string[]): BranchDefinition[] {
  return branches.map((branch) => ({
    key: branch,
    label: "",
  }));
}

function createLegacySkillAttachment(skillKey: string) {
  return {
    name: skillKey,
    skillKey,
    inputMapping: {},
    contextBinding: {},
    usage: "optional" as const,
  };
}

function buildLegacyNodeFromCanonicalNode(
  nodeId: string,
  node: CanonicalNode,
  stateSchema: Record<string, CanonicalStateDefinition>,
): NodeSystemGraphNode {
  const isExpanded = node.kind === "input" ? true : !Boolean(node.ui.collapsed);
  const baseData = {
    nodeId,
    previewText: "",
    isExpanded,
    collapsedSize: node.ui.collapsedSize ?? null,
    expandedSize: node.ui.expandedSize ?? null,
  };

  if (node.kind === "input") {
    const outputState = node.writes[0]?.state ?? "value";
    const outputPort = buildLegacyPort(outputState, stateSchema, false);
    const config: InputBoundaryNode = {
      presetId: `node.input.${nodeId}`,
      name: stripString(node.name) || nodeId,
      description: node.description ?? "",
      family: "input",
      valueType: outputPort.valueType,
      output: outputPort,
      value: String(node.config.value ?? ""),
      stateReads: [],
      stateWrites: node.writes.map((binding) => ({
        stateKey: binding.state,
        outputKey: binding.state,
        mode: binding.mode,
      })),
    };
    return {
      id: nodeId,
      type: "default",
      position: node.ui.position,
      data: {
        ...baseData,
        config,
      },
    };
  }

  if (node.kind === "agent") {
    const config: AgentNode = {
      presetId: `node.agent.${nodeId}`,
      name: stripString(node.name) || nodeId,
      description: node.description ?? "",
      family: "agent",
      inputs: node.reads.map((binding) => buildLegacyPort(binding.state, stateSchema, binding.required)),
      outputs: node.writes.map((binding) => buildLegacyPort(binding.state, stateSchema, false)),
      systemInstruction: node.config.systemInstruction,
      taskInstruction: node.config.taskInstruction,
      skills: node.config.skills.map((skillKey) => createLegacySkillAttachment(skillKey)),
      outputBinding: {},
      modelSource: node.config.modelSource,
      model: node.config.model,
      thinkingMode: node.config.thinkingMode,
      temperature: node.config.temperature,
      stateReads: node.reads.map((binding) => ({
        stateKey: binding.state,
        inputKey: binding.state,
        required: binding.required,
      })),
      stateWrites: node.writes.map((binding) => ({
        stateKey: binding.state,
        outputKey: binding.state,
        mode: binding.mode,
      })),
    };
    return {
      id: nodeId,
      type: "default",
      position: node.ui.position,
      data: {
        ...baseData,
        config,
      },
    };
  }

  if (node.kind === "condition") {
    const config: ConditionNode = {
      presetId: `node.condition.${nodeId}`,
      name: stripString(node.name) || nodeId,
      description: node.description ?? "",
      family: "condition",
      inputs: node.reads.map((binding) => buildLegacyPort(binding.state, stateSchema, binding.required)),
      branches: buildLegacyConditionBranches(node.config.branches),
      conditionMode: node.config.conditionMode,
      rule: node.config.rule,
      branchMapping: node.config.branchMapping,
      stateReads: node.reads.map((binding) => ({
        stateKey: binding.state,
        inputKey: binding.state,
        required: binding.required,
      })),
      stateWrites: node.writes.map((binding) => ({
        stateKey: binding.state,
        outputKey: binding.state,
        mode: binding.mode,
      })),
    };
    return {
      id: nodeId,
      type: "default",
      position: node.ui.position,
      data: {
        ...baseData,
        config,
      },
    };
  }

  const inputState = node.reads[0]?.state ?? "value";
  const config: OutputBoundaryNode = {
    presetId: `node.output.${nodeId}`,
    name: stripString(node.name) || nodeId,
    description: node.description ?? "",
    family: "output",
    input: buildLegacyPort(inputState, stateSchema, node.reads[0]?.required ?? true),
    displayMode: node.config.displayMode,
    persistEnabled: node.config.persistEnabled,
    persistFormat: node.config.persistFormat,
    fileNameTemplate: node.config.fileNameTemplate,
    stateReads: node.reads.map((binding) => ({
      stateKey: binding.state,
      inputKey: binding.state,
      required: binding.required,
    })),
    stateWrites: [],
  };
  return {
    id: nodeId,
    type: "default",
    position: node.ui.position,
    data: {
      ...baseData,
      config,
    },
  };
}

export function buildLegacyGraphFromCanonicalGraph(graph: CanonicalGraphPayload): NodeSystemGraphPayload {
  const nodes = Object.entries(graph.nodes).map(([nodeId, node]) =>
    buildLegacyNodeFromCanonicalNode(nodeId, node, graph.state_schema),
  );
  const nodesById = Object.fromEntries(Object.entries(graph.nodes));
  const edges: NodeSystemGraphEdge[] = graph.edges.map((edge) => ({
    id: `edge:${edge.source}:${edge.sourceHandle}:${edge.target}:${edge.targetHandle}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: `output:${edge.sourceHandle.split(":", 2)[1] ?? edge.sourceHandle}`,
    targetHandle: `input:${edge.targetHandle.split(":", 2)[1] ?? edge.targetHandle}`,
  }));

  for (const conditionalEdge of graph.conditional_edges) {
    for (const [branchKey, target] of Object.entries(conditionalEdge.branches)) {
      edges.push({
        id: `conditional:${conditionalEdge.source}:${branchKey}:${target}`,
        source: conditionalEdge.source,
        target,
        sourceHandle: `output:${branchKey}`,
        targetHandle: firstLegacyInputHandle(nodesById[target]) ?? null,
      });
    }
  }

  return {
    graph_id: graph.graph_id ?? null,
    name: graph.name,
    state_schema: buildLegacyStateSchemaFromCanonicalGraph(graph),
    nodes,
    edges,
    metadata: graph.metadata,
  };
}

export function buildLegacyTemplateRecordFromCanonicalTemplate(template: CanonicalTemplateRecord): NodeSystemTemplateRecord {
  const graph = buildLegacyGraphFromCanonicalGraph({
    graph_id: null,
    name: template.default_graph_name,
    state_schema: template.state_schema,
    nodes: template.nodes,
    edges: template.edges,
    conditional_edges: template.conditional_edges,
    metadata: template.metadata,
  });
  return {
    template_id: template.template_id,
    label: template.label,
    description: template.description,
    default_graph_name: template.default_graph_name,
    supported_node_types: Array.from(new Set(Object.values(template.nodes).map((node) => node.kind))).sort(),
    state_schema: graph.state_schema,
    default_node_system_graph: {
      name: graph.name,
      state_schema: graph.state_schema,
      nodes: graph.nodes,
      edges: graph.edges,
      metadata: graph.metadata,
    },
  };
}
