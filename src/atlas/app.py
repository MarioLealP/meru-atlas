"""atlas: The clockmost atlas - the map of what runs where, and Meru's front door (Janus)"""

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

app = FastAPI(title="atlas")


@app.get("/heartbeat", response_class=PlainTextResponse)
def heartbeat() -> str:
    """Meru's liveness and readiness probes (nuwa-app's heartbeat.path) - add a /ready once there are dependencies."""
    return "ok"
