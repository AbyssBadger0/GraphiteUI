import type { Edge, Node } from "@xyflow/react";

export type GraphNodeType =
  | "input"
  | "knowledge"
  | "memory"
  | "planner"
  | "skill_executor"
  | "evaluator"
  | "finalizer";

export type EvaluatorDecision = "pass" | "revise" | "fail";

export type GraphNodeConfig = {
  taskInput?: string;
  query?: string;
  memoryType?: string;
  plannerMode?: string;
  selectedSkills?: string[];
  evaluatorDecision?: EvaluatorDecision;
  score?: number;
  finalMessage?: string;
};

export type GraphNodeData = {
  label: string;
  kind: GraphNodeType;
  description: string;
  status?: "idle" | "running" | "success" | "failed";
  config: GraphNodeConfig;
};

export type GraphCanvasNode = Node<GraphNodeData>;
export type GraphCanvasEdge = Edge;

export type GraphDocument = {
  graphId: string;
  name: string;
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  updatedAt: string;
};
