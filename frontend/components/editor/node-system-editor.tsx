"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { EMPTY_AGENT_PRESET, getNodePresetById, NODE_PRESETS_MOCK } from "@/lib/node-presets-mock";
import { isValueTypeCompatible, type AgentNode, type ConditionNode, type InputBoundaryNode, type NodePresetDefinition, type OutputBoundaryNode, type PortDefinition, type ValueType } from "@/lib/node-system-schema";

type ThemeConfig = {
  theme_preset: string;
  domain: string;
  genre: string;
  market: string;
  platform: string;
  language: string;
  creative_style: string;
  tone: string;
  language_constraints: string[];
  evaluation_policy: Record<string, unknown>;
  asset_source_policy: Record<string, unknown>;
  strategy_profile: Record<string, unknown>;
};

type StateField = {
  key: string;
  type: string;
  title: string;
  description: string;
};

type GraphPayload = {
  graph_id?: string | null;
  name: string;
  template_id: string;
  theme_config: ThemeConfig;
  state_schema: StateField[];
  nodes: unknown[];
  edges: unknown[];
  metadata: Record<string, unknown>;
};

type TemplateRecord = {
  template_id: string;
  label: string;
  description: string;
  default_graph_name: string;
  supported_node_types: string[];
  state_schema: StateField[];
  default_graph: Omit<GraphPayload, "graph_id">;
};

type EditorClientProps = {
  mode: "new" | "existing";
  initialGraph?: GraphPayload | null;
  graphId?: string;
  templates: TemplateRecord[];
};

type FlowNodeData = {
  nodeId: string;
  config: NodePresetDefinition;
  previewText: string;
};

type FlowNode = Node<FlowNodeData>;

const HELLO_WORLD_TEMPLATE_ID = "hello_world";
const TYPE_COLORS: Record<ValueType, string> = {
  text: "#d97706",
  json: "#2563eb",
  image: "#0f766e",
  audio: "#7c3aed",
  video: "#be185d",
  any: "#64748b",
};

function createEditorDefaults(templates: TemplateRecord[]): GraphPayload {
  const helloWorldTemplate = templates.find((item) => item.template_id === HELLO_WORLD_TEMPLATE_ID);

  return {
    graph_id: null,
    name: helloWorldTemplate?.default_graph_name ?? "Node System Playground",
    template_id: helloWorldTemplate?.template_id ?? HELLO_WORLD_TEMPLATE_ID,
    theme_config:
      helloWorldTemplate?.default_graph.theme_config ?? {
        theme_preset: "node_system",
        domain: "workflow",
        genre: "agent_framework",
        market: "local",
        platform: "openai_compatible",
        language: "zh",
        creative_style: "minimal",
        tone: "plain",
        language_constraints: [],
        evaluation_policy: {},
        asset_source_policy: {},
        strategy_profile: {},
      },
    state_schema: helloWorldTemplate?.state_schema ?? [],
    nodes: [],
    edges: [],
    metadata: {},
  };
}

function deepClonePreset<T extends NodePresetDefinition>(preset: T): T {
  return JSON.parse(JSON.stringify(preset)) as T;
}

function buildHandleId(side: "input" | "output", key: string) {
  return `${side}:${key}`;
}

function getPortKeyFromHandle(handleId?: string | null) {
  if (!handleId) return null;
  const [, key] = handleId.split(":");
  return key ?? null;
}

function getPortType(config: NodePresetDefinition, handleId?: string | null): ValueType | null {
  const key = getPortKeyFromHandle(handleId);
  if (!key) return null;

  if (config.family === "input") {
    return handleId?.startsWith("output:") && config.output.key === key ? config.output.valueType : null;
  }
  if (config.family === "output") {
    return handleId?.startsWith("input:") && config.input.key === key ? config.input.valueType : null;
  }
  if (config.family === "agent") {
    if (handleId?.startsWith("input:")) return config.inputs.find((item) => item.key === key)?.valueType ?? null;
    if (handleId?.startsWith("output:")) return config.outputs.find((item) => item.key === key)?.valueType ?? null;
  }
  if (config.family === "condition") {
    if (handleId?.startsWith("input:")) return config.inputs.find((item) => item.key === key)?.valueType ?? null;
    if (handleId?.startsWith("output:")) return "any";
  }
  return null;
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

function findFirstCompatibleInputHandle(config: NodePresetDefinition, sourceType: ValueType) {
  const inputPort = listInputPorts(config).find((port) => isValueTypeCompatible(sourceType, port.valueType));
  return inputPort ? buildHandleId("input", inputPort.key) : null;
}

function summarizeNode(config: NodePresetDefinition) {
  if (config.family === "input") {
    return config.placeholder || "Inline input boundary";
  }
  if (config.family === "agent") {
    return config.taskInstruction || "Configure this agent node.";
  }
  if (config.family === "condition") {
    return `${config.rule.source} ${config.rule.operator} ${String(config.rule.value)}`;
  }
  return "Preview or persist an upstream output.";
}

function createPreviewText(node: FlowNode, nodes: FlowNode[], edges: Edge[]) {
  if (node.data.config.family !== "output") {
    return "";
  }

  const incoming = edges.find((edge) => edge.target === node.id);
  if (!incoming) {
    return "";
  }

  const sourceNode = nodes.find((candidate) => candidate.id === incoming.source);
  if (!sourceNode) {
    return "";
  }

  const sourcePortKey = getPortKeyFromHandle(incoming.sourceHandle);
  const config = sourceNode.data.config;

  if (config.family === "input" && sourcePortKey === config.output.key) {
    return config.defaultValue;
  }

  return `Connected to ${config.label}.${sourcePortKey ?? "value"}`;
}

function JsonTextArea({
  label,
  value,
  onChange,
  minHeight = "min-h-28",
}: {
  label: string;
  value: unknown;
  onChange: (nextValue: unknown) => void;
  minHeight?: string;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
      <span>{label}</span>
      <textarea
        className={cn(minHeight, "rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3 font-mono text-[0.82rem] text-[var(--text)]")}
        value={text}
        onChange={(event) => {
          const nextText = event.target.value;
          setText(nextText);
          try {
            onChange(JSON.parse(nextText));
          } catch {
            // allow invalid intermediate JSON while preserving local editing state
          }
        }}
      />
    </label>
  );
}

function PortRow({
  nodeId,
  port,
  side,
}: {
  nodeId: string;
  port: PortDefinition;
  side: "input" | "output";
}) {
  const color = TYPE_COLORS[port.valueType];

  return (
    <div className={cn("relative flex h-6 items-center text-[0.9rem] text-[var(--text)]", side === "input" ? "justify-start" : "justify-end")}>
      {side === "input" ? (
        <>
          <Handle
            id={buildHandleId("input", port.key)}
            type="target"
            position={Position.Left}
            className="!left-[-7px] !top-1/2 !m-0 !h-3 !w-3 !-translate-y-1/2 !border-2 !border-[rgba(255,250,241,0.96)]"
            style={{ backgroundColor: color }}
            isConnectable
          />
          <span className="ml-2 truncate">{port.label}</span>
        </>
      ) : (
        <>
          <span className="truncate text-right">{port.label}</span>
          <Handle
            id={buildHandleId("output", port.key)}
            type="source"
            position={Position.Right}
            className="!right-[-7px] !top-1/2 !m-0 !h-3 !w-3 !-translate-y-1/2 !border-2 !border-[rgba(255,250,241,0.96)]"
            style={{ backgroundColor: color }}
            isConnectable
          />
        </>
      )}
    </div>
  );
}

function NodeCard({ data, selected }: NodeProps<FlowNode>) {
  const config = data.config;
  const inputs = listInputPorts(config);
  const outputs = listOutputPorts(config);

  return (
    <div
      data-node-card="true"
      className={cn(
        "min-w-[280px] rounded-[18px] border bg-[linear-gradient(180deg,rgba(255,250,241,0.98)_0%,rgba(248,237,219,0.96)_100%)] shadow-[0_18px_36px_rgba(60,41,20,0.1)]",
        selected ? "border-[var(--accent)]" : "border-[rgba(154,52,18,0.25)]",
      )}
    >
      <div className="flex items-center justify-between border-b border-[rgba(154,52,18,0.12)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(154,52,18,0.55)]" />
          <div className="truncate text-sm font-semibold text-[var(--text)]">{config.label}</div>
        </div>
        <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">{config.family}</div>
      </div>

      <div className="grid gap-3 px-4 py-3">
        {config.family === "input" ? null : inputs.length > 0 || outputs.length > 0 ? (
          <div className="grid grid-cols-2 items-start gap-x-6">
            <div className="grid gap-1">
              {inputs.map((port) => (
                <PortRow key={`input-${port.key}`} nodeId={data.nodeId} port={port} side="input" />
              ))}
            </div>
            <div className="grid gap-1">
              {outputs.map((port) => (
                <PortRow key={`output-${port.key}`} nodeId={data.nodeId} port={port} side="output" />
              ))}
            </div>
          </div>
        ) : null}

        {config.family === "input" && outputs.length > 0 ? (
          <div className="grid gap-1">
            {outputs.map((port) => (
              <PortRow key={`output-${port.key}`} nodeId={data.nodeId} port={port} side="output" />
            ))}
          </div>
        ) : null}

        {config.family === "input" ? (
          <div className="grid gap-2">
            <textarea
              value={config.defaultValue}
              rows={5}
              placeholder={config.placeholder}
              readOnly
              className="min-h-[120px] resize-none rounded-[16px] border border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.88)] px-3 py-3 text-sm text-[var(--text)]"
            />
          </div>
        ) : null}

        {config.family === "agent" ? (
          <div className="grid gap-3">
            <div className="text-sm leading-6 text-[var(--muted)]">{config.description}</div>
            <div className="rounded-[16px] border border-[rgba(154,52,18,0.12)] bg-[rgba(255,255,255,0.78)] px-3 py-2 text-sm text-[var(--text)]">
              {summarizeNode(config)}
            </div>
            {config.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {config.skills.map((skill) => (
                  <span key={skill.name} className="rounded-full border border-[rgba(154,52,18,0.16)] bg-[rgba(255,250,241,0.92)] px-2.5 py-1 text-[0.74rem] text-[var(--accent-strong)]">
                    {skill.skillKey}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {config.family === "condition" ? (
          <div className="rounded-[16px] border border-[rgba(154,52,18,0.12)] bg-[rgba(255,255,255,0.78)] px-3 py-3 text-sm leading-6 text-[var(--text)]">
            {summarizeNode(config)}
          </div>
        ) : null}

        {config.family === "output" ? (
          <div className="rounded-[16px] border border-[rgba(154,52,18,0.12)] bg-[rgba(255,255,255,0.82)] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Preview</div>
              <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">{config.displayMode}</div>
            </div>
            <div className="max-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded-[12px] bg-[rgba(248,242,234,0.8)] px-3 py-3 text-sm leading-6 text-[var(--text)]">
              {data.previewText || "Connect an upstream output to preview/export it."}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}

const nodeTypes = {
  default: NodeCard,
};

function NodeSystemCanvas({ initialGraph }: { initialGraph: GraphPayload }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlow = useReactFlow<FlowNode, Edge>();
  const [graphName, setGraphName] = useState(initialGraph.name);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState("Node system phase 1/2: preset-driven editor only.");
  const [localPresets, setLocalPresets] = useState<NodePresetDefinition[]>([]);
  const [creationMenu, setCreationMenu] = useState<{
    clientX: number;
    clientY: number;
    flowX: number;
    flowY: number;
    sourceNodeId?: string;
    sourceHandle?: string;
    sourceValueType?: ValueType | null;
  } | null>(null);
  const pendingConnectRef = useRef<{
    sourceNodeId?: string;
    sourceHandle?: string | null;
    sourceValueType?: ValueType | null;
    completed: boolean;
  }>({
    completed: false,
  });
  const ignoreNextPaneClickRef = useRef(false);

  const allPresets = useMemo(() => [...NODE_PRESETS_MOCK, ...localPresets], [localPresets]);
  const getRecommendedPresets = useCallback(
    (sourceType: ValueType | null) => {
      if (!sourceType) {
        return [EMPTY_AGENT_PRESET, ...allPresets.filter((preset) => preset.presetId !== EMPTY_AGENT_PRESET.presetId)];
      }

      const supportsType = (preset: NodePresetDefinition) => {
        if (preset.family === "agent") {
          return preset.inputs.some((input) => input.valueType === "any" || input.valueType === sourceType);
        }
        if (preset.family === "condition") {
          return preset.inputs.some((input) => input.valueType === "any" || input.valueType === sourceType);
        }
        if (preset.family === "output") {
          return preset.input.valueType === "any" || preset.input.valueType === sourceType;
        }
        return false;
      };

      return [EMPTY_AGENT_PRESET, ...allPresets.filter((preset) => preset.presetId !== EMPTY_AGENT_PRESET.presetId && supportsType(preset))];
    },
    [allPresets],
  );

  const nodePalette = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sourceType = creationMenu?.sourceValueType ?? null;
    const recommended = getRecommendedPresets(sourceType);
    return recommended.filter((preset) => {
      if (!query) return true;
      return [preset.label, preset.description, preset.presetId].some((value) => value.toLowerCase().includes(query));
    });
  }, [creationMenu?.sourceValueType, getRecommendedPresets, search]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const previewTextByNode = useMemo(() => {
    return Object.fromEntries(nodes.map((node) => [node.id, createPreviewText(node, nodes, edges)]));
  }, [edges, nodes]);

  const openCreationMenuAtClientPoint = useCallback(
    (clientX: number, clientY: number, sourceValueType: ValueType | null = null) => {
      const position = reactFlow.screenToFlowPosition({ x: clientX, y: clientY });
      setCreationMenu({
        clientX,
        clientY,
        flowX: position.x,
        flowY: position.y,
        sourceValueType,
      });
    },
    [reactFlow],
  );

function createNodeFromPreset(preset: NodePresetDefinition, position: { x: number; y: number }) {
  const config = deepClonePreset(preset);
  const id = `${config.family}_${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
      type: "default",
      position,
      data: {
        nodeId: id,
        config,
        previewText: "",
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: "transparent",
        border: "none",
        padding: 0,
        width: "auto",
      },
    } satisfies FlowNode;
  }

  function addNodeFromPresetId(presetId: string, position: { x: number; y: number }, connectionSource?: { sourceNodeId?: string; sourceHandle?: string; sourceValueType?: ValueType | null }) {
    const preset = getNodePresetById(presetId) ?? localPresets.find((item) => item.presetId === presetId);
    if (!preset) return;

    const nextNode = createNodeFromPreset(preset, position);
    if (nextNode.data.config.family === "agent" && connectionSource?.sourceValueType) {
      const agentConfig = nextNode.data.config as AgentNode;
      if (agentConfig.inputs.length === 0) {
        agentConfig.inputs = [
          {
            key: "input",
            label: "Input",
            valueType: connectionSource.sourceValueType,
            required: true,
          },
        ];
      }
    }
    if (nextNode.data.config.family === "condition" && connectionSource?.sourceValueType) {
      const conditionConfig = nextNode.data.config as ConditionNode;
      if (conditionConfig.inputs.length === 0) {
        conditionConfig.inputs = [
          {
            key: "input",
            label: "Input",
            valueType: connectionSource.sourceValueType,
            required: true,
          },
        ];
      }
    }
    setNodes((current) => current.concat(nextNode));
    setSelectedNodeId(nextNode.id);
    setStatusMessage(`Added ${preset.label}`);

    if (connectionSource?.sourceNodeId && connectionSource.sourceHandle && connectionSource.sourceValueType) {
      const targetHandle = findFirstCompatibleInputHandle(nextNode.data.config, connectionSource.sourceValueType);
      if (targetHandle) {
        setEdges((current) =>
          current.concat({
            id: `edge_${crypto.randomUUID().slice(0, 8)}`,
            source: connectionSource.sourceNodeId ?? "",
            target: nextNode.id,
            sourceHandle: connectionSource.sourceHandle ?? null,
            targetHandle,
            markerEnd: { type: MarkerType.ArrowClosed, color: TYPE_COLORS[connectionSource.sourceValueType ?? "any"] },
            style: {
              stroke: TYPE_COLORS[connectionSource.sourceValueType ?? "any"],
              strokeWidth: 1.8,
            },
          }),
        );
      }
    }

    setCreationMenu(null);
  }

  function updateSelectedNode(updater: (config: NodePresetDefinition) => NodePresetDefinition) {
    if (!selectedNode) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                config: updater(node.data.config),
              },
            }
          : node,
      ),
    );
  }

  function saveSelectedNodeAsPreset() {
    if (!selectedNode) return;
    const slug = selectedNode.data.config.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "custom";
    const nextPreset = {
      ...deepClonePreset(selectedNode.data.config),
      presetId: `preset.local.${slug}.${crypto.randomUUID().slice(0, 6)}`,
      label: `${selectedNode.data.config.label} Copy`,
    } satisfies NodePresetDefinition;
    setLocalPresets((current) => current.concat(nextPreset));
    setStatusMessage(`Saved preset ${nextPreset.presetId}`);
  }

  return (
    <div className="grid h-screen grid-rows-[56px_minmax(0,1fr)_36px] bg-[radial-gradient(circle_at_top,rgba(154,52,18,0.1),transparent_22%),linear-gradient(180deg,#f5efe2_0%,#ede4d2_100%)]">
      <header className="grid grid-cols-[minmax(220px,320px)_1fr_auto] items-center gap-3 border-b border-[rgba(154,52,18,0.16)] bg-[rgba(255,250,241,0.82)] px-4 backdrop-blur-xl">
        <Input className="h-10" value={graphName} onChange={(event) => setGraphName(event.target.value)} placeholder="Graph name" />
        <div className="text-sm text-[var(--muted)]">Preset-driven node system prototype</div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled>
            Save
          </Button>
          <Button size="sm" disabled>
            Validate
          </Button>
          <Button size="sm" variant="primary" disabled>
            Run
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] border-r border-[rgba(154,52,18,0.16)] bg-[rgba(255,248,240,0.76)] px-4 py-4">
          <div>
            <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Node Library</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Create Nodes</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Empty agent comes first. Preset agents are suggested by current value type when created from a dragged connection.
            </p>
          </div>
          <Input className="mt-4 h-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search presets" />
          <div className="mt-4 grid min-h-0 gap-3 overflow-y-auto pr-1">
            {nodePalette.map((preset) => (
              <button
                key={preset.presetId}
                type="button"
                draggable
                className="cursor-grab rounded-[20px] border border-[rgba(154,52,18,0.18)] bg-[rgba(255,250,241,0.92)] p-4 text-left shadow-[0_10px_24px_rgba(60,41,20,0.06)] transition-transform hover:-translate-y-px active:cursor-grabbing"
                onClick={() => {
                  const wrapperBounds = wrapperRef.current?.getBoundingClientRect();
                  const position = wrapperBounds
                    ? reactFlow.screenToFlowPosition({
                        x: wrapperBounds.left + wrapperBounds.width * 0.52,
                        y: wrapperBounds.top + wrapperBounds.height * 0.4,
                      })
                    : { x: 200, y: 200 };
                  addNodeFromPresetId(preset.presetId, position);
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/graphiteui-node-preset", preset.presetId);
                  event.dataTransfer.effectAllowed = "move";
                }}
              >
                <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">{preset.family}</div>
                <div className="mt-1 text-lg font-semibold text-[var(--text)]">{preset.label}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{preset.description}</div>
              </button>
            ))}
          </div>
        </aside>

        <div
          className="relative min-w-0 min-h-0"
          ref={wrapperRef}
          onDoubleClickCapture={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest(".react-flow__node, [data-node-card='true']")) return;
            openCreationMenuAtClientPoint(event.clientX, event.clientY, null);
          }}
        >
          <div className="absolute inset-0">
            <ReactFlow
              nodes={nodes.map((node) => ({
                ...node,
                data: {
                  ...node.data,
                  previewText: previewTextByNode[node.id] ?? "",
                },
              }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={({ nodes: selectedNodes }) => setSelectedNodeId(selectedNodes[0]?.id ?? null)}
              onPaneClick={() => {
                if (ignoreNextPaneClickRef.current) {
                  ignoreNextPaneClickRef.current = false;
                  return;
                }
                setSelectedNodeId(null);
                setCreationMenu(null);
              }}
              onConnectStart={(_, params) => {
                if (params.handleType !== "source" || !params.nodeId || !params.handleId) return;
                const sourceNode = nodes.find((node) => node.id === params.nodeId);
                pendingConnectRef.current = {
                  sourceNodeId: params.nodeId,
                  sourceHandle: params.handleId,
                  sourceValueType: sourceNode ? getPortType(sourceNode.data.config, params.handleId) : null,
                  completed: false,
                };
              }}
              onConnect={(connection: Connection) => {
                const sourceNode = nodes.find((node) => node.id === connection.source);
                const targetNode = nodes.find((node) => node.id === connection.target);
                if (!sourceNode || !targetNode) return;

                const sourceType = getPortType(sourceNode.data.config, connection.sourceHandle);
                const targetType = getPortType(targetNode.data.config, connection.targetHandle);
                if (!sourceType || !targetType || !isValueTypeCompatible(sourceType, targetType)) {
                  setStatusMessage("Only compatible value types can be connected.");
                  return;
                }

                pendingConnectRef.current.completed = true;
                setEdges((current) =>
                  current
                    .filter(
                      (edge) =>
                        !(
                          edge.source === connection.source &&
                          edge.target === connection.target &&
                          edge.sourceHandle === connection.sourceHandle &&
                          edge.targetHandle === connection.targetHandle
                        ),
                    )
                    .concat({
                      id: `edge_${crypto.randomUUID().slice(0, 8)}`,
                      source: connection.source ?? "",
                      target: connection.target ?? "",
                      sourceHandle: connection.sourceHandle ?? null,
                      targetHandle: connection.targetHandle ?? null,
                      markerEnd: { type: MarkerType.ArrowClosed, color: TYPE_COLORS[sourceType] },
                      style: {
                        stroke: TYPE_COLORS[sourceType],
                        strokeWidth: 1.8,
                      },
                    }),
                );
                setStatusMessage(`Connected ${sourceNode.data.config.label} -> ${targetNode.data.config.label}`);
              }}
              onConnectEnd={(event) => {
                const pending = pendingConnectRef.current;
                if (!pending.completed && pending.sourceNodeId && pending.sourceHandle && "clientX" in event && "clientY" in event) {
                  ignoreNextPaneClickRef.current = true;
                  const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
                  setCreationMenu({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    flowX: position.x,
                    flowY: position.y,
                    sourceNodeId: pending.sourceNodeId,
                    sourceHandle: pending.sourceHandle,
                    sourceValueType: pending.sourceValueType ?? null,
                  });
                }
                pendingConnectRef.current = { completed: false };
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const presetId = event.dataTransfer.getData("application/graphiteui-node-preset");
                if (!presetId) return;
                const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
                addNodeFromPresetId(presetId, position);
              }}
              fitView
              minZoom={0.35}
              maxZoom={1.8}
              defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
              nodeTypes={nodeTypes}
              className="bg-[linear-gradient(180deg,rgba(247,241,231,0.72)_0%,rgba(237,228,210,0.72)_100%)]"
            >
              <Background id="editor-grid" color="#cfb58f" gap={24} size={1.4} variant={BackgroundVariant.Dots} />
              <Controls
                position="top-right"
                className="[&>button]:border-[rgba(154,52,18,0.18)] [&>button]:bg-[rgba(255,250,241,0.92)] [&>button]:text-[var(--text)]"
              />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                className="!bottom-4 !right-4 !h-[168px] !w-[220px] !bg-transparent !shadow-none"
                maskColor="rgba(154,52,18,0.08)"
                nodeColor="#d97706"
              />
            </ReactFlow>
          </div>

          {creationMenu ? (
            <div
              className="absolute z-20 w-[320px] rounded-[20px] border border-[rgba(154,52,18,0.18)] bg-[rgba(255,250,241,0.98)] p-3 shadow-[0_24px_48px_rgba(60,41,20,0.18)]"
              style={{
                left: Math.max(12, creationMenu.clientX - (wrapperRef.current?.getBoundingClientRect().left ?? 0) - 20),
                top: Math.max(12, creationMenu.clientY - (wrapperRef.current?.getBoundingClientRect().top ?? 0) - 20),
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Create Node</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {creationMenu.sourceValueType ? `Suggestions for ${creationMenu.sourceValueType}` : "Double click preset picker"}
                  </div>
                </div>
                <button type="button" className="text-sm text-[var(--muted)]" onClick={() => setCreationMenu(null)}>
                  Close
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {nodePalette.map((preset) => (
                  <button
                    key={`menu-${preset.presetId}`}
                    type="button"
                    className="rounded-[16px] border border-[rgba(154,52,18,0.12)] bg-[rgba(255,255,255,0.82)] px-3 py-2 text-left transition-colors hover:bg-[rgba(255,248,240,0.92)]"
                    onClick={() =>
                      addNodeFromPresetId(
                        preset.presetId,
                        { x: creationMenu.flowX, y: creationMenu.flowY },
                        {
                          sourceNodeId: creationMenu.sourceNodeId,
                          sourceHandle: creationMenu.sourceHandle,
                          sourceValueType: creationMenu.sourceValueType,
                        },
                      )
                    }
                  >
                    <div className="text-[0.7rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">{preset.family}</div>
                    <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">{preset.label}</div>
                    <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="rounded-[28px] border border-dashed border-[rgba(154,52,18,0.26)] bg-[rgba(255,250,241,0.72)] px-8 py-6 text-center shadow-[0_18px_40px_rgba(60,41,20,0.08)]">
                <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--accent-strong)]">Empty Canvas</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--text)]">Double click or drag a preset to start</div>
                <div className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                  Drag from an output handle into empty space to get type-aware preset suggestions.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-l border-[rgba(154,52,18,0.16)] bg-[rgba(255,248,240,0.76)] px-4 py-4">
          <div>
            <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Inspector</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
              {selectedNode ? selectedNode.data.config.label : "Graph"}
            </h2>
          </div>

          <div className="mt-4 min-h-0 space-y-4 overflow-y-auto pr-1">
            {!selectedNode ? (
              <div className="grid gap-4">
                <section className="rounded-[20px] border border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.76)] p-4">
                  <div className="text-sm font-semibold text-[var(--text)]">Current Phase</div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    <div>Preset-driven node creation</div>
                    <div>Editable node configs</div>
                    <div>Type-aware creation suggestions</div>
                    <div>Runtime migration pending</div>
                  </div>
                </section>
                <section className="rounded-[20px] border border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.76)] p-4">
                  <div className="text-sm font-semibold text-[var(--text)]">Graph Info</div>
                  <div className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    <div>Nodes: {nodes.length}</div>
                    <div>Edges: {edges.length}</div>
                    <div>Built from new preset system</div>
                  </div>
                </section>
              </div>
            ) : null}

            {selectedNode ? (
              <div className="grid gap-4">
                <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                  <span>Label</span>
                  <Input value={selectedNode.data.config.label} onChange={(event) => updateSelectedNode((config) => ({ ...config, label: event.target.value }))} />
                </label>
                <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                  <span>Description</span>
                  <Input value={selectedNode.data.config.description} onChange={(event) => updateSelectedNode((config) => ({ ...config, description: event.target.value }))} />
                </label>
                <div className="rounded-[20px] border border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.76)] p-4 text-sm leading-6 text-[var(--muted)]">
                  <div>Family: {selectedNode.data.config.family}</div>
                  <div>Preset ID: {selectedNode.data.config.presetId}</div>
                </div>

                {selectedNode.data.config.family === "input" ? (
                  <>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Value Type</span>
                      <select
                        className="rounded-[14px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3 py-3 text-[var(--text)]"
                        value={selectedNode.data.config.valueType}
                        onChange={(event) =>
                          updateSelectedNode((config) => {
                            const nextType = event.target.value as ValueType;
                            const inputConfig = config as InputBoundaryNode;
                            return {
                              ...inputConfig,
                              valueType: nextType,
                              output: {
                                ...inputConfig.output,
                                valueType: nextType,
                              },
                            };
                          })
                        }
                      >
                        {Object.keys(TYPE_COLORS).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Default Value</span>
                      <textarea
                        className="min-h-32 rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3 text-[var(--text)]"
                        value={selectedNode.data.config.defaultValue}
                        onChange={(event) => updateSelectedNode((config) => ({ ...(config as InputBoundaryNode), defaultValue: event.target.value }))}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Placeholder</span>
                      <Input value={selectedNode.data.config.placeholder} onChange={(event) => updateSelectedNode((config) => ({ ...(config as InputBoundaryNode), placeholder: event.target.value }))} />
                    </label>
                  </>
                ) : null}

                {selectedNode.data.config.family === "agent" ? (
                  <>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>System Instruction</span>
                      <textarea
                        className="min-h-28 rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3 text-[var(--text)]"
                        value={selectedNode.data.config.systemInstruction}
                        onChange={(event) => updateSelectedNode((config) => ({ ...(config as AgentNode), systemInstruction: event.target.value }))}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Task Instruction</span>
                      <textarea
                        className="min-h-32 rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3 text-[var(--text)]"
                        value={selectedNode.data.config.taskInstruction}
                        onChange={(event) => updateSelectedNode((config) => ({ ...(config as AgentNode), taskInstruction: event.target.value }))}
                      />
                    </label>
                    <JsonTextArea label="Inputs JSON" value={selectedNode.data.config.inputs} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as AgentNode), inputs: nextValue as PortDefinition[] }))} />
                    <JsonTextArea label="Outputs JSON" value={selectedNode.data.config.outputs} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as AgentNode), outputs: nextValue as PortDefinition[] }))} />
                    <JsonTextArea label="Skills JSON" value={selectedNode.data.config.skills} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as AgentNode), skills: nextValue as AgentNode["skills"] }))} />
                    <JsonTextArea label="Output Binding JSON" value={selectedNode.data.config.outputBinding} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as AgentNode), outputBinding: nextValue as Record<string, string> }))} minHeight="min-h-24" />
                  </>
                ) : null}

                {selectedNode.data.config.family === "condition" ? (
                  <>
                    <JsonTextArea label="Inputs JSON" value={selectedNode.data.config.inputs} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as ConditionNode), inputs: nextValue as PortDefinition[] }))} />
                    <JsonTextArea label="Branches JSON" value={selectedNode.data.config.branches} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as ConditionNode), branches: nextValue as ConditionNode["branches"] }))} minHeight="min-h-24" />
                    <JsonTextArea label="Rule JSON" value={selectedNode.data.config.rule} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as ConditionNode), rule: nextValue as ConditionNode["rule"] }))} minHeight="min-h-24" />
                    <JsonTextArea label="Branch Mapping JSON" value={selectedNode.data.config.branchMapping} onChange={(nextValue) => updateSelectedNode((config) => ({ ...(config as ConditionNode), branchMapping: nextValue as Record<string, string> }))} minHeight="min-h-24" />
                  </>
                ) : null}

                {selectedNode.data.config.family === "output" ? (
                  <>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Display Mode</span>
                      <select
                        className="rounded-[14px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3 py-3 text-[var(--text)]"
                        value={selectedNode.data.config.displayMode}
                        onChange={(event) => updateSelectedNode((config) => ({ ...(config as OutputBoundaryNode), displayMode: event.target.value as OutputBoundaryNode["displayMode"] }))}
                      >
                        {["auto", "plain", "markdown", "json"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <input
                        checked={selectedNode.data.config.persistEnabled}
                        type="checkbox"
                        onChange={(event) => updateSelectedNode((config) => ({ ...(config as OutputBoundaryNode), persistEnabled: event.target.checked }))}
                      />
                      <span>Persist output</span>
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>Persist Format</span>
                      <select
                        className="rounded-[14px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3 py-3 text-[var(--text)]"
                        value={selectedNode.data.config.persistFormat}
                        onChange={(event) => updateSelectedNode((config) => ({ ...(config as OutputBoundaryNode), persistFormat: event.target.value as OutputBoundaryNode["persistFormat"] }))}
                      >
                        {["txt", "md", "json"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--muted)]">
                      <span>File Name Template</span>
                      <Input value={selectedNode.data.config.fileNameTemplate} onChange={(event) => updateSelectedNode((config) => ({ ...(config as OutputBoundaryNode), fileNameTemplate: event.target.value }))} />
                    </label>
                  </>
                ) : null}

                <Button variant="ghost" onClick={saveSelectedNodeAsPreset}>
                  Save As Preset
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
                    setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
                    setSelectedNodeId(null);
                  }}
                >
                  Delete Node
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[18px] border border-[rgba(154,52,18,0.16)] bg-[rgba(255,250,241,0.92)] px-3 py-2 text-sm text-[var(--muted)]">
            <span>Status</span>
            <span className="text-[var(--text)]">{statusMessage}</span>
          </div>
        </aside>
      </div>

      <footer className="flex items-center justify-between border-t border-[rgba(154,52,18,0.16)] bg-[rgba(255,250,241,0.82)] px-4 text-sm text-[var(--muted)]">
        <span>{nodes.length} nodes / {edges.length} edges</span>
        <span>Double click canvas or drag from an output handle to open preset suggestions.</span>
      </footer>
    </div>
  );
}

export function NodeSystemEditor(props: EditorClientProps) {
  const graph = props.initialGraph ?? createEditorDefaults(props.templates);

  return (
    <ReactFlowProvider>
      <NodeSystemCanvas initialGraph={graph} />
    </ReactFlowProvider>
  );
}
