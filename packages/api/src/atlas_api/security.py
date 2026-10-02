"""Request guard + response headers. Kept separate from the routes on purpose."""

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import PlainTextResponse

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; "
    "form-action 'none'; frame-ancestors 'none'"
)
OPEN_PATHS = {"/healthz"}  # Docker healthcheck only; reveals nothing


def identity_guard(header: str, dev_mode: bool):
    async def guard(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if not dev_mode and request.url.path not in OPEN_PATHS and not request.headers.get(header):
            return PlainTextResponse("forbidden: no SSO identity", status_code=403)
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = CSP
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    return guard
