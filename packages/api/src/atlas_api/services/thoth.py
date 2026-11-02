"""Reading Thoth (D92: the atlas's one credential is a read-only Thoth identity). It logs in with its own
Kubernetes token (D104: nuwa-app authentikLogin, audience authentik) - no password anywhere. Authentik answers
a 10-minute token for k8s-atlas-atlas with thoth.read only, kept until a minute before it runs out. The
browser never sees it: the frontend asks /api/thoth/apps on its own origin."""

import time
from pathlib import Path

import httpx2
from pydantic import BaseModel, ConfigDict, TypeAdapter

ASSERTION = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
EARLY = 60  # seconds before expiry when a token counts as used up


class _TokenAnswer(BaseModel):
    model_config = ConfigDict(extra="ignore")

    access_token: str
    expires_in: int = 600


class AppStatus(BaseModel):
    """One Meru app as Thoth knows it."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    key: str
    status: str


_APPS = TypeAdapter(list[AppStatus])


class ThothUnavailable(Exception):
    """Authentik or Thoth didn't answer as expected - the reason is logged, the browser gets a 503."""


class Thoth:
    def __init__(self, http: httpx2.AsyncClient, url: str, token_url: str, client_id: str, token_file: Path):
        self._http, self._url, self._token_url = http, url, token_url
        self._client_id, self._token_file = client_id, token_file
        self._token: str | None = None
        self._expires = 0.0

    async def _bearer(self) -> str:
        if self._token is None or time.monotonic() >= self._expires - EARLY:
            response = await self._http.post(
                self._token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "scope": self._client_id,
                    "client_assertion_type": ASSERTION,
                    # re-read each time: the kubelet swaps in a fresh token before the old one runs out
                    "client_assertion": self._token_file.read_text().strip(),
                },
            )
            if response.status_code != 200:
                raise ThothUnavailable(f"Authentik refused the atlas's login: {response.status_code}")
            answer = _TokenAnswer.model_validate_json(response.content)
            self._token, self._expires = answer.access_token, time.monotonic() + answer.expires_in
        return self._token

    async def apps(self) -> list[AppStatus]:
        try:
            response = await self._http.get(
                f"{self._url}/v1/items",
                params={"type": "app", "limit": 1000},
                headers={"Authorization": f"Bearer {await self._bearer()}"},
            )
        except httpx2.HTTPError as e:
            raise ThothUnavailable(f"Thoth unreachable: {type(e).__name__}") from e
        if response.status_code != 200:
            raise ThothUnavailable(f"Thoth answered {response.status_code}")
        return sorted(_APPS.validate_json(response.content), key=lambda a: a.key)
