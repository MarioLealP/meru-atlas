"""GET /api/events: Server-Sent Events saying WHICH file changed ("status" / "graph").

Names only, never data: the page refetches through /api/status and /api/graph, so every
byte it shows still goes through schema validation and the SSO guard. Each connection is
bounded (EventSource reconnects by itself), so a dead client can't hold a task forever.
"""

import asyncio
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api")


async def _stream(request: Request) -> AsyncIterator[str]:
    s = request.app.state.settings
    files = {"status": request.app.state.status, "graph": request.app.state.graph}
    seen = {name: f.mtime_ns() for name, f in files.items()}
    start = last_out = time.monotonic()
    yield "retry: 5000\n\n"
    while time.monotonic() - start < s.events_max_s and not await request.is_disconnected():
        await asyncio.sleep(s.events_poll_s)
        for name, f in files.items():
            if (m := f.mtime_ns()) != seen[name]:
                seen[name] = m
                last_out = time.monotonic()
                yield f"event: {name}\ndata: {{}}\n\n"
        if time.monotonic() - last_out > s.events_keepalive_s:
            last_out = time.monotonic()
            yield ": keep-alive\n\n"  # comment line: keeps proxies from timing the stream out


@router.get("/events")
def events(request: Request) -> StreamingResponse:
    headers = {"Cache-Control": "no-store", "X-Accel-Buffering": "no"}
    return StreamingResponse(_stream(request), media_type="text/event-stream", headers=headers)
