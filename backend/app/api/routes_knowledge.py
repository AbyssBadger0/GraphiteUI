from __future__ import annotations

from fastapi import APIRouter, Query

from app.knowledge.loader import KNOWLEDGE_ROOT, search_knowledge


router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("")
def list_knowledge_endpoint(query: str = Query(default="")) -> list[dict[str, str]]:
    return search_knowledge(query, limit=20)


@router.get("/bases")
def list_knowledge_bases() -> list[dict[str, str]]:
    """List available knowledge base directories."""
    KNOWLEDGE_ROOT.mkdir(parents=True, exist_ok=True)
    return [
        {"name": path.name}
        for path in sorted(KNOWLEDGE_ROOT.iterdir())
        if path.is_dir() and not path.name.startswith(".")
    ]

