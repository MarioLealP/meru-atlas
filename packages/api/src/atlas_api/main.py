"""App factory. Run: uvicorn atlas_api.main:create_app --factory"""

from fastapi import FastAPI

from atlas_api.routers import data, health, web
from atlas_api.security import identity_guard
from atlas_api.services.datafiles import DataFile
from atlas_api.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    s = settings or Settings()
    app = FastAPI(title="clockmost atlas", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.graph = DataFile(s.graph_file, "graph")
    app.state.status = DataFile(s.status_file, "status")
    app.middleware("http")(identity_guard(s.identity_header, s.dev_mode))
    app.include_router(health.router)
    app.include_router(data.router)
    if s.web_dir:
        app.include_router(web.make_router(s.web_dir))
    return app
