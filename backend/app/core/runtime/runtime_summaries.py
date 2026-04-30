from __future__ import annotations

from typing import Any


def summarize_inputs(input_values: dict[str, Any]) -> str:
    if not input_values:
        return "no inputs"
    return str({key: str(value)[:80] for key, value in input_values.items()})[:160]


def summarize_outputs(output_values: dict[str, Any], final_result: Any) -> str:
    if final_result:
        return str(final_result)[:160]
    if output_values:
        return str({key: str(value)[:80] for key, value in output_values.items()})[:160]
    return "no outputs"
