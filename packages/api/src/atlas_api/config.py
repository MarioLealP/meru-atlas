"""Runtime configuration. Read ONLY here, from the environment / .env (pydantic-settings).

Secrets (none needed in v1) must be SecretStr fields here, so they never reach logs,
responses or the frontend. See the repo README "Secrets".
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Everything configurable, set through ATLAS_* variables."""

    model_config = SettingsConfigDict(env_prefix="ATLAS_", env_file=".env", extra="ignore", frozen=True)

    graph_file: Path = Path("/data/graph.json")
    status_file: Path = Path("/data/live/status.json")
    # docs.json is generated next to graph.json (infra repo atlas/); unset = that sibling
    docs_file: Path | None = None
    # Caddy's forward-auth injects this header after SSO; requests without it are
    # refused (fail closed if a route ever bypasses the gate). Dev mode skips it.
    identity_header: str = "X-Authentik-Username"
    dev_mode: bool = False
    # the built frontend (the Dockerfile sets /app/web); unset = API only (dev uses Vite)
    web_dir: Path | None = None
    # /api/events: how often to check the files, keep-alive gap, max connection lifetime (s)
    events_poll_s: float = 2.0
    events_keepalive_s: float = 25.0
    events_max_s: float = 900.0
    # Thoth (D92, D104): read with the pod's own Kubernetes token - no secret. Unset token file = no Thoth.
    thoth_url: str = "http://thoth.thoth.svc"
    thoth_token_url: str = "https://auth.clockmost.com/application/o/token/"
    thoth_client_id: str = "thoth"
    thoth_token_file: Path | None = None
