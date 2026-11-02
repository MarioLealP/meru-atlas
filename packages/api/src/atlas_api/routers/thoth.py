"""What Thoth knows about each Meru app (J5): active, retained, ... - shown beside each app in On main."""

import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from atlas_api.services.thoth import ThothUnavailable

router = APIRouter(prefix="/api/thoth")
log = logging.getLogger(__name__)


@router.get("/apps")
async def apps(request: Request) -> JSONResponse:
    thoth = request.app.state.thoth
    if thoth is None:
        raise HTTPException(status_code=503, detail="Thoth isn't configured here")
    try:
        found = await thoth.apps()
    except ThothUnavailable as e:
        log.warning("thoth: %s", e)
        raise HTTPException(status_code=503, detail="Thoth unavailable") from e
    return JSONResponse([a.model_dump() for a in found], headers={"Cache-Control": "no-store"})
