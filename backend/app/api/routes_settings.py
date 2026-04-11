from __future__ import annotations

from fastapi import APIRouter

from app.core.model_catalog import (
    build_model_catalog,
    get_default_text_model_ref,
    get_default_video_model_ref,
    resolve_runtime_model_name,
)
from app.skills.definitions import get_skill_definition_registry
from app.templates.registry import list_templates
from app.tools.local_llm import (
    get_default_agent_temperature,
    get_default_agent_thinking_enabled,
)
from app.tools.registry import get_tool_registry


router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings_endpoint() -> dict:
    text_model_ref = get_default_text_model_ref()
    video_model_ref = get_default_video_model_ref()
    model_catalog = build_model_catalog()
    return {
        "model": {
            "text_model": resolve_runtime_model_name(text_model_ref),
            "text_model_ref": text_model_ref,
            "video_model": resolve_runtime_model_name(video_model_ref),
            "video_model_ref": video_model_ref,
        },
        "agent_runtime_defaults": {
            "model": text_model_ref,
            "thinking_enabled": get_default_agent_thinking_enabled(),
            "temperature": get_default_agent_temperature(),
        },
        "model_catalog": model_catalog,
        "revision": {
            "max_revision_round": 1,
        },
        "evaluator": {
            "default_score_threshold": 7.8,
            "routes": ["pass", "revise", "fail"],
        },
        "tools": sorted(get_tool_registry().keys()),
        "skill_definitions": sorted(get_skill_definition_registry(include_disabled=False).keys()),
        "templates": [
            {
                "template_id": template["template_id"],
                "label": template["label"],
                "default_theme_preset": template["default_theme_preset"],
            }
            for template in list_templates()
        ],
    }
