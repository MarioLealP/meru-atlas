# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com),
versions: [SemVer](https://semver.org).

## [Unreleased]

### Added
- Own orthogonal line router (`frontend/src/lib/router`): grid A* with bend / crossing / lane-sharing
  costs, spread ports, reserved door corridors. Real map: 94/94 lines routed in <1 s, none
  through a box, no overlapping parallel lines.
- Fixed column layout module (`frontend/src/lib/layout/columns.ts`), grid-snapped.
- `frontend/scripts/render-svg.ts`: dev render of a graph.json to SVG.
- `atlas-gen build`: graph.json from an infra checkout (parsers for compose, Caddy, cloudflared,
  Authentik blueprints; overlay join; unsorted units; warnings). Parity with v0 verified.
- CI publishes atlas-gen to Gitea's PyPI registry.
- Repository scaffold: uv workspace (generator + API), schemas, CI.
