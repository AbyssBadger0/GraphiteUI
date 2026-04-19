import type { NodeCreationEntry } from "@/types/node-system";

export const NODE_CREATION_FAMILY_PRIORITY: Record<NodeCreationEntry["family"], number> = {
  input: 0,
  output: 1,
  agent: 2,
  condition: 3,
};

export function buildBuiltinNodeCreationEntries(): NodeCreationEntry[] {
  return [
    {
      id: "node-input",
      family: "input",
      label: "Input",
      description: "Create a workflow input boundary.",
      mode: "node",
      origin: "builtin",
      nodeKind: "input",
      acceptsValueTypes: null,
    },
    {
      id: "node-output",
      family: "output",
      label: "Output",
      description: "Create a workflow output boundary.",
      mode: "node",
      origin: "builtin",
      nodeKind: "output",
      acceptsValueTypes: null,
    },
    {
      id: "preset-agent-empty",
      family: "agent",
      label: "Empty Agent Node",
      description: "Blank agent node.",
      mode: "preset",
      origin: "builtin",
      presetId: "preset.agent.empty.v0",
      acceptsValueTypes: null,
    },
    {
      id: "preset-condition-empty",
      family: "condition",
      label: "Condition Node",
      description: "Branch based on state.",
      mode: "preset",
      origin: "builtin",
      presetId: "preset.condition.empty.v0",
      acceptsValueTypes: null,
    },
  ];
}
