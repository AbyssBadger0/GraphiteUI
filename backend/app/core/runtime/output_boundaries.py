from __future__ import annotations

import copy
from typing import Any

from app.core.runtime.output_artifacts import (
    apply_loop_limit_exhausted_output_message,
    resolve_active_output_nodes,
)
from app.core.runtime.output_boundary_utils import save_output_value
from app.core.schemas.node_system import NodeSystemGraphDocument, NodeSystemOutputNode


def execute_output_node(
    node_name: str,
    node: NodeSystemOutputNode,
    input_values: dict[str, Any],
    state: dict[str, Any],
) -> dict[str, Any]:
    binding = node.reads[0]
    value = input_values.get(binding.state)
    preview = {
        "node_id": node_name,
        "label": binding.state,
        "source_kind": "state",
        "source_key": binding.state,
        "display_mode": node.config.display_mode.value,
        "persist_enabled": node.config.persist_enabled,
        "persist_format": node.config.persist_format.value,
        "value": value,
    }
    saved_outputs: list[dict[str, Any]] = []
    if node.config.persist_enabled and value not in (None, "", [], {}):
        saved_outputs.append(
            save_output_value(
                run_id=str(state.get("run_id", "")),
                node_id=node_name,
                source_key=binding.state,
                value=value,
                persist_format=node.config.persist_format.value,
                file_name_template=node.config.file_name_template or binding.state,
            )
        )
    return {
        "outputs": {binding.state: value},
        "output_previews": [preview],
        "saved_outputs": saved_outputs,
        "final_result": "" if value is None else str(value),
    }


def collect_output_boundaries(
    graph: NodeSystemGraphDocument,
    state: dict[str, Any],
    active_edge_ids: set[str] | None = None,
) -> None:
    active_output_nodes = resolve_active_output_nodes(graph, active_edge_ids or set())
    output_node_names = {
        node_name
        for node_name, node in graph.nodes.items()
        if isinstance(node, NodeSystemOutputNode)
    }
    refreshed_output_nodes = active_output_nodes or output_node_names
    state["output_previews"] = [
        preview
        for preview in state.get("output_previews", [])
        if preview.get("node_id") not in refreshed_output_nodes
    ]
    state["saved_outputs"] = [
        output
        for output in state.get("saved_outputs", [])
        if output.get("node_id") not in refreshed_output_nodes
    ]
    final_results: list[Any] = []

    for node_name, node in graph.nodes.items():
        if not isinstance(node, NodeSystemOutputNode) or not node.reads:
            continue
        if active_output_nodes and node_name not in active_output_nodes:
            continue

        binding = node.reads[0]
        body = execute_output_node(
            node_name,
            node,
            {binding.state: copy.deepcopy(state.get("state_values", {}).get(binding.state))},
            state,
        )
        if state.get("loop_limit_exhaustion"):
            body = apply_loop_limit_exhausted_output_message(body)
        state["output_previews"] = [*state.get("output_previews", []), *body.get("output_previews", [])]
        state["saved_outputs"] = [*state.get("saved_outputs", []), *body.get("saved_outputs", [])]
        state.setdefault("node_status_map", {})[node_name] = "success"
        if body.get("final_result") not in (None, "", [], {}):
            final_results.append(body["final_result"])

    if final_results:
        state["final_result"] = str(final_results[-1])
