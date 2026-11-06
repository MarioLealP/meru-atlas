# clockmost atlas

The live, repo-generated map **and home page** of the clockmost home lab:
every service, how it connects, how you log in to it, and its live health, at
`https://atlas.clockmost.com` (SSO, admins only, LAN/VPN only).

Plan, security model and decisions: `runbooks/clockmost-atlas-project.md` on Mario's
workspace. **Status: phase 0 (foundations).** The live site is still the v0 atlas in
the infra repo (`atlas/`) until the phase 4 cutover.

## How it fits together

```
infra repo ──CI──▶ graph.json ─┐                       (structure, generated)
host collector ──▶ status.json ┤ read-only mounts      (live, every minute)
                               ▼
        browser ─▶ Caddy (SSO) ─▶ atlas container: SPA + read-only /api
```

The container is on **one** network (Caddy's `front-atlas`), holds no Docker socket,
no tokens, and initiates no connections. Data arrives as files.

## Layout

| path | what |
|---|---|
| `schemas/` | JSON Schemas: the data contract (`graph`, `status`) |
| `packages/generator/` | `atlas_gen`: builds `graph.json` from the infra repo (phase 1), validates data |
| `packages/api/` | `atlas_api`: FastAPI backend, read-only, SSO-identity guard, CSP |
| `frontend/` | Svelte 5 + TypeScript + Tailwind v4, zod-validated API client, ELK layout (phase 2) |
| `scripts/secret-scan.sh` | fails CI if anything secret-shaped reaches the bundle or data |

## Development

Prerequisites: [uv](https://docs.astral.sh/uv/) ≥ 0.12, Python 3.15, Node ≥ 20.19.

```bash
git clone git@git.clockmost.com:MarioGLealP/clockmost-atlas.git && cd clockmost-atlas

# python (generator + api)
uv sync --all-packages
uv run ruff format --check . && uv run ruff check . && uv run pytest -q

# frontend
cd frontend && npm ci --ignore-scripts
npm run format:check && npm run check && npm run build

# run locally (dev mode skips the SSO-identity check)
ATLAS_DEV_MODE=true ATLAS_GRAPH_FILE=packages/generator/tests/fixtures/graph.min.json \
ATLAS_STATUS_FILE=packages/generator/tests/fixtures/status.min.json \
  uv run uvicorn atlas_api.api.app:create_app --factory --reload
cd frontend && npm run dev   # proxies /api to :8000
```

Validate a data file: `uv run atlas-gen validate status /var/lib/clockmost-atlas/status.json`.

## Rules

- **No god files.** One job per module; a file over ~300 lines needs a reason.
- **Secrets**: only in a sops-encrypted `secrets.env` (infra repo) → gitignored `.env` →
  read by the backend via pydantic-settings as `SecretStr`. Never in the frontend,
  never in a response, never in a log. `scripts/secret-scan.sh` enforces it in CI.
- **Read-only.** No write endpoints, no actions (Arcane does those).
- Conventional Commits, trunk-based (`main` protected, short-lived branches).

## License

MIT, see `LICENSE`.
