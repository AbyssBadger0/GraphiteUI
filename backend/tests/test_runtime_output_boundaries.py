from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.runtime.execution_graph import build_regular_edge_id
from app.core.runtime.output_boundaries import collect_output_boundaries, execute_output_node
from app.core.schemas.node_system import NodeSystemGraphDocument, NodeSystemOutputNode


class RuntimeOutputBoundariesTests(unittest.TestCase):
    def test_execute_output_node_builds_preview_and_persists_non_empty_values(self) -> None:
        node = NodeSystemOutputNode.model_validate(
            {
                "ui": {"position": {"x": 0, "y": 0}},
                "reads": [{"state": "answer"}],
                "config": {
                    "displayMode": "markdown",
                    "persistEnabled": True,
                    "persistFormat": "md",
                    "fileNameTemplate": "answer.md",
                },
            }
        )

        with patch(
            "app.core.runtime.output_boundaries.save_output_value",
            return_value={"path": "runs/run_1/answer.md"},
        ) as save_output:
            body = execute_output_node("output_answer", node, {"answer": "# Done"}, {"run_id": "run_1"})

        save_output.assert_called_once_with(
            run_id="run_1",
            node_id="output_answer",
            source_key="answer",
            value="# Done",
            persist_format="md",
            file_name_template="answer.md",
        )
        self.assertEqual(body["outputs"], {"answer": "# Done"})
        self.assertEqual(body["output_previews"][0]["node_id"], "output_answer")
        self.assertEqual(body["output_previews"][0]["display_mode"], "markdown")
        self.assertEqual(body["saved_outputs"], [{"path": "runs/run_1/answer.md"}])
        self.assertEqual(body["final_result"], "# Done")

    def test_collect_output_boundaries_refreshes_only_active_outputs(self) -> None:
        graph = NodeSystemGraphDocument.model_validate(
            {
                "graph_id": "graph_1",
                "name": "Output Boundary Graph",
                "state_schema": {"answer": {"name": "Answer", "type": "text", "value": ""}},
                "nodes": {
                    "agent": {
                        "kind": "agent",
                        "ui": {"position": {"x": 0, "y": 0}},
                        "writes": [{"state": "answer"}],
                    },
                    "output_active": {
                        "kind": "output",
                        "ui": {"position": {"x": 200, "y": 0}},
                        "reads": [{"state": "answer"}],
                    },
                    "output_inactive": {
                        "kind": "output",
                        "ui": {"position": {"x": 200, "y": 120}},
                        "reads": [{"state": "answer"}],
                    },
                },
                "edges": [
                    {"source": "agent", "target": "output_active"},
                    {"source": "agent", "target": "output_inactive"},
                ],
            }
        )
        state = {
            "state_values": {"answer": "fresh"},
            "output_previews": [
                {"node_id": "output_active", "value": "stale active"},
                {"node_id": "output_inactive", "value": "stale inactive"},
            ],
            "saved_outputs": [
                {"node_id": "output_active", "source_key": "answer", "path": "stale-active.txt"},
                {"node_id": "output_inactive", "source_key": "answer", "path": "stale-inactive.txt"},
            ],
        }

        collect_output_boundaries(
            graph,
            state,
            {build_regular_edge_id("agent", "output_active")},
        )

        self.assertEqual(
            [preview["node_id"] for preview in state["output_previews"]],
            ["output_inactive", "output_active"],
        )
        self.assertEqual(state["output_previews"][-1]["value"], "fresh")
        self.assertEqual(state["saved_outputs"], [{"node_id": "output_inactive", "source_key": "answer", "path": "stale-inactive.txt"}])
        self.assertEqual(state["node_status_map"], {"output_active": "success"})
        self.assertEqual(state["final_result"], "fresh")


if __name__ == "__main__":
    unittest.main()
