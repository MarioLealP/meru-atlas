"""Reading Thoth (D92: the atlas's one credential is a read-only Thoth identity).

It logs in with its own Kubernetes token (D104: nuwa-app authentikLogin, audience authentik) - no password anywhere.
Authentik answers a 10-minute token for k8s-atlas-atlas with thoth.read only, kept until a minute before it runs out.
The browser never sees it: the frontend asks /api/thoth/apps on its own origin.
"""

import time
from pathlib import Path

import httpx2
from pydantic import BaseModel, ConfigDict, PrivateAttr, SecretStr, TypeAdapter

ASSERTION = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
EARLY = 60  # seconds before expiry when a token counts as used up


class _TokenAnswer(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    access_token: SecretStr
    expires_in: int = 600


class AppStatus(BaseModel):
    """One Meru app as Thoth knows it."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    key: str
    status: str


_APPS = TypeAdapter(list[AppStatus])


class ThothUnavailableError(Exception):
    """Authentik or Thoth didn't answer as expected - the reason is logged, the browser gets a 503."""


class Thoth(BaseModel):
    """Client for Thoth's item list, holding the short-lived login token."""

    model_config = ConfigDict(frozen=True, arbitrary_types_allowed=True)

    http: httpx2.AsyncClient
    url: str
    token_url: str
    client_id: str
    token_file: Path
    _token: SecretStr | None = PrivateAttr(default=None)
    _expires: float = PrivateAttr(default=0.0)

    async def _bearer(self) -> str:
        if self._token is None or time.monotonic() >= self._expires - EARLY:
            response = await self.http.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "scope": self.client_id,
                    "client_assertion_type": ASSERTION,
                    # re-read each time: the kubelet swaps in a fresh token before the old one runs out
                    "client_assertion": self.token_file.read_text().strip(),
                },
            )
            if response.status_code != 200:
                raise ThothUnavailableError(f"Authentik refused the atlas's login: {response.status_code}")
            answer = _TokenAnswer.model_validate_json(response.content)
            self._token, self._expires = answer.access_token, time.monotonic() + answer.expires_in
        return self._token.get_secret_value()

    async def apps(self) -> list[AppStatus]:
        """Every Meru app Thoth knows, sorted by key.

        Raises:
            ThothUnavailableError: Authentik or Thoth didn't answer as expected.
        """
        try:
            response = await self.http.get(
                f"{self.url}/v1/items",
                params={"type": "app", "limit": 1000},
                headers={"Authorization": f"Bearer {await self._bearer()}"},
            )
        except httpx2.HTTPError as e:
            raise ThothUnavailableError(f"Thoth unreachable: {type(e).__name__}") from e
        if response.status_code != 200:
            raise ThothUnavailableError(f"Thoth answered {response.status_code}")
        return sorted(_APPS.validate_json(response.content), key=lambda a: a.key)
