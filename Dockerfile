# The atlas on Meru: the Svelte frontend built (and checked) in a Node stage, the API in Meru's Python base.
# Bases pinned by digest, like every Meru image; Kyverno only admits the signed result.

# Frontend: the checks run here, not on the check runner - an image can't exist without them passing.
FROM docker.io/library/node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS web
RUN apk add --no-cache bash grep
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
COPY schemas/ /src/schemas/
COPY packages/generator/tests/fixtures/ /src/packages/generator/tests/fixtures/
COPY scripts/secret-scan.sh /src/scripts/
RUN npm run format:check && npm run check && npm run test && npm run build \
  && cd /src && scripts/secret-scan.sh frontend/dist schemas packages/generator/tests/fixtures

FROM docker.io/library/python:3.15.2-slim@sha256:c4158543ecb725b99e57d129dfd43d761d4c43e4577b5e23326aabb223cf7f4e
COPY --from=ghcr.io/astral-sh/uv:0.13.6@sha256:af22a52f5eafef3d78e551599d405c02df61919d18028f0cea8eda93bc9986d0 /uv /bin/uv

WORKDIR /app
ENV UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
COPY pyproject.toml uv.lock ./
COPY packages ./packages
COPY schemas ./packages/generator/src/atlas_gen/schemas
RUN uv sync --frozen --no-dev --all-packages --no-editable && rm /bin/uv
COPY --from=web /src/frontend/dist /app/web

# The root filesystem is read-only in Meru, so no .pyc files; the numeric user matches nuwa-app's runAsUser.
ENV PATH=/app/.venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ATLAS_WEB_DIR=/app/web
USER 10001
EXPOSE 8080
CMD ["uvicorn", "atlas_api.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--no-server-header"]
