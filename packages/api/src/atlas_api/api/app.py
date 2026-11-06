"""App factory. Run: uvicorn atlas_api.api.app:create_app --factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx2
import sentry_sdk
from fastapi import FastAPI

from atlas_api.api import data, events, health, thoth, web
from atlas_api.api.security import identity_guard
from atlas_api.clients.thoth import Thoth
from atlas_api.config import Settings
from atlas_api.core.datafiles import DataFile

# Crash reports to GlitchTip (D125): SENTRY_DSN comes from nuwa-app's glitchtip.dsn; unset, the SDK stays off.
# No local variables or request bodies in a report - either can hold a secret.
sentry_sdk.init(include_local_variables=False, max_request_body_size="never")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Wire the app: data files, the SSO guard, routers, and the frontend when `web_dir` is set."""
    s = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        async with httpx2.AsyncClient(timeout=10) as http:
            if s.thoth_token_file is not None:
                app.state.thoth = Thoth(
                    http=http,
                    url=s.thoth_url,
                    token_url=s.thoth_token_url,
                    client_id=s.thoth_client_id,
                    token_file=s.thoth_token_file,
                )
            yield

    app = FastAPI(title="clockmost atlas", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.thoth = None
    app.state.settings = s
    app.state.graph = DataFile(path=s.graph_file, schema_name="graph")
    app.state.status = DataFile(path=s.status_file, schema_name="status")
    app.state.docs = DataFile(path=s.docs_file or s.graph_file.with_name("docs.json"), schema_name="docs")
    app.middleware("http")(identity_guard(s.identity_header, s.dev_mode))
    app.include_router(health.router)
    app.include_router(data.router)
    app.include_router(events.router)
    app.include_router(thoth.router)
    if s.web_dir:
        app.include_router(web.make_router(s.web_dir))
    return app
