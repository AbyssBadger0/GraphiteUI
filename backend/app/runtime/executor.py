from __future__ import annotations

from app.compiler.graph_parser import parse_graph
from app.compiler.workflow_builder import build_workflow
from app.runtime.state import create_initial_run_state, utc_now_iso
from app.schemas.graph import GraphDocument
from app.storage.run_store import save_run


def execute_graph(graph: GraphDocument) -> dict:
    workflow_config = parse_graph(graph)
    app = build_workflow(workflow_config)
    initial_state = create_initial_run_state(
        graph_id=graph.graph_id,
        graph_name=graph.name,
        max_revision_round=int(graph.metadata.get("max_revision_round", 1)),
    )
    initial_state["status"] = "running"
    initial_state["node_status_map"] = {node.id: "idle" for node in graph.nodes}
    result = app.invoke(initial_state)

    final_status = result.get("status", "completed")
    if final_status != "failed":
        final_status = "completed"
    result["status"] = final_status
    result["completed_at"] = result.get("completed_at") or utc_now_iso()
    save_run(result)
    return result

