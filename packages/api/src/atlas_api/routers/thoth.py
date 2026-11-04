"""What Thoth knows about each Meru app (J5): active, retained, ... - shown beside each app in On main."""

import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from atlas_api.security import NO_IDENTITY
from atlas_api.services.thoth import AppStatus, ThothUnavailableError

router = APIRouter(prefix="/api/thoth")
log = logging.getLogger(__name__)


@router.get(
    "/apps",
    response_model=list[AppStatus],
    status_code=200,
    responses=NO_IDENTITY | {503: {"description": "Thoth isn't configured or didn't answer"}},
)
async def apps(request: Request) -> JSONResponse:
    """Thoth's status for each app; 503 when Thoth is unset or doesn't answer."""
    thoth = request.app.state.thoth
    if thoth is None:
        raise HTTPException(status_code=503, detail="Thoth isn't configured here")
    try:
        found = await thoth.apps()
    except ThothUnavailableError as e:
        log.warning("thoth: %s", e)
        raise HTTPException(status_code=503, detail="Thoth unavailable") from e
    return JSONResponse([a.model_dump() for a in found], headers={"Cache-Control": "no-store"})
