# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com),
versions: [SemVer](https://semver.org).

## [Unreleased]

### Changed
- Meru standards: Python 3.15, line length 120, the template's ruff rules, a 500-line limit and a 2-minute
  pytest cap in `scripts/check.sh`. The generator's `build` and `join` split into small functions (same output),
  the API's `DataFile` and `Thoth` are frozen pydantic models, and its tests use an async client.

### Added
- Docs pages (infra repo `docs/**/*.md`): `atlas-gen docs` validates them (pydantic frontmatter,
  fixed `## ` sections, every relation and `[[link]]` must name a page) and writes `docs.json`
  (linked both ways, folded children, markdown-it HTML with raw HTML off); `atlas-gen
  docs-index` writes them plus the map's repo facts as SQLite for the agent. `/api/docs`, a
  `docs` SSE event, a Docs view (search, "needs a look", folded parts), a Docs tab on the card,
  docs pages in Ctrl+K, `#d=<page>` deep links.
- Own orthogonal line router (`frontend/src/lib/router`): grid A* with bend / crossing / lane-sharing
  costs, spread ports, reserved door corridors. Real map: 94/94 lines routed in <1 s, none
  through a box, no overlapping parallel lines.
- Fixed column layout module (`frontend/src/lib/layout/columns.ts`), grid-snapped.
- `frontend/scripts/render-svg.ts`: dev render of a graph.json to SVG.
- `atlas-gen build`: graph.json from an infra checkout (parsers for compose, Caddy, cloudflared,
  Authentik blueprints; overlay join; unsorted units; warnings). Parity with v0 verified.
- CI publishes atlas-gen to Gitea's PyPI registry.
- Repository scaffold: uv workspace (generator + API), schemas, CI.
