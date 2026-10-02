"""GET-only data endpoints. Responses are the validated files, nothing added."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from atlas_api.services.datafiles import DataUnavailable

router = APIRouter(prefix="/api")


def _serve(request: Request, name: str) -> JSONResponse:
    try:
        doc = getattr(request.app.state, name).load()
    except DataUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return JSONResponse(doc, headers={"Cache-Control": "no-store"})


@router.get("/graph")
def graph(request: Request) -> JSONResponse:
    return _serve(request, "graph")


@router.get("/status")
def status(request: Request) -> JSONResponse:
    return _serve(request, "status")
