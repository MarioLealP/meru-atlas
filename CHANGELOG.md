# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com),
versions: [SemVer](https://semver.org).

## [Unreleased]

### Added
- `atlas-gen build`: graph.json from an infra checkout (parsers for compose, Caddy, cloudflared,
  Authentik blueprints; overlay join; unsorted units; warnings). Parity with v0 verified.
- CI publishes atlas-gen to Gitea's PyPI registry.
- Repository scaffold: uv workspace (generator + API), schemas, CI.
