import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHumanReviewRows,
  buildHumanReviewResumePayload,
  formatHumanReviewDraftValue,
} from "./humanReviewPanelModel.ts";
import type { GraphPayload } from "@/types/node-system";
import type { RunDetail } from "@/types/run";

function createDocument(): GraphPayload {
  return {
    graph_id: null,
    name: "Review Demo",
    state_schema: {
      question: {
        name: "question",
        description: "User question",
        type: "text",
        value: "",
        color: "#d97706",
      },
      score: {
        name: "score",
        description: "Confidence score",
        type: "number",
        value: 0,
        color: "#2563eb",
      },
    },
    nodes: {},
    edges: [],
    conditional_edges: [],
    metadata: {},
  };
}

function createRun(): RunDetail {
  return {
    run_id: "run-1",
    graph_id: "graph-1",
    graph_name: "Review Demo",
    status: "awaiting_human",
    runtime_backend: "langgraph",
    lifecycle: { updated_at: "", resume_count: 0, pause_reason: "breakpoint" },
    checkpoint_metadata: { available: true, checkpoint_id: "cp-1", thread_id: "thread-1" },
    current_node_id: "answer_helper",
    revision_round: 0,
    started_at: "",
    metadata: {},
    selected_skills: [],
    skill_outputs: [],
    evaluation_result: {},
    knowledge_summary: "",
    memory_summary: "",
    final_result: "",
    node_status_map: { answer_helper: "paused" },
    node_executions: [],
    warnings: [],
    errors: [],
    output_previews: [],
    artifacts: {
      state_values: {
        question: "What is GraphiteUI?",
        score: 0.8,
      },
    },
    state_snapshot: {
      values: {},
      last_writers: {},
    },
    graph_snapshot: {},
  };
}

test("buildHumanReviewRows lists runtime state values with graph metadata", () => {
  const rows = buildHumanReviewRows(createRun(), createDocument());

  assert.deepEqual(
    rows.map((row) => [row.key, row.label, row.type, row.color, row.draft]),
    [
      ["question", "question", "text", "#d97706", "What is GraphiteUI?"],
      ["score", "score", "number", "#2563eb", "0.8"],
    ],
  );
});

test("buildHumanReviewResumePayload returns only changed parsed state values", () => {
  const rows = buildHumanReviewRows(createRun(), createDocument());
  const payload = buildHumanReviewResumePayload(rows, {
    question: "What is GraphiteUI?",
    score: "0.95",
  });

  assert.deepEqual(payload, { score: 0.95 });
});

test("formatHumanReviewDraftValue keeps structured values readable", () => {
  assert.equal(formatHumanReviewDraftValue("object", { ok: true }), '{\n  "ok": true\n}');
});
