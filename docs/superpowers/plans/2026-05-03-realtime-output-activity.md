# Realtime Output And Run Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a realtime run activity panel and make existing Output nodes show the live stream for the state they read, including multi-state JSON output routed by top-level JSON key.

**Architecture:** Keep Output nodes as visual display nodes, not runtime execution nodes. Use the existing SSE/EventSource run stream as the single realtime transport, add missing node/state/activity events, and let the frontend route stream chunks to Output previews only when the chunk can be attributed to a specific state. Run Activity consumes all run events as an ordered feed and auto-scrolls to the newest item unless the user is reviewing older items.

**Tech Stack:** Python/FastAPI runtime, existing SSE run event stream, Vue 3 + TypeScript frontend, Element Plus UI, Node structure/model tests, pytest backend tests.

---

## File Structure

- Modify `backend/app/core/runtime/run_events.py`: keep SSE transport, add event sequence support in payloads through helper functions.
- Modify `backend/app/core/runtime/state_io.py`: enrich write records and state events with `previous_value`, `sequence`, and stable timestamps.
- Modify `backend/app/core/langgraph/runtime.py`: publish `node.started`, `state.updated`, `node.completed`, and `node.failed` around actual LangGraph runtime node execution.
- Modify `backend/app/core/runtime/agent_streaming.py`: keep raw node stream events and add metadata needed for downstream JSON routing; publish safe reasoning summary events when reasoning is available after completion.
- Modify `backend/app/core/runtime/node_handlers.py`: pass output/state metadata into streaming callbacks without changing Output node runtime semantics.
- Create `frontend/src/lib/streamingJsonStateRouter.ts`: parse partial top-level JSON text and return per-state string previews by actual emitted key.
- Create `frontend/src/lib/streamingJsonStateRouter.test.ts`: regression coverage for multi-state JSON streams.
- Modify `frontend/src/lib/run-event-stream.ts`: route Output previews from explicit `state_key` first, then JSON key routing, then single-output fallback; avoid broadcasting ambiguous multi-state streams to every Output.
- Modify `frontend/src/lib/run-event-stream.test.ts`: cover single-state fallback, multi-state JSON key routing, and ambiguous multi-state no-op behavior.
- Create `frontend/src/editor/workspace/runActivityModel.ts`: convert SSE events and final run details into ordered activity entries.
- Create `frontend/src/editor/workspace/runActivityModel.test.ts`: cover ordering, folding labels, stream updates, state updates, and final detail reconciliation.
- Create `frontend/src/editor/workspace/EditorRunActivityPanel.vue`: right-side auto-scrolling activity feed.
- Create `frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts`: structure and UX guardrails.
- Modify `frontend/src/editor/workspace/EditorActionCapsule.vue`: add a compact Trace/运行态 entry next to State.
- Modify `frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts`: ensure the new entry exists and has active state styling.
- Modify `frontend/src/editor/workspace/workspaceSidePanelModel.ts`: add `"run-activity"` side panel mode.
- Modify `frontend/src/editor/workspace/useWorkspaceSidePanelController.ts`: expose `toggleActiveRunActivityPanel` and preserve Human Review lock behavior.
- Modify `frontend/src/editor/workspace/EditorWorkspaceShell.vue`: wire panel mode, run activity state, EventSource updates, and side panel rendering.
- Modify `frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts`: assert wiring and responsive layout.
- Modify `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts`: feed event payloads into Output preview updates and Run Activity state.
- Modify `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts`: cover EventSource state updates, JSON routed Output previews, and final polling reconciliation.
- Modify `frontend/src/i18n/messages.ts` and `frontend/src/i18n/additionalMessages.ts`: add concise labels for the new panel.

## Product Semantics

- Output node name stays `Output`.
- Output nodes remain display nodes; they do not drive control flow, do not block a graph, and do not become LangGraph runtime nodes.
- Output nodes refresh from the state they read.
- `node.output.delta` is always visible in Run Activity as node-level stream text.
- Output node cards only use `node.output.delta` when it can be routed to their read state:
  - explicit `state_key` in the event;
  - top-level JSON key in the streamed object mapped to a written state;
  - one written state only, as a safe fallback.
- If a multi-state Agent stream cannot be routed to a specific state, Output nodes do not display that temporary stream; Run Activity still displays the node-level stream.
- `state.updated` is the authority. Once received, it overrides any temporary Output preview for that state.
- Top-level JSON keys are interpreted in the order the stream actually emits them. The implementation must not present any extra product promise about authored or assembled ordering.
- Thinking/reasoning display is a safe activity panel feature. Show provider-supplied reasoning summaries or reasoning deltas when available; do not invent hidden chain-of-thought.

---

### Task 1: Backend State Write Event Data

**Files:**
- Modify: `backend/app/core/runtime/state_io.py`
- Test: `backend/tests/test_runtime_state_io.py`

- [ ] **Step 1: Write the failing test**

Append this test to `backend/tests/test_runtime_state_io.py`:

```python
def test_apply_state_writes_records_previous_value_and_sequence_for_activity_feed(self) -> None:
    mode = SimpleNamespace(value="replace")
    write_bindings = [SimpleNamespace(state="answer", mode=mode)]
    state = {
        "state_values": {"answer": "old"},
        "state_events": [{"sequence": 1, "state_key": "question"}],
    }

    records = apply_state_writes(
        "agent_writer",
        write_bindings,
        {"answer": "new"},
        state,
    )

    self.assertEqual(records[0]["previous_value"], "old")
    self.assertEqual(records[0]["value"], "new")
    self.assertEqual(records[0]["sequence"], 2)
    self.assertEqual(state["state_events"][-1]["previous_value"], "old")
    self.assertEqual(state["state_events"][-1]["value"], "new")
    self.assertEqual(state["state_events"][-1]["sequence"], 2)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python -m pytest backend/tests/test_runtime_state_io.py::RuntimeStateIoTests::test_apply_state_writes_records_previous_value_and_sequence_for_activity_feed -q
```

Expected: FAIL because write records and state events do not include `previous_value` or `sequence`.

- [ ] **Step 3: Implement minimal state event enrichment**

In `backend/app/core/runtime/state_io.py`, add:

```python
def _next_state_event_sequence(state_events: list[dict[str, Any]]) -> int:
    max_sequence = 0
    for event in state_events:
        try:
            max_sequence = max(max_sequence, int(event.get("sequence", 0)))
        except (TypeError, ValueError):
            continue
    return max_sequence + 1
```

Then in `apply_state_writes`, before appending each event:

```python
        event_sequence = _next_state_event_sequence(state_events)
        created_at = utc_now_iso()
```

Update `writer_record`, `state_events.append(...)`, and `write_records.append(...)` so the event and returned write record contain:

```python
                "previous_value": previous_value,
                "sequence": event_sequence,
                "created_at": created_at,
```

Keep `updated_at` and `created_at` using the same `created_at` value for a single write.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python -m pytest backend/tests/test_runtime_state_io.py::RuntimeStateIoTests::test_apply_state_writes_records_previous_value_and_sequence_for_activity_feed -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/runtime/state_io.py backend/tests/test_runtime_state_io.py
git commit -m "增强运行态 State 写入记录"
```

---

### Task 2: Backend Node And State SSE Events

**Files:**
- Modify: `backend/app/core/langgraph/runtime.py`
- Test: Create `backend/tests/test_langgraph_runtime_progress_events.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_langgraph_runtime_progress_events.py` with:

```python
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.langgraph.runtime import execute_node_system_graph_langgraph
from app.core.schemas.node_system import NodeSystemGraphDocument


class LangGraphRuntimeProgressEventTests(unittest.TestCase):
    def test_langgraph_runtime_publishes_node_and_state_activity_events(self) -> None:
        graph = NodeSystemGraphDocument.model_validate(
            {
                "graph_id": "graph_1",
                "name": "Activity Graph",
                "state_schema": {
                    "question": {"name": "Question", "type": "text", "value": "Abyss"},
                    "answer": {"name": "Answer", "type": "text"},
                },
                "nodes": {
                    "input_question": {
                        "kind": "input",
                        "ui": {"position": {"x": 0, "y": 0}},
                        "writes": [{"state": "question"}],
                    },
                    "agent_answer": {
                        "kind": "agent",
                        "ui": {"position": {"x": 240, "y": 0}},
                        "reads": [{"state": "question"}],
                        "writes": [{"state": "answer"}],
                        "config": {"taskInstruction": "Say hello.", "skills": []},
                    },
                    "output_answer": {
                        "kind": "output",
                        "ui": {"position": {"x": 480, "y": 0}},
                        "reads": [{"state": "answer"}],
                    },
                },
                "edges": [
                    {"source": "input_question", "target": "agent_answer"},
                    {"source": "agent_answer", "target": "output_answer"},
                ],
                "conditional_edges": [],
            }
        )
        events: list[tuple[str, str, dict]] = []

        with patch("app.core.langgraph.runtime.publish_run_event") as publish, patch(
            "app.core.runtime.agent_response_generation.chat_with_model_ref_with_meta"
        ) as chat:
            publish.side_effect = lambda run_id, event_type, payload=None: events.append((run_id, event_type, payload or {}))
            chat.return_value = ('{"answer":"Hello, Abyss!"}', {"warnings": [], "model": "test"})
            execute_node_system_graph_langgraph(
                graph,
                {"run_id": "run_1", "status": "running"},
                persist_progress=True,
            )

        event_types = [event_type for _run_id, event_type, _payload in events]
        self.assertIn("node.started", event_types)
        self.assertIn("state.updated", event_types)
        self.assertIn("node.completed", event_types)
        state_event = next(payload for _run_id, event_type, payload in events if event_type == "state.updated" and payload["state_key"] == "answer")
        self.assertEqual(state_event["node_id"], "agent_answer")
        self.assertEqual(state_event["value"], "Hello, Abyss!")
        self.assertEqual(state_event["sequence"], 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python -m pytest backend/tests/test_langgraph_runtime_progress_events.py -q
```

Expected: FAIL because `node.started`, `state.updated`, and `node.completed` are not published.

- [ ] **Step 3: Add event publishing in runtime**

In `backend/app/core/langgraph/runtime.py`, import:

```python
from app.core.runtime.run_events import publish_run_event
```

Inside `_build_langgraph_node_callable._call`, after setting node status to running:

```python
            publish_run_event(
                str(state.get("run_id") or ""),
                "node.started",
                {
                    "node_id": node_name,
                    "node_type": node.kind,
                    "status": "running",
                    "started_at": utc_now_iso(),
                },
            )
```

After `state_writes = apply_state_writes(...)`, publish each write:

```python
                for write in state_writes:
                    publish_run_event(
                        str(state.get("run_id") or ""),
                        "state.updated",
                        {
                            "node_id": node_name,
                            "node_type": node.kind,
                            "state_key": write["state_key"],
                            "output_key": write["output_key"],
                            "mode": write.get("mode", "replace"),
                            "value": write.get("value"),
                            "previous_value": write.get("previous_value"),
                            "changed": bool(write.get("changed")),
                            "sequence": write.get("sequence"),
                        },
                    )
```

After the node execution entry is appended and before progress persistence:

```python
                publish_run_event(
                    str(state.get("run_id") or ""),
                    "node.completed",
                    {
                        "node_id": node_name,
                        "node_type": node.kind,
                        "status": "success",
                        "duration_ms": duration_ms,
                        "output_keys": list(outputs.keys()),
                    },
                )
```

Inside the exception path before raising:

```python
                publish_run_event(
                    str(state.get("run_id") or ""),
                    "node.failed",
                    {
                        "node_id": node_name,
                        "node_type": node.kind,
                        "status": "failed",
                        "duration_ms": duration_ms,
                        "error": str(exc),
                    },
                )
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python -m pytest backend/tests/test_langgraph_runtime_progress_events.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/langgraph/runtime.py backend/tests/test_langgraph_runtime_progress_events.py
git commit -m "发布运行节点和 State 实时事件"
```

---

### Task 3: Backend Stream Metadata And Safe Reasoning Activity

**Files:**
- Modify: `backend/app/core/runtime/agent_streaming.py`
- Modify: `backend/app/core/runtime/node_handlers.py`
- Test: `backend/tests/test_agent_streaming_runtime.py`
- Test: `backend/tests/test_node_handlers_runtime.py`

- [ ] **Step 1: Write failing stream metadata test**

Append to `backend/tests/test_agent_streaming_runtime.py`:

```python
    def test_stream_delta_callback_accepts_state_stream_metadata(self) -> None:
        state = {"run_id": "run_1"}

        with patch("app.core.runtime.agent_streaming.publish_run_event") as publish:
            callback = build_agent_stream_delta_callback(
                state=state,
                node_name="agent",
                output_keys=["greeting_zh", "greeting_en"],
                stream_state_keys=["greeting_zh", "greeting_en"],
            )
            self.assertIsNotNone(callback)
            callback('{"greeting_zh":"你好')

        payload = publish.call_args.args[2]
        self.assertEqual(payload["output_keys"], ["greeting_zh", "greeting_en"])
        self.assertEqual(payload["stream_state_keys"], ["greeting_zh", "greeting_en"])
        self.assertEqual(payload["text"], '{"greeting_zh":"你好')
```

- [ ] **Step 2: Write failing reasoning completed test**

Append to `backend/tests/test_agent_streaming_runtime.py`:

```python
    def test_finalize_agent_stream_delta_publishes_reasoning_summary_when_available(self) -> None:
        state = {
            "run_id": "run_1",
            "streaming_outputs": {
                "agent": {
                    "node_id": "agent",
                    "output_keys": ["answer"],
                    "text": '{"answer":"ok"}',
                    "chunk_count": 1,
                    "completed": False,
                }
            },
        }

        with patch("app.core.runtime.agent_streaming.publish_run_event") as publish:
            finalize_agent_stream_delta(
                state=state,
                node_name="agent",
                output_values={"answer": "ok"},
                reasoning="Checked the input and selected a greeting.",
            )

        self.assertEqual(publish.call_args_list[-1].args[1], "node.reasoning.completed")
        self.assertEqual(publish.call_args_list[-1].args[2]["reasoning"], "Checked the input and selected a greeting.")
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
python -m pytest backend/tests/test_agent_streaming_runtime.py::AgentStreamingRuntimeTests::test_stream_delta_callback_accepts_state_stream_metadata backend/tests/test_agent_streaming_runtime.py::AgentStreamingRuntimeTests::test_finalize_agent_stream_delta_publishes_reasoning_summary_when_available -q
```

Expected: FAIL because the functions do not accept the new parameters or publish reasoning summary.

- [ ] **Step 4: Implement metadata and reasoning summary**

In `backend/app/core/runtime/agent_streaming.py`, update `build_agent_stream_delta_callback` signature:

```python
def build_agent_stream_delta_callback(
    *,
    state: dict[str, Any],
    node_name: str,
    output_keys: list[str],
    stream_state_keys: list[str] | None = None,
):
```

Add to `stream_record`:

```python
            "stream_state_keys": list(stream_state_keys or output_keys),
```

Update `finalize_agent_stream_delta` signature:

```python
def finalize_agent_stream_delta(
    *,
    state: dict[str, Any],
    node_name: str,
    output_values: dict[str, Any],
    reasoning: str | None = None,
) -> None:
```

After publishing `node.output.completed`, publish:

```python
    reasoning_text = str(reasoning or "").strip()
    if reasoning_text:
        publish_run_event(
            str(state.get("run_id") or ""),
            "node.reasoning.completed",
            {
                "node_id": node_name,
                "reasoning": reasoning_text,
                "updated_at": utc_now_iso(),
            },
        )
```

In `backend/app/core/runtime/node_handlers.py`, pass stream state keys:

```python
    stream_delta_callback = build_agent_stream_delta_callback_func(
        state=state,
        node_name=node_name,
        output_keys=output_keys,
        stream_state_keys=output_keys,
    )
```

Then pass reasoning into finalize:

```python
    finalize_agent_stream_delta_func(
        state=state,
        node_name=node_name,
        output_values=output_values,
        reasoning=response_reasoning,
    )
```

Tests that use `lambda *, state, node_name, output_keys: ...` must be updated to accept `**kwargs` or `stream_state_keys`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
python -m pytest backend/tests/test_agent_streaming_runtime.py backend/tests/test_node_handlers_runtime.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/runtime/agent_streaming.py backend/app/core/runtime/node_handlers.py backend/tests/test_agent_streaming_runtime.py backend/tests/test_node_handlers_runtime.py
git commit -m "补充 Agent 流式事件元数据"
```

---

### Task 4: Frontend Streaming JSON State Router

**Files:**
- Create: `frontend/src/lib/streamingJsonStateRouter.ts`
- Create: `frontend/src/lib/streamingJsonStateRouter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/lib/streamingJsonStateRouter.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { routeStreamingJsonStateText } from "./streamingJsonStateRouter.ts";

test("routeStreamingJsonStateText routes partial top-level JSON string fields by emitted key", () => {
  assert.deepEqual(
    routeStreamingJsonStateText('{"greeting_zh":"你好，Abyss","greeting_en":"Hel', ["greeting_zh", "greeting_en"]),
    {
      greeting_zh: { text: "你好，Abyss", completed: true },
      greeting_en: { text: "Hel", completed: false },
    },
  );
});

test("routeStreamingJsonStateText decodes escaped string content without treating nested keys as states", () => {
  assert.deepEqual(
    routeStreamingJsonStateText('{"answer":"Line 1\\nLine 2","payload":{"answer":"nested"}}', ["answer"]),
    {
      answer: { text: "Line 1\nLine 2", completed: true },
    },
  );
});

test("routeStreamingJsonStateText ignores arrays and objects until state.updated provides the authority", () => {
  assert.deepEqual(
    routeStreamingJsonStateText('{"evidence_links":[{"title":"A"}],"final_answer":"Done', ["evidence_links", "final_answer"]),
    {
      final_answer: { text: "Done", completed: false },
    },
  );
});

test("routeStreamingJsonStateText returns an empty map for non-json stream text", () => {
  assert.deepEqual(routeStreamingJsonStateText("plain text", ["answer"]), {});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx tsx --test frontend/src/lib/streamingJsonStateRouter.test.ts
```

Expected: FAIL because `streamingJsonStateRouter.ts` does not exist.

- [ ] **Step 3: Implement partial top-level JSON string parser**

Create `frontend/src/lib/streamingJsonStateRouter.ts`:

```ts
export type StreamingJsonStateRoute = {
  text: string;
  completed: boolean;
};

export function routeStreamingJsonStateText(text: string, stateKeys: string[]) {
  const allowedKeys = new Set(stateKeys.filter(Boolean));
  const routes: Record<string, StreamingJsonStateRoute> = {};
  const source = text.trimStart();
  if (!source.startsWith("{")) {
    return routes;
  }

  let index = source.indexOf("{") + 1;
  while (index < source.length) {
    index = skipWhitespaceAndComma(source, index);
    const keyResult = readJsonString(source, index);
    if (!keyResult) {
      break;
    }
    index = skipWhitespace(source, keyResult.nextIndex);
    if (source[index] !== ":") {
      break;
    }
    index = skipWhitespace(source, index + 1);
    if (source[index] === '"') {
      const valueResult = readJsonString(source, index, true);
      if (!valueResult) {
        break;
      }
      if (allowedKeys.has(keyResult.value)) {
        routes[keyResult.value] = {
          text: valueResult.value,
          completed: valueResult.completed,
        };
      }
      index = valueResult.nextIndex;
      continue;
    }
    index = skipJsonValue(source, index);
  }

  return routes;
}

function skipWhitespaceAndComma(source: string, index: number) {
  let cursor = index;
  while (cursor < source.length && (/\s/.test(source[cursor]) || source[cursor] === ",")) {
    cursor += 1;
  }
  return cursor;
}

function skipWhitespace(source: string, index: number) {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function readJsonString(source: string, index: number, allowPartial = false) {
  if (source[index] !== '"') {
    return null;
  }
  let cursor = index + 1;
  let value = "";
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '"') {
      return { value, nextIndex: cursor + 1, completed: true };
    }
    if (char === "\\") {
      const escaped = source[cursor + 1];
      if (escaped === undefined) {
        return allowPartial ? { value, nextIndex: source.length, completed: false } : null;
      }
      value += decodeJsonEscape(escaped);
      cursor += 2;
      continue;
    }
    value += char;
    cursor += 1;
  }
  return allowPartial ? { value, nextIndex: source.length, completed: false } : null;
}

function decodeJsonEscape(char: string) {
  if (char === "n") return "\n";
  if (char === "r") return "\r";
  if (char === "t") return "\t";
  if (char === '"') return '"';
  if (char === "\\") return "\\";
  if (char === "/") return "/";
  return char;
}

function skipJsonValue(source: string, index: number) {
  let cursor = index;
  let depth = 0;
  let inString = false;
  while (cursor < source.length) {
    const char = source[cursor];
    if (inString) {
      if (char === "\\") {
        cursor += 2;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      cursor += 1;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      if (depth === 0) {
        return cursor;
      }
      depth -= 1;
    } else if (char === "," && depth === 0) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return cursor;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx tsx --test frontend/src/lib/streamingJsonStateRouter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/streamingJsonStateRouter.ts frontend/src/lib/streamingJsonStateRouter.test.ts
git commit -m "增加流式 JSON State 路由"
```

---

### Task 5: Output Preview Routing For Multi-State Streams

**Files:**
- Modify: `frontend/src/lib/run-event-stream.ts`
- Modify: `frontend/src/lib/run-event-stream.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `frontend/src/lib/run-event-stream.test.ts`:

```ts
test("buildRunEventOutputPreviewUpdate routes multi-state JSON streams to matching Output nodes only", () => {
  const document = {
    nodes: {
      output_zh: { kind: "output", reads: [{ state: "greeting_zh" }], config: { displayMode: "plain" } },
      output_en: { kind: "output", reads: [{ state: "greeting_en" }], config: { displayMode: "plain" } },
    },
  };

  assert.deepEqual(
    buildRunEventOutputPreviewUpdate(document, {}, {
      node_id: "agent_greeter",
      text: '{"greeting_zh":"你好，Abyss","greeting_en":"Hel',
      output_keys: ["greeting_zh", "greeting_en"],
      stream_state_keys: ["greeting_zh", "greeting_en"],
    }),
    {
      output_zh: { text: "你好，Abyss", displayMode: "plain" },
      output_en: { text: "Hel", displayMode: "plain" },
    },
  );
});

test("buildRunEventOutputPreviewUpdate does not broadcast ambiguous multi-state text streams", () => {
  const document = {
    nodes: {
      output_zh: { kind: "output", reads: [{ state: "greeting_zh" }] },
      output_en: { kind: "output", reads: [{ state: "greeting_en" }] },
    },
  };

  assert.equal(
    buildRunEventOutputPreviewUpdate(document, {}, {
      node_id: "agent_greeter",
      text: "plain model stream",
      output_keys: ["greeting_zh", "greeting_en"],
      stream_state_keys: ["greeting_zh", "greeting_en"],
    }),
    null,
  );
});

test("buildRunEventOutputPreviewUpdate applies authoritative state.updated values", () => {
  const document = {
    nodes: {
      output_answer: { kind: "output", reads: [{ state: "answer" }], config: { displayMode: "markdown" } },
    },
  };

  assert.deepEqual(
    buildRunEventOutputPreviewUpdate(document, {}, {
      event_type: "state.updated",
      state_key: "answer",
      value: "# Final",
    }),
    {
      output_answer: { text: "# Final", displayMode: "markdown" },
    },
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx tsx --test frontend/src/lib/run-event-stream.test.ts
```

Expected: FAIL because all multi-state streams still fan out to every matching Output.

- [ ] **Step 3: Implement routing priority**

In `frontend/src/lib/run-event-stream.ts`, import:

```ts
import { routeStreamingJsonStateText } from "./streamingJsonStateRouter.ts";
```

Add helpers:

```ts
export function stringifyRunEventPreviewValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

function resolveOutputNodeIdsForState(document: RunEventPreviewDocument | null | undefined, stateKey: string) {
  if (!document || !stateKey) {
    return [];
  }
  return Object.entries(document.nodes)
    .filter(([, node]) => node.kind === "output" && node.reads?.some((read) => read.state === stateKey))
    .map(([nodeId]) => nodeId);
}
```

Update `buildRunEventOutputPreviewUpdate` to use this order:

```ts
  const explicitStateKey = typeof payload.state_key === "string" ? payload.state_key.trim() : "";
  if (explicitStateKey) {
    const previewNodeIds = resolveOutputNodeIdsForState(document, explicitStateKey);
    return previewNodeIds.length > 0
      ? buildRunEventOutputPreviewByNodeId(currentPreviewByNodeId, previewNodeIds, stringifyRunEventPreviewValue(payload.value ?? payload.text), document)
      : null;
  }

  const streamStateKeys = listRunEventOutputKeys({ output_keys: payload.stream_state_keys }, listRunEventOutputKeys(payload));
  if (streamStateKeys.length > 1) {
    const routed = routeStreamingJsonStateText(resolveRunEventText(payload), streamStateKeys);
    const nextPreviewByNodeId = { ...currentPreviewByNodeId };
    let changed = false;
    for (const [stateKey, route] of Object.entries(routed)) {
      const previewNodeIds = resolveOutputNodeIdsForState(document, stateKey);
      for (const nodeId of previewNodeIds) {
        nextPreviewByNodeId[nodeId] = {
          text: route.text,
          displayMode: resolveRunEventPreviewDisplayMode(document, nodeId),
        };
        changed = true;
      }
    }
    return changed ? nextPreviewByNodeId : null;
  }
```

Keep the existing single-output fallback for `streamStateKeys.length <= 1`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx tsx --test frontend/src/lib/streamingJsonStateRouter.test.ts frontend/src/lib/run-event-stream.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/run-event-stream.ts frontend/src/lib/run-event-stream.test.ts
git commit -m "修正 Output 多 State 流式路由"
```

---

### Task 6: Run Activity Data Model

**Files:**
- Create: `frontend/src/editor/workspace/runActivityModel.ts`
- Create: `frontend/src/editor/workspace/runActivityModel.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/editor/workspace/runActivityModel.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { appendRunActivityEvent, buildRunActivityEntriesFromRun, type RunActivityState } from "./runActivityModel.ts";
import type { RunDetail } from "@/types/run";

test("appendRunActivityEvent appends node streams and state updates in event order", () => {
  let state: RunActivityState = { entries: [], autoFollow: true };
  state = appendRunActivityEvent(state, {
    eventType: "node.started",
    payload: { node_id: "agent", node_type: "agent", created_at: "2026-05-03T01:00:00Z" },
  });
  state = appendRunActivityEvent(state, {
    eventType: "node.output.delta",
    payload: { node_id: "agent", text: '{"answer":"Hel', output_keys: ["answer"], created_at: "2026-05-03T01:00:01Z" },
  });
  state = appendRunActivityEvent(state, {
    eventType: "state.updated",
    payload: { node_id: "agent", state_key: "answer", value: "Hello", sequence: 1, created_at: "2026-05-03T01:00:02Z" },
  });

  assert.deepEqual(
    state.entries.map((entry) => ({ kind: entry.kind, nodeId: entry.nodeId, stateKey: entry.stateKey, preview: entry.preview })),
    [
      { kind: "node-started", nodeId: "agent", stateKey: null, preview: "agent running" },
      { kind: "node-stream", nodeId: "agent", stateKey: null, preview: '{"answer":"Hel' },
      { kind: "state-updated", nodeId: "agent", stateKey: "answer", preview: "Hello" },
    ],
  );
});

test("buildRunActivityEntriesFromRun replays stored state events for completed run details", () => {
  const run = {
    run_id: "run_1",
    artifacts: {
      state_events: [
        { node_id: "agent", state_key: "answer", output_key: "answer", mode: "replace", value: "Hello", sequence: 1, created_at: "2026-05-03T01:00:02Z" },
      ],
    },
    node_executions: [],
  } as unknown as RunDetail;

  assert.deepEqual(
    buildRunActivityEntriesFromRun(run).map((entry) => ({ kind: entry.kind, stateKey: entry.stateKey, preview: entry.preview })),
    [{ kind: "state-updated", stateKey: "answer", preview: "Hello" }],
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/runActivityModel.test.ts
```

Expected: FAIL because `runActivityModel.ts` does not exist.

- [ ] **Step 3: Implement model**

Create `frontend/src/editor/workspace/runActivityModel.ts`:

```ts
import type { RunDetail } from "@/types/run";

export type RunActivityKind = "node-started" | "node-stream" | "state-updated" | "node-completed" | "node-failed" | "reasoning";

export type RunActivityEntry = {
  id: string;
  kind: RunActivityKind;
  nodeId: string | null;
  nodeType: string | null;
  stateKey: string | null;
  title: string;
  preview: string;
  detail: unknown;
  createdAt: string;
  sequence: number;
  active: boolean;
};

export type RunActivityState = {
  entries: RunActivityEntry[];
  autoFollow: boolean;
};

export type RunActivityIncomingEvent = {
  eventType: string;
  payload: Record<string, unknown>;
};

export function appendRunActivityEvent(state: RunActivityState, event: RunActivityIncomingEvent): RunActivityState {
  const entry = buildRunActivityEntry(event, state.entries.length + 1);
  if (!entry) {
    return state;
  }
  return {
    ...state,
    entries: [...state.entries.map((item) => ({ ...item, active: false })), entry],
  };
}

export function buildRunActivityEntriesFromRun(run: RunDetail): RunActivityEntry[] {
  const stateEvents = run.artifacts?.state_events ?? [];
  return stateEvents.map((event, index) => ({
    id: `state-${event.sequence ?? index + 1}-${event.node_id}-${event.state_key}`,
    kind: "state-updated",
    nodeId: event.node_id,
    nodeType: null,
    stateKey: event.state_key,
    title: event.state_key,
    preview: formatActivityValue(event.value),
    detail: event,
    createdAt: event.created_at ?? "",
    sequence: Number(event.sequence ?? index + 1),
    active: index === stateEvents.length - 1,
  }));
}

function buildRunActivityEntry(event: RunActivityIncomingEvent, sequence: number): RunActivityEntry | null {
  const payload = event.payload;
  const nodeId = normalizeText(payload.node_id);
  const nodeType = normalizeText(payload.node_type) || null;
  const createdAt = normalizeText(payload.created_at);
  if (event.eventType === "node.started") {
    return createEntry("node-started", sequence, nodeId, nodeType, null, `${nodeId} running`, "agent running", payload, createdAt);
  }
  if (event.eventType === "node.output.delta") {
    return createEntry("node-stream", sequence, nodeId, nodeType, null, `${nodeId} stream`, normalizeText(payload.text), payload, createdAt);
  }
  if (event.eventType === "state.updated") {
    const stateKey = normalizeText(payload.state_key);
    return createEntry("state-updated", Number(payload.sequence ?? sequence), nodeId, nodeType, stateKey, stateKey, formatActivityValue(payload.value), payload, createdAt);
  }
  if (event.eventType === "node.completed") {
    return createEntry("node-completed", sequence, nodeId, nodeType, null, `${nodeId} completed`, `${Number(payload.duration_ms ?? 0)}ms`, payload, createdAt);
  }
  if (event.eventType === "node.failed") {
    return createEntry("node-failed", sequence, nodeId, nodeType, null, `${nodeId} failed`, normalizeText(payload.error), payload, createdAt);
  }
  if (event.eventType === "node.reasoning.completed") {
    return createEntry("reasoning", sequence, nodeId, nodeType, null, `${nodeId} reasoning`, normalizeText(payload.reasoning), payload, createdAt);
  }
  return null;
}

function createEntry(
  kind: RunActivityKind,
  sequence: number,
  nodeId: string,
  nodeType: string | null,
  stateKey: string | null,
  title: string,
  preview: string,
  detail: unknown,
  createdAt: string,
): RunActivityEntry {
  return {
    id: `${kind}-${sequence}-${nodeId}-${stateKey ?? ""}`,
    kind,
    nodeId,
    nodeType,
    stateKey,
    title,
    preview,
    detail,
    createdAt,
    sequence,
    active: true,
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatActivityValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/runActivityModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/editor/workspace/runActivityModel.ts frontend/src/editor/workspace/runActivityModel.test.ts
git commit -m "增加运行态活动流模型"
```

---

### Task 7: Run Activity Panel UI

**Files:**
- Create: `frontend/src/editor/workspace/EditorRunActivityPanel.vue`
- Create: `frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts`
- Modify: `frontend/src/i18n/messages.ts`
- Modify: `frontend/src/i18n/additionalMessages.ts`

- [ ] **Step 1: Write structure test**

Create `frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const componentSource = readFileSync(resolve(currentDirectory, "EditorRunActivityPanel.vue"), "utf8");

test("EditorRunActivityPanel renders a realtime auto-follow activity feed", () => {
  assert.match(componentSource, /class="editor-run-activity-panel"/);
  assert.match(componentSource, /ref="activityScrollRef"/);
  assert.match(componentSource, /watch\(\s*\(\) => props\.entries\.length/);
  assert.match(componentSource, /scrollToLatest/);
  assert.match(componentSource, /autoFollow/);
  assert.match(componentSource, /backToLatest/);
  assert.match(componentSource, /v-for="entry in entries"/);
  assert.match(componentSource, /isEntryExpanded\(entry\.id\)/);
  assert.match(componentSource, /JSON\.stringify\(entry\.detail, null, 2\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Create panel component**

Create `frontend/src/editor/workspace/EditorRunActivityPanel.vue` with this structure:

```vue
<template>
  <aside class="editor-run-activity-panel">
    <div class="editor-run-activity-panel__surface">
      <header class="editor-run-activity-panel__header">
        <div>
          <div class="editor-run-activity-panel__eyebrow">{{ t("runActivity.eyebrow") }}</div>
          <h2 class="editor-run-activity-panel__title">{{ t("runActivity.title") }}</h2>
          <p class="editor-run-activity-panel__body">{{ t("runActivity.body") }}</p>
        </div>
        <button type="button" class="editor-run-activity-panel__collapse" :aria-label="t('runActivity.collapse')" @click="$emit('toggle')">
          <ElIcon aria-hidden="true"><ArrowRight /></ElIcon>
        </button>
      </header>

      <div class="editor-run-activity-panel__summary">
        <span>{{ runStatus || t("runActivity.noRun") }}</span>
        <strong>{{ entries.length }}</strong>
      </div>

      <div ref="activityScrollRef" class="editor-run-activity-panel__feed" @scroll="handleFeedScroll">
        <div v-if="entries.length === 0" class="editor-run-activity-panel__empty">{{ t("runActivity.empty") }}</div>

        <article
          v-for="entry in entries"
          :key="entry.id"
          class="editor-run-activity-panel__entry"
          :class="{
            'editor-run-activity-panel__entry--active': entry.active,
            [`editor-run-activity-panel__entry--${entry.kind}`]: true,
          }"
        >
          <button
            type="button"
            class="editor-run-activity-panel__entry-head"
            :aria-expanded="isEntryExpanded(entry.id)"
            @click="toggleEntry(entry.id)"
          >
            <span class="editor-run-activity-panel__entry-index">#{{ entry.sequence }}</span>
            <span class="editor-run-activity-panel__entry-title">{{ entry.title }}</span>
            <span class="editor-run-activity-panel__entry-time">{{ formatEntryTime(entry.createdAt) }}</span>
          </button>
          <pre class="editor-run-activity-panel__entry-preview">{{ entry.preview }}</pre>
          <pre v-if="isEntryExpanded(entry.id)" class="editor-run-activity-panel__entry-detail">{{ JSON.stringify(entry.detail, null, 2) }}</pre>
        </article>
      </div>

      <button v-if="!autoFollow" type="button" class="editor-run-activity-panel__back-to-latest" @click="backToLatest">
        {{ t("runActivity.backToLatest") }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { ArrowRight } from "@element-plus/icons-vue";
import { ElIcon } from "element-plus";
import { useI18n } from "vue-i18n";

import type { RunActivityEntry } from "./runActivityModel.ts";

const props = defineProps<{
  entries: RunActivityEntry[];
  runStatus?: string | null;
}>();

defineEmits<{
  (event: "toggle"): void;
}>();

const { t } = useI18n();
const activityScrollRef = ref<HTMLElement | null>(null);
const autoFollow = ref(true);
const expandedEntries = ref<Record<string, boolean>>({});

watch(
  () => props.entries.length,
  () => {
    if (autoFollow.value) {
      void nextTick(scrollToLatest);
    }
  },
);

function scrollToLatest() {
  const element = activityScrollRef.value;
  if (!element) {
    return;
  }
  element.scrollTop = element.scrollHeight;
}

function handleFeedScroll() {
  const element = activityScrollRef.value;
  if (!element) {
    return;
  }
  autoFollow.value = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
}

function backToLatest() {
  autoFollow.value = true;
  void nextTick(scrollToLatest);
}

function isEntryExpanded(entryId: string) {
  return expandedEntries.value[entryId] ?? false;
}

function toggleEntry(entryId: string) {
  expandedEntries.value = {
    ...expandedEntries.value,
    [entryId]: !isEntryExpanded(entryId),
  };
}

function formatEntryTime(value: string) {
  const match = value.match(/T(\d{2}:\d{2}:\d{2})/);
  return match?.[1] ?? value;
}
</script>

<style scoped>
.editor-run-activity-panel {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 12px;
  background: transparent;
}

.editor-run-activity-panel__surface {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  border: 1px solid var(--graphite-glass-border);
  border-radius: 28px;
  background: var(--graphite-glass-specular), var(--graphite-glass-lens), var(--graphite-glass-bg-strong);
  background-blend-mode: screen, screen, normal;
  box-shadow: var(--graphite-glass-shadow), var(--graphite-glass-highlight), var(--graphite-glass-rim);
  backdrop-filter: blur(34px) saturate(1.7) contrast(1.02);
}

.editor-run-activity-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 6px;
}

.editor-run-activity-panel__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.82);
}

.editor-run-activity-panel__title {
  margin: 2px 0 0;
  font-size: 1.1rem;
  line-height: 1.25;
}

.editor-run-activity-panel__body {
  margin: 4px 0 0;
  color: rgba(69, 45, 25, 0.74);
  font-size: 0.86rem;
  line-height: 1.45;
}

.editor-run-activity-panel__collapse {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(154, 52, 18, 0.16);
  border-radius: 999px;
  background: rgba(255, 252, 247, 0.92);
  color: rgba(120, 53, 15, 0.92);
  cursor: pointer;
}

.editor-run-activity-panel__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 14px;
  border: 1px solid rgba(154, 52, 18, 0.12);
  border-radius: 18px;
  background: rgba(255, 252, 247, 0.72);
  padding: 10px 12px;
  color: rgba(69, 45, 25, 0.82);
}

.editor-run-activity-panel__feed {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding: 0 14px 14px;
  scrollbar-gutter: stable;
}

.editor-run-activity-panel__entry {
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 18px;
  background: rgba(255, 252, 247, 0.9);
  padding: 10px;
}

.editor-run-activity-panel__entry--active {
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.editor-run-activity-panel__entry-head {
  display: grid;
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.editor-run-activity-panel__entry-title,
.editor-run-activity-panel__entry-preview {
  overflow-wrap: anywhere;
}

.editor-run-activity-panel__entry-preview,
.editor-run-activity-panel__entry-detail {
  margin: 8px 0 0;
  white-space: pre-wrap;
  font: inherit;
}

.editor-run-activity-panel__entry-detail {
  max-height: 220px;
  overflow: auto;
  border-radius: 12px;
  background: rgba(31, 41, 55, 0.06);
  padding: 10px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.78rem;
}

.editor-run-activity-panel__back-to-latest {
  position: absolute;
  right: 22px;
  bottom: 20px;
  border: 1px solid rgba(154, 52, 18, 0.22);
  border-radius: 999px;
  background: rgba(255, 252, 247, 0.96);
  padding: 8px 12px;
  color: rgba(120, 53, 15, 0.94);
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: Add i18n labels**

In `frontend/src/i18n/messages.ts`, add `runActivity` beside `statePanel` in both Chinese and English message blocks:

```ts
runActivity: {
  eyebrow: "Run Activity",
  title: "运行态",
  body: "按实际运行顺序实时查看节点、流式输出和 State 写入。",
  collapse: "折叠运行态面板",
  empty: "运行后会在这里显示实时活动。",
  noRun: "暂无运行",
  backToLatest: "回到最新",
},
```

English block:

```ts
runActivity: {
  eyebrow: "Run Activity",
  title: "Run Activity",
  body: "Watch nodes, streamed output, and State writes in live execution order.",
  collapse: "Collapse Run Activity panel",
  empty: "Live activity appears here after a run starts.",
  noRun: "No run",
  backToLatest: "Back to latest",
},
```

Add equivalent keys to every locale block in `frontend/src/i18n/additionalMessages.ts`. If a locale-specific translation is not available, use the English labels for that locale.

- [ ] **Step 5: Run structure test**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts frontend/src/i18n/messages.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/editor/workspace/EditorRunActivityPanel.vue frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts frontend/src/i18n/messages.ts frontend/src/i18n/additionalMessages.ts
git commit -m "增加运行态活动面板"
```

---

### Task 8: Workspace Wiring For Trace Panel

**Files:**
- Modify: `frontend/src/editor/workspace/workspaceSidePanelModel.ts`
- Modify: `frontend/src/editor/workspace/useWorkspaceSidePanelController.ts`
- Modify: `frontend/src/editor/workspace/EditorActionCapsule.vue`
- Modify: `frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts`
- Modify: `frontend/src/editor/workspace/EditorWorkspaceShell.vue`
- Modify: `frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts`

- [ ] **Step 1: Add failing structure tests**

Append to `frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts`:

```ts
test("EditorActionCapsule exposes Run Activity next to State without renaming Output semantics", () => {
  assert.match(componentSource, /isRunActivityPanelOpen/);
  assert.match(componentSource, /@click="\$emit\('toggle-run-activity-panel'\)"/);
  assert.match(componentSource, /t\("editor\.runActivityPanel"\)/);
  assert.doesNotMatch(componentSource, /Realtime Output/);
});
```

Append to `frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts`:

```ts
test("EditorWorkspaceShell wires the Run Activity side panel mode", () => {
  assert.match(componentSource, /import EditorRunActivityPanel from "\.\/EditorRunActivityPanel\.vue";/);
  assert.match(componentSource, /runActivityByTabId = ref<Record<string, RunActivityState>>/);
  assert.match(componentSource, /@toggle-run-activity-panel="toggleActiveRunActivityPanel"/);
  assert.match(componentSource, /<EditorRunActivityPanel/);
  assert.match(sidePanelControllerSource, /toggleActiveRunActivityPanel/);
  assert.match(sidePanelControllerSource, /"run-activity"/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts
```

Expected: FAIL because the new panel mode is not wired.

- [ ] **Step 3: Add side panel mode**

In `frontend/src/editor/workspace/workspaceSidePanelModel.ts`:

```ts
export type WorkspaceSidePanelMode = "state" | "human-review" | "run-activity";
```

Keep `resolveWorkspaceSidePanelMode` returning `"state"` by default.

In `frontend/src/editor/workspace/useWorkspaceSidePanelController.ts`, add:

```ts
  const activeRunActivityPanelOpen = computed(() => {
    const tab = input.activeTab.value;
    return tab ? isStatePanelOpen(tab.tabId) && sidePanelMode(tab.tabId) === "run-activity" : false;
  });

  function shouldShowRunActivityPanel(tabId: string) {
    return sidePanelMode(tabId) === "run-activity";
  }

  function toggleActiveRunActivityPanel() {
    const tab = input.activeTab.value;
    if (!tab) {
      return;
    }
    const tabId = tab.tabId;
    if (isHumanReviewPanelLockedOpen(tabId)) {
      openHumanReviewPanelForTab(tabId, input.latestRunDetailByTabId.value[tabId]?.current_node_id ?? null);
      input.showGraphLockedEditToast();
      return;
    }
    if (sidePanelMode(tabId) !== "run-activity") {
      input.sidePanelModeByTabId.value = setTabScopedRecordEntry(input.sidePanelModeByTabId.value, tabId, "run-activity");
      input.statePanelOpenByTabId.value = setTabScopedRecordEntry(input.statePanelOpenByTabId.value, tabId, true);
      return;
    }
    toggleStatePanel(tabId);
  }
```

Return `activeRunActivityPanelOpen`, `shouldShowRunActivityPanel`, and `toggleActiveRunActivityPanel`.

- [ ] **Step 4: Wire action capsule**

In `frontend/src/editor/workspace/EditorActionCapsule.vue`, add prop:

```ts
  isRunActivityPanelOpen: boolean;
```

Add emit:

```ts
  (event: "toggle-run-activity-panel"): void;
```

Add a compact button after the State button:

```vue
<button
  type="button"
  class="editor-action-capsule__state-pill"
  :class="{ 'editor-action-capsule__state-pill--active': isRunActivityPanelOpen }"
  @click="$emit('toggle-run-activity-panel')"
>
  <span>{{ t("editor.runActivityPanel") }}</span>
</button>
```

In `frontend/src/i18n/messages.ts`, add:

```ts
runActivityPanel: "Trace",
```

Chinese block:

```ts
runActivityPanel: "运行态",
```

- [ ] **Step 5: Wire workspace shell**

In `frontend/src/editor/workspace/EditorWorkspaceShell.vue`, import:

```ts
import EditorRunActivityPanel from "./EditorRunActivityPanel.vue";
import { appendRunActivityEvent, buildRunActivityEntriesFromRun, type RunActivityState } from "./runActivityModel.ts";
```

Add state:

```ts
const runActivityByTabId = ref<Record<string, RunActivityState>>({});
```

Pass action capsule props/events:

```vue
:is-run-activity-panel-open="activeRunActivityPanelOpen"
@toggle-run-activity-panel="toggleActiveRunActivityPanel"
```

Render panel before `EditorStatePanel`:

```vue
<EditorRunActivityPanel
  v-else-if="shouldShowRunActivityPanel(tab.tabId)"
  :entries="runActivityByTabId[tab.tabId]?.entries ?? []"
  :run-status="feedbackForTab(tab.tabId)?.activeRunStatus ?? null"
  @toggle="toggleStatePanel(tab.tabId)"
/>
```

Destructure side panel controller:

```ts
  activeRunActivityPanelOpen,
  shouldShowRunActivityPanel,
  toggleActiveRunActivityPanel,
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/editor/workspace/workspaceSidePanelModel.ts frontend/src/editor/workspace/useWorkspaceSidePanelController.ts frontend/src/editor/workspace/EditorActionCapsule.vue frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts frontend/src/editor/workspace/EditorWorkspaceShell.vue frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts frontend/src/i18n/messages.ts frontend/src/i18n/additionalMessages.ts
git commit -m "接入运行态侧边面板"
```

---

### Task 9: EventSource Integration For Activity And Output

**Files:**
- Modify: `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts`
- Modify: `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts`
- Modify: `frontend/src/editor/workspace/EditorWorkspaceShell.vue`
- Modify: `frontend/src/editor/workspace/useWorkspaceTabLifecycleController.ts`

- [ ] **Step 1: Extend controller input tests**

Update `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts` harness with:

```ts
import { appendRunActivityEvent, type RunActivityState } from "./runActivityModel.ts";
```

Add in `createHarness`:

```ts
const runActivityByTabId = ref<Record<string, RunActivityState>>({});
```

Pass to controller:

```ts
runActivityByTabId,
appendRunActivityEvent,
```

Return `runActivityByTabId`.

Append this test:

```ts
test("useWorkspaceRunLifecycleController appends activity and applies authoritative state updates", () => {
  const harness = createHarness();

  harness.controller.startRunEventStreamForTab("tab_a", "run_1");
  harness.eventSources[0]?.emit(
    "state.updated",
    new MessageEvent("state.updated", {
      data: JSON.stringify({ node_id: "agent_1", state_key: "answer", value: "Final answer", sequence: 1 }),
    }),
  );

  assert.equal(harness.runActivityByTabId.value.tab_a.entries.at(-1)?.kind, "state-updated");
  assert.deepEqual(harness.runOutputPreviewByTabId.value.tab_a, {
    output_answer: { text: "Final answer", displayMode: "plain" },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts
```

Expected: FAIL because controller does not accept activity state or consume `state.updated`.

- [ ] **Step 3: Update lifecycle controller**

In `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts`, add imports:

```ts
import type { RunActivityState, appendRunActivityEvent as appendRunActivityEventType } from "./runActivityModel.ts";
```

Use a type alias that does not import the function as a value:

```ts
type AppendRunActivityEvent = typeof appendRunActivityEventType;
```

Add input fields:

```ts
  runActivityByTabId: Ref<Record<string, RunActivityState>>;
  appendRunActivityEvent: AppendRunActivityEvent;
```

Add helper:

```ts
  function applyRunActivityEventToTab(tabId: string, eventType: string, payload: Record<string, unknown>) {
    const current = input.runActivityByTabId.value[tabId] ?? { entries: [], autoFollow: true };
    input.runActivityByTabId.value = setTabScopedRecordEntry(
      input.runActivityByTabId.value,
      tabId,
      input.appendRunActivityEvent(current, { eventType, payload }),
    );
  }
```

Update `applyStreamingOutputPreviewToTab` to receive `eventType`:

```ts
  function applyStreamingOutputPreviewToTab(tabId: string, payload: Record<string, unknown>, eventType = "node.output.delta") {
    const currentPreview = input.runOutputPreviewByTabId.value[tabId] ?? {};
    const nextPreview = buildRunEventOutputPreviewUpdate(input.documentsByTabId.value[tabId], currentPreview, {
      ...payload,
      event_type: eventType,
    });
    if (!nextPreview) {
      return;
    }
    input.runOutputPreviewByTabId.value = setTabScopedRecordEntry(input.runOutputPreviewByTabId.value, tabId, nextPreview);
  }
```

Register these EventSource listeners:

```ts
    for (const eventType of ["node.started", "state.updated", "node.completed", "node.failed", "node.reasoning.completed"]) {
      source.addEventListener(eventType, (event) => {
        const payload = parseRunEventPayload(event);
        if (!payload) {
          return;
        }
        applyRunActivityEventToTab(tabId, eventType, payload);
        if (eventType === "state.updated") {
          applyStreamingOutputPreviewToTab(tabId, payload, eventType);
        }
      });
    }
```

For existing `node.output.delta` and `node.output.completed` listeners, also call:

```ts
        applyRunActivityEventToTab(tabId, "node.output.delta", payload);
```

or `"node.output.completed"` for completed events.

- [ ] **Step 4: Reset activity when a new run starts and clear it when tab closes**

In `frontend/src/editor/workspace/EditorWorkspaceShell.vue`, when calling `useWorkspaceRunLifecycleController`, pass:

```ts
  runActivityByTabId,
  appendRunActivityEvent,
```

In the run controller start path, before `startRunEventStreamForTab`, set:

```ts
runActivityByTabId.value = setTabScopedRecordEntry(runActivityByTabId.value, tabId, { entries: [], autoFollow: true });
```

If `setTabScopedRecordEntry` is not imported in `EditorWorkspaceShell.vue`, import it from `./editorTabRuntimeModel.ts`.

In `frontend/src/editor/workspace/useWorkspaceTabLifecycleController.ts`, include `runActivityByTabId` in the input and delete the tab entry on close/discard just like `runOutputPreviewByTabId`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts frontend/src/editor/workspace/EditorWorkspaceShell.vue frontend/src/editor/workspace/useWorkspaceTabLifecycleController.ts frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts
git commit -m "接入运行事件流活动更新"
```

---

### Task 10: Final Reconciliation, Local Path Behavior, And Verification

**Files:**
- Modify: `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts`
- Modify: `frontend/src/editor/nodes/outputPreviewContentModel.ts` only if current local-path document preview needs compatibility fixes.
- Test: `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts`
- Test: `frontend/src/editor/nodes/outputPreviewContentModel.test.ts`

- [ ] **Step 1: Add final reconciliation test**

Append to `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts`:

```ts
test("useWorkspaceRunLifecycleController reconciles activity from final run detail after completion", async () => {
  const harness = createHarness({
    fetchRun: async () =>
      runDetail("completed", {
        artifacts: {
          state_events: [
            { node_id: "agent_1", state_key: "answer", output_key: "answer", mode: "replace", value: "Final answer", sequence: 1, created_at: "2026-05-03T01:00:00Z" },
          ],
        },
      }),
  });

  await harness.controller.pollRunForTab("tab_a", "run_1");

  assert.equal(harness.runActivityByTabId.value.tab_a.entries.length, 1);
  assert.equal(harness.runActivityByTabId.value.tab_a.entries[0].preview, "Final answer");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts
```

Expected: FAIL because final polling does not rebuild activity from run details.

- [ ] **Step 3: Implement final reconciliation**

In `frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts`, import:

```ts
import { buildRunActivityEntriesFromRun } from "./runActivityModel.ts";
```

After final `input.persistRunStateValuesForTab(tabId, run);`, set:

```ts
      input.runActivityByTabId.value = setTabScopedRecordEntry(input.runActivityByTabId.value, tabId, {
        entries: buildRunActivityEntriesFromRun(run),
        autoFollow: input.runActivityByTabId.value[tabId]?.autoFollow ?? true,
      });
```

Do this only for non-polling terminal states so live activity is not erased during active runs.

- [ ] **Step 4: Confirm local path preview still works**

Run:

```bash
npx tsx --test frontend/src/editor/nodes/outputPreviewContentModel.test.ts
```

Expected: PASS. If it fails because authoritative `state.updated` now passes object/array values to Output previews, update `stringifyRunEventPreviewValue` in `frontend/src/lib/run-event-stream.ts` to JSON.stringify arrays/objects with indentation and keep `outputPreviewContentModel.ts` unchanged.

- [ ] **Step 5: Run all focused frontend tests**

Run:

```bash
npx tsx --test \
  frontend/src/lib/streamingJsonStateRouter.test.ts \
  frontend/src/lib/run-event-stream.test.ts \
  frontend/src/editor/workspace/runActivityModel.test.ts \
  frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts \
  frontend/src/editor/workspace/EditorRunActivityPanel.structure.test.ts \
  frontend/src/editor/workspace/EditorActionCapsule.structure.test.ts \
  frontend/src/editor/workspace/EditorWorkspaceShell.structure.test.ts \
  frontend/src/editor/nodes/outputPreviewContentModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run backend focused tests**

Run:

```bash
python -m pytest \
  backend/tests/test_runtime_state_io.py \
  backend/tests/test_agent_streaming_runtime.py \
  backend/tests/test_node_handlers_runtime.py \
  backend/tests/test_langgraph_runtime_progress_events.py \
  -q
```

Expected: PASS.

- [ ] **Step 7: Run full verification**

Run:

```bash
python -m pytest backend/tests -q
cd frontend && npm run build
```

Expected: backend tests pass and frontend build exits 0.

- [ ] **Step 8: Manual browser verification**

Run:

```bash
npm run dev
```

Open `http://127.0.0.1:3477` and verify:

- Running a single-state Agent still streams into its Output node.
- Running a multi-state JSON Agent streams only the Output node whose state key is currently present in the streamed JSON.
- Ambiguous multi-state plain text stream appears in Run Activity, not in every Output.
- Run Activity auto-scrolls while following latest events.
- Scrolling upward pauses auto-follow and shows the back-to-latest control.
- `state.updated` final value replaces temporary stream preview.
- Output nodes that receive `local_path` or arrays/objects containing `local_path` still render through the existing documents display behavior.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/editor/workspace/useWorkspaceRunLifecycleController.ts frontend/src/editor/workspace/useWorkspaceRunLifecycleController.test.ts frontend/src/lib/run-event-stream.ts frontend/src/editor/nodes/outputPreviewContentModel.ts frontend/src/editor/nodes/outputPreviewContentModel.test.ts
git commit -m "完善运行态实时预览对齐"
```

---

## Self-Review

- Spec coverage: This plan covers SSE-based realtime events, Run Activity auto-follow feed, state.updated authority, Output node realtime display, multi-state JSON key routing, reasoning summary display, and local_path compatibility.
- Placeholder scan: No step contains placeholder instructions. The only conditional is a concrete fallback for `outputPreviewContentModel` compatibility if the existing test reveals a serialization mismatch.
- Type consistency: Event payloads use `node_id`, `node_type`, `state_key`, `output_keys`, `stream_state_keys`, `value`, `previous_value`, `sequence`, and `created_at` consistently across backend and frontend tasks.
- Scope check: WebSocket is intentionally out of scope. SSE remains the transport because the required realtime flow is server-to-client.
