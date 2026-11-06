"""GET-only data endpoints. Responses are the validated files, nothing added."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from atlas_api.api.security import NO_IDENTITY
from atlas_api.core.datafiles import DataUnavailableError

router = APIRouter(prefix="/api")
ERRORS = NO_IDENTITY | {503: {"description": "The file is missing or fails its schema"}}


def _serve(request: Request, name: str) -> JSONResponse:
    try:
        doc = getattr(request.app.state, name).load()
    except DataUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return JSONResponse(doc, headers={"Cache-Control": "no-store"})


@router.get("/graph", status_code=200, responses=ERRORS)
def graph(request: Request) -> JSONResponse:
    """The map: graph.json as generated."""
    return _serve(request, "graph")


@router.get("/status", status_code=200, responses=ERRORS)
def status(request: Request) -> JSONResponse:
    """Live status: status.json as mounted."""
    return _serve(request, "status")


@router.get("/docs", status_code=200, responses=ERRORS)
def docs(request: Request) -> JSONResponse:
    """The docs pages: docs.json as generated."""
    return _serve(request, "docs")
