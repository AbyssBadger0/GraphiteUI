from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.run import RunDetail, RunSummary
from app.storage.run_store import list_runs, load_run


router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("", response_model=list[RunSummary])
def list_runs_endpoint() -> list[RunSummary]:
    return [RunSummary.model_validate(run) for run in list_runs()]


@router.get("/{run_id}", response_model=RunDetail)
def get_run_endpoint(run_id: str) -> RunDetail:
    try:
        return RunDetail.model_validate(load_run(run_id))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

