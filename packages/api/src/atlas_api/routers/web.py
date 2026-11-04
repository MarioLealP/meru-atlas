"""The built frontend (frontend/dist): `/` is index.html, `/assets/<file>` the hashed bundle.

Deliberately not a generic static mount: one flat directory, file names checked against a
strict pattern (no `/`, no `..`), so nothing outside dist/assets can ever be served.
"""

import mimetypes
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

for ext, mime in ((".woff2", "font/woff2"), (".woff", "font/woff"), (".svg", "image/svg+xml")):
    mimetypes.add_type(mime, ext)  # the slim image's mime table lacks some of these

ASSET = re.compile(r"^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.[a-z0-9]+$")
IMMUTABLE = {"Cache-Control": "public, max-age=31536000, immutable"}  # names carry a content hash


def make_router(web_dir: Path) -> APIRouter:
    """Build the routes that serve the frontend built into `web_dir`."""
    router = APIRouter()
    assets = (web_dir / "assets").resolve()

    @router.get("/", status_code=200, include_in_schema=False)
    async def index() -> FileResponse:
        # never cached: it names the current hashed bundle
        return FileResponse(web_dir / "index.html", headers={"Cache-Control": "no-cache"})

    @router.get(
        "/assets/{name}", status_code=200, responses={404: {"description": "No such asset"}}, include_in_schema=False
    )
    def asset(name: str) -> FileResponse:
        path = assets / name
        if not ASSET.fullmatch(name) or path.resolve().parent != assets or not path.is_file():
            raise HTTPException(status_code=404)
        return FileResponse(path, headers=IMMUTABLE)

    return router
