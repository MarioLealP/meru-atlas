"""The liveness probe."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz", status_code=200, include_in_schema=False)
async def healthz() -> dict[str, str]:
    """Answer ok without an SSO identity (see OPEN_PATHS)."""
    return {"status": "ok"}
