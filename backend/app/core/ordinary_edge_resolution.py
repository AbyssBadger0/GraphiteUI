from __future__ import annotations

from app.core.schemas.node_system import NodeSystemGraphDocument


def resolve_ordinary_edge_shared_state(
    graph: NodeSystemGraphDocument,
    source: str,
    target: str,
) -> str | None:
    source_node = graph.nodes.get(source)
    target_node = graph.nodes.get(target)
    if source_node is None or target_node is None:
        return None

    shared_states = sorted(
        {binding.state for binding in source_node.writes}
        & {binding.state for binding in target_node.reads}
    )
    if len(shared_states) != 1:
        return None
    return shared_states[0]
