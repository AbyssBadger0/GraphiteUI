from __future__ import annotations

import os
from typing import Any

from app.tools.local_llm import LOCAL_LLM_BASE_URL, get_default_text_model


def build_model_ref(provider_id: str, model_id: str) -> str:
    return f"{provider_id.strip()}/{model_id.strip()}".strip("/")


def split_model_ref(model_ref: str | None, *, default_provider: str = "local") -> tuple[str, str]:
    trimmed = (model_ref or "").strip()
    if not trimmed:
      return default_provider, get_default_text_model()
    if "/" not in trimmed:
      return default_provider, trimmed
    provider_id, model_id = trimmed.split("/", 1)
    provider_id = provider_id.strip() or default_provider
    model_id = model_id.strip() or get_default_text_model()
    return provider_id, model_id


def normalize_model_ref(model_ref: str | None, *, default_provider: str = "local") -> str:
    provider_id, model_id = split_model_ref(model_ref, default_provider=default_provider)
    return build_model_ref(provider_id, model_id)


def resolve_runtime_model_name(model_ref: str | None, *, default_provider: str = "local") -> str:
    _provider_id, model_id = split_model_ref(model_ref, default_provider=default_provider)
    return model_id


def get_default_text_model_ref() -> str:
    return normalize_model_ref(get_default_text_model(), default_provider="local")


def get_default_video_model_name() -> str:
    return (
        os.environ.get("LOCAL_VIDEO_MODEL")
        or os.environ.get("VIDEO_MODEL")
        or os.environ.get("LOCAL_MODEL_NAME")
        or os.environ.get("UPSTREAM_MODEL_NAME")
        or get_default_text_model()
    )


def get_default_video_model_ref() -> str:
    return normalize_model_ref(get_default_video_model_name(), default_provider="local")


def build_model_catalog() -> dict[str, Any]:
    local_text_model = get_default_text_model()
    local_video_model = get_default_video_model_name()

    return {
        "default_text_model_ref": build_model_ref("local", local_text_model),
        "default_video_model_ref": build_model_ref("local", local_video_model),
        "providers": [
            {
                "provider_id": "local",
                "label": "Local Gateway",
                "description": "Current GraphiteUI local model gateway. This is the only active provider until additional vendors are configured.",
                "transport": "openai-compatible",
                "configured": True,
                "base_url": LOCAL_LLM_BASE_URL,
                "models": [
                    {
                        "model_ref": build_model_ref("local", local_text_model),
                        "model": local_text_model,
                        "label": local_text_model,
                        "reasoning": True,
                        "modalities": ["text"],
                        "context_window": None,
                        "max_tokens": None,
                    },
                    *(
                        [
                            {
                                "model_ref": build_model_ref("local", local_video_model),
                                "model": local_video_model,
                                "label": local_video_model,
                                "reasoning": False,
                                "modalities": ["video"],
                                "context_window": None,
                                "max_tokens": None,
                            }
                        ]
                        if local_video_model != local_text_model
                        else []
                    ),
                ],
                "example_model_refs": [],
            },
            {
                "provider_id": "openai",
                "label": "OpenAI",
                "description": "Planned cloud provider entry for direct OpenAI models.",
                "transport": "openai-responses",
                "configured": False,
                "base_url": "https://api.openai.com/v1",
                "models": [],
                "example_model_refs": ["openai/gpt-5.4", "openai/gpt-5.4-mini"],
            },
            {
                "provider_id": "anthropic",
                "label": "Anthropic",
                "description": "Planned cloud provider entry for Claude models.",
                "transport": "anthropic-messages",
                "configured": False,
                "base_url": "https://api.anthropic.com/v1",
                "models": [],
                "example_model_refs": ["anthropic/claude-opus-4-6", "anthropic/claude-sonnet-4-6"],
            },
            {
                "provider_id": "google",
                "label": "Google Gemini",
                "description": "Planned provider entry for Gemini text and multimodal models.",
                "transport": "google-gemini",
                "configured": False,
                "base_url": "https://generativelanguage.googleapis.com",
                "models": [],
                "example_model_refs": ["google/gemini-3.1-pro-preview", "google/gemini-3-flash-preview"],
            },
            {
                "provider_id": "openrouter",
                "label": "OpenRouter",
                "description": "Planned proxy provider entry for multi-vendor routing through one gateway.",
                "transport": "openai-compatible",
                "configured": False,
                "base_url": "https://openrouter.ai/api/v1",
                "models": [],
                "example_model_refs": ["openrouter/anthropic/claude-sonnet-4.6", "openrouter/auto"],
            },
        ],
    }
