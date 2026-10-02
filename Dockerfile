# syntax=docker/dockerfile:1
# --- frontend build -------------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- python deps ----------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.13-trixie-slim AS py
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
COPY pyproject.toml uv.lock ./
COPY packages ./packages
COPY schemas ./packages/generator/src/atlas_gen/schemas
RUN uv sync --frozen --no-dev --all-packages --no-editable

# --- runtime: non-root, no shell tools needed, read-only rootfs friendly ---
FROM python:3.13-slim-trixie
RUN useradd --uid 10050 --no-create-home --shell /usr/sbin/nologin atlas
COPY --from=py /app/.venv /app/.venv
COPY --from=web /web/dist /app/web
ENV PATH=/app/.venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 ATLAS_WEB_DIR=/app/web
USER atlas
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz').status==200 else 1)"
CMD ["uvicorn", "atlas_api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-server-header"]
