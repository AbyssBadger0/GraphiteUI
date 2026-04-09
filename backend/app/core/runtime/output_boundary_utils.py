from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def save_output_value(
    *,
    run_id: str,
    state_key: str,
    value: Any,
    persist_format: str,
    file_name_template: str,
) -> dict[str, Any]:
    extension = persist_format if persist_format in {"txt", "md", "json"} else "txt"
    output_root = Path(__file__).resolve().parents[4] / "backend" / "data" / "outputs" / run_id
    output_root.mkdir(parents=True, exist_ok=True)

    safe_file_name = "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in file_name_template).strip("_") or state_key
    file_path = output_root / f"{safe_file_name}.{extension}"
    file_path.write_text(serialize_output_value(value, extension), encoding="utf-8")

    return {
        "state_key": state_key,
        "path": str(file_path.relative_to(output_root.parents[2])),
        "format": extension,
        "file_name": file_path.name,
    }


def serialize_output_value(value: Any, extension: str) -> str:
    if extension == "json":
        return json.dumps(value, ensure_ascii=False, indent=2)
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, indent=2)
