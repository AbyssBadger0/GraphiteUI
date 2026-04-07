import type { GraphCanvasEdge, GraphCanvasNode, GraphNodeType } from "@/types/editor";

type NodePreset = {
  kind: GraphNodeType;
  label: string;
  description: string;
};

export const NODE_PRESETS: NodePreset[] = [
  { kind: "input", label: "Input", description: "Collect task input and initialize run state." },
  {
    kind: "knowledge",
    label: "Knowledge",
    description: "Load or retrieve knowledge relevant to the task.",
  },
  { kind: "memory", label: "Memory", description: "Load past memory patterns into context." },
  { kind: "planner", label: "Planner", description: "Create an execution plan." },
  {
    kind: "skill_executor",
    label: "Skill Executor",
    description: "Run registered tools or helper skills.",
  },
  { kind: "evaluator", label: "Evaluator", description: "Score output and choose a route." },
  { kind: "finalizer", label: "Finalizer", description: "Collect outputs and finish the run." },
];

function createDefaultStarterNodes(): GraphCanvasNode[] {
  return [
    {
      id: "input_1",
      type: "default",
      position: { x: 80, y: 220 },
      data: {
        label: "Input",
        kind: "input",
        description: "Provide task input for the workflow.",
        status: "idle",
        config: {
          taskInput: "Describe the workflow task here.",
        },
      },
    },
    {
      id: "planner_1",
      type: "default",
      position: { x: 320, y: 220 },
      data: {
        label: "Planner",
        kind: "planner",
        description: "Create a plan using available context.",
        status: "idle",
        config: {
          plannerMode: "default",
        },
      },
    },
    {
      id: "evaluator_1",
      type: "default",
      position: { x: 560, y: 220 },
      data: {
        label: "Evaluator",
        kind: "evaluator",
        description: "Evaluate output and choose next route.",
        status: "idle",
        config: {
          evaluatorDecision: "pass",
          score: 8.5,
        },
      },
    },
    {
      id: "finalizer_1",
      type: "default",
      position: { x: 800, y: 220 },
      data: {
        label: "Finalizer",
        kind: "finalizer",
        description: "Return final result and wrap the run.",
        status: "idle",
        config: {
          finalMessage: "Finalize workflow output.",
        },
      },
    },
  ];
}

function createDefaultStarterEdges(): GraphCanvasEdge[] {
  return [
    { id: "edge_input_planner", source: "input_1", target: "planner_1" },
    { id: "edge_planner_eval", source: "planner_1", target: "evaluator_1" },
    {
      id: "edge_eval_finalizer",
      source: "evaluator_1",
      target: "finalizer_1",
      label: "pass",
    },
  ];
}

function createSlgCreativeFactoryNodes(): GraphCanvasNode[] {
  return [
    {
      id: "input_1",
      type: "default",
      position: { x: 80, y: 220 },
      data: {
        label: "Campaign Input",
        kind: "input",
        description: "Provide the campaign brief and target problem.",
        status: "idle",
        config: {
          taskInput:
            "Build an SLG creative factory workflow that researches market signals, analyzes benchmark ads, generates multiple script variants, storyboard packages, video prompts, and TODO payloads for image/video generation.",
        },
      },
    },
    {
      id: "planner_1",
      type: "default",
      position: { x: 300, y: 220 },
      data: {
        label: "Pipeline Planner",
        kind: "planner",
        description: "Create the high-level execution plan for the SLG creative pipeline.",
        status: "idle",
        config: { plannerMode: "careful" },
      },
    },
    {
      id: "skill_1",
      type: "default",
      position: { x: 540, y: 80 },
      data: {
        label: "News Research",
        kind: "skill_executor",
        description: "Fetch and clean market news for SLG creative hints.",
        status: "idle",
        config: { selectedSkills: ["slg_fetch_rss", "slg_clean_news"] },
      },
    },
    {
      id: "skill_2",
      type: "default",
      position: { x: 540, y: 220 },
      data: {
        label: "Benchmark Ads",
        kind: "skill_executor",
        description: "Fetch benchmark ads and normalize them into analysis-ready assets.",
        status: "idle",
        config: { selectedSkills: ["slg_fetch_ads", "slg_normalize_assets", "slg_select_top_videos"] },
      },
    },
    {
      id: "skill_3",
      type: "default",
      position: { x: 780, y: 220 },
      data: {
        label: "Asset Analysis",
        kind: "skill_executor",
        description: "Analyze selected ads and extract creative patterns.",
        status: "idle",
        config: { selectedSkills: ["slg_analyze_videos", "slg_extract_patterns", "slg_build_brief"] },
      },
    },
    {
      id: "skill_4",
      type: "default",
      position: { x: 1020, y: 220 },
      data: {
        label: "Creative Generation",
        kind: "skill_executor",
        description: "Generate variants, storyboards, and video prompt packages.",
        status: "idle",
        config: {
          selectedSkills: ["slg_generate_variants", "slg_generate_storyboards", "slg_generate_video_prompts"],
        },
      },
    },
    {
      id: "skill_5",
      type: "default",
      position: { x: 1260, y: 220 },
      data: {
        label: "Variant Review",
        kind: "skill_executor",
        description: "Review variants and prepare evaluator payload.",
        status: "idle",
        config: { selectedSkills: ["slg_review_variants"] },
      },
    },
    {
      id: "evaluator_1",
      type: "default",
      position: { x: 1500, y: 220 },
      data: {
        label: "Evaluator",
        kind: "evaluator",
        description: "Route pass/revise/fail based on upstream review result.",
        status: "idle",
        config: { evaluatorDecision: "pass", score: 8.5 },
      },
    },
    {
      id: "skill_6",
      type: "default",
      position: { x: 1740, y: 140 },
      data: {
        label: "Image TODO",
        kind: "skill_executor",
        description: "Prepare image-generation TODO package.",
        status: "idle",
        config: { selectedSkills: ["slg_prepare_image_todo"] },
      },
    },
    {
      id: "skill_7",
      type: "default",
      position: { x: 1980, y: 140 },
      data: {
        label: "Video TODO",
        kind: "skill_executor",
        description: "Prepare video-generation TODO package.",
        status: "idle",
        config: { selectedSkills: ["slg_prepare_video_todo"] },
      },
    },
    {
      id: "finalizer_1",
      type: "default",
      position: { x: 2220, y: 220 },
      data: {
        label: "Finalizer",
        kind: "finalizer",
        description: "Collect pipeline outputs and finish the run.",
        status: "idle",
        config: { finalMessage: "Finalize SLG creative factory output." },
      },
    },
  ];
}

function createSlgCreativeFactoryEdges(): GraphCanvasEdge[] {
  return [
    { id: "edge_1", source: "input_1", target: "planner_1" },
    { id: "edge_2", source: "planner_1", target: "skill_1" },
    { id: "edge_3", source: "skill_1", target: "skill_2" },
    { id: "edge_4", source: "skill_2", target: "skill_3" },
    { id: "edge_5", source: "skill_3", target: "skill_4" },
    { id: "edge_6", source: "skill_4", target: "skill_5" },
    { id: "edge_7", source: "skill_5", target: "evaluator_1" },
    { id: "edge_8", source: "evaluator_1", target: "skill_6", label: "pass" },
    { id: "edge_9", source: "evaluator_1", target: "planner_1", label: "revise" },
    { id: "edge_10", source: "evaluator_1", target: "finalizer_1", label: "fail" },
    { id: "edge_11", source: "skill_6", target: "skill_7" },
    { id: "edge_12", source: "skill_7", target: "finalizer_1" },
  ];
}

export function createStarterGraphDocument(graphId: string): {
  name: string;
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
} {
  if (graphId === "slg-creative-factory") {
    return {
      name: "SLG Creative Factory",
      nodes: createSlgCreativeFactoryNodes(),
      edges: createSlgCreativeFactoryEdges(),
    };
  }

  return {
    name: graphId === "demo-graph" ? "Demo Graph" : "Untitled Graph",
    nodes: createDefaultStarterNodes(),
    edges: createDefaultStarterEdges(),
  };
}
