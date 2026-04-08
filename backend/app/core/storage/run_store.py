from __future__ import annotations

import json
from typing import Any

from app.core.storage.database import get_connection, row_payload


def save_run(run_state: dict[str, Any]) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO runs (
                run_id,
                graph_id,
                graph_name,
                status,
                current_node_id,
                revision_round,
                started_at,
                completed_at,
                duration_ms,
                final_score,
                payload_json,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(run_id) DO UPDATE SET
                graph_id = excluded.graph_id,
                graph_name = excluded.graph_name,
                status = excluded.status,
                current_node_id = excluded.current_node_id,
                revision_round = excluded.revision_round,
                started_at = excluded.started_at,
                completed_at = excluded.completed_at,
                duration_ms = excluded.duration_ms,
                final_score = excluded.final_score,
                payload_json = excluded.payload_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                run_state["run_id"],
                run_state.get("graph_id", ""),
                run_state.get("graph_name", ""),
                run_state.get("status", "unknown"),
                run_state.get("current_node_id"),
                int(run_state.get("revision_round", 0) or 0),
                run_state.get("started_at", ""),
                run_state.get("completed_at"),
                run_state.get("duration_ms"),
                run_state.get("final_score"),
                json.dumps(run_state, ensure_ascii=False),
            ),
        )
        connection.commit()


def load_run(run_id: str) -> dict[str, Any]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT payload_json FROM runs WHERE run_id = ?",
            (run_id,),
        ).fetchone()
    payload = row_payload(row)
    if payload is None:
        raise FileNotFoundError(f"Run '{run_id}' does not exist.")
    return payload


def list_runs() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT payload_json FROM runs ORDER BY started_at DESC, run_id DESC"
        ).fetchall()
    return [payload for row in rows if (payload := row_payload(row)) is not None]
