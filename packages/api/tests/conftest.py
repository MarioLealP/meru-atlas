import httpx2
import pytest
from fastapi import FastAPI


@pytest.fixture
def asgi_client():
    def make(app: FastAPI) -> httpx2.AsyncClient:
        return httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://test")

    return make
