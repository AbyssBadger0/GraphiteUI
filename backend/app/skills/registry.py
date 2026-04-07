from __future__ import annotations

from collections.abc import Callable
from typing import Any

from app.knowledge.loader import search_knowledge
from app.skills.slg_creative_factory import (
    slg_analyze_videos,
    slg_build_brief,
    slg_clean_news,
    slg_extract_patterns,
    slg_fetch_ads,
    slg_fetch_rss,
    slg_generate_storyboards,
    slg_generate_variants,
    slg_generate_video_prompts,
    slg_normalize_assets,
    slg_prepare_image_todo,
    slg_prepare_video_todo,
    slg_review_variants,
    slg_select_top_videos,
)


SkillFunc = Callable[..., dict[str, Any]]


def get_skill_registry() -> dict[str, SkillFunc]:
    return {
        "search_docs": search_docs,
        "analyze_assets": analyze_assets,
        "generate_draft": generate_draft,
        "evaluate_output": evaluate_output,
        "slg_fetch_rss": slg_fetch_rss,
        "slg_clean_news": slg_clean_news,
        "slg_fetch_ads": slg_fetch_ads,
        "slg_normalize_assets": slg_normalize_assets,
        "slg_select_top_videos": slg_select_top_videos,
        "slg_analyze_videos": slg_analyze_videos,
        "slg_extract_patterns": slg_extract_patterns,
        "slg_build_brief": slg_build_brief,
        "slg_generate_variants": slg_generate_variants,
        "slg_generate_storyboards": slg_generate_storyboards,
        "slg_generate_video_prompts": slg_generate_video_prompts,
        "slg_review_variants": slg_review_variants,
        "slg_prepare_image_todo": slg_prepare_image_todo,
        "slg_prepare_video_todo": slg_prepare_video_todo,
    }


def search_docs(query: str) -> dict[str, Any]:
    results = search_knowledge(query, limit=3)
    return {
        "query": query,
        "results": [
            {"title": item["title"], "summary": item["summary"], "source": item["source"]}
            for item in results
        ],
    }


def analyze_assets(materials: list[str]) -> dict[str, Any]:
    return {
        "materials_count": len(materials),
        "summary": f"Analyzed {len(materials)} materials for structure and reuse potential.",
    }


def generate_draft(plan: str, knowledge: list[str], memories: list[str]) -> dict[str, Any]:
    return {
        "draft": (
            f"Draft generated from plan '{plan[:80]}', "
            f"knowledge={len(knowledge)}, memories={len(memories)}."
        )
    }


def evaluate_output(content: str) -> dict[str, Any]:
    score = 8.2 if content else 5.0
    return {
        "score": score,
        "issues": [] if content else ["Content is empty."],
        "suggestions": ["Tighten the opening hook.", "Clarify the target audience."],
    }
