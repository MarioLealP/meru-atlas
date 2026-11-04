"""The page contract: strict frontmatter (pydantic) and the fixed section set."""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

ID = r"^[a-z0-9][a-z0-9-]*$"
PageId = Annotated[str, StringConstraints(pattern=ID)]

SECTIONS = (
    "What it is",
    "How it works",
    "Where it lives",
    "Do things",
    "When it breaks",
    "Credentials & certs",
    "Why",
)
REQUIRED_SECTIONS = ("What it is",)

# frontmatter relation -> how the reverse side reads on the target page
RELATIONS = {
    "runs-on": "runs here",
    "part-of": "parts",
    "reports-to": "reported by",
    "talks-to": "talked to by",
    "cert-from": "gets certs",
    "devices": "reachable from here",
    "mentions": "mentioned by",
    "embeds": "embedded in",
}

Kind = Literal["app", "component", "device", "topic", "access"]
Status = Literal["active", "temporary", "retire", "junk?"]


class Frontmatter(BaseModel):
    """A page's YAML header; hyphenated keys come in through aliases."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str = Field(min_length=1)
    kind: Kind
    node: PageId | None = None  # the atlas map node this page documents (default: same id)
    runs_on: PageId | None = Field(default=None, alias="runs-on")
    part_of: PageId | None = Field(default=None, alias="part-of")
    reports_to: list[PageId] = Field(default_factory=list, alias="reports-to")
    talks_to: list[PageId] = Field(default_factory=list, alias="talks-to")
    cert_from: list[PageId] = Field(default_factory=list, alias="cert-from")
    devices: list[PageId] = Field(default_factory=list)
    installed_by: str | None = Field(default=None, alias="installed-by", pattern=r"^(manual|repo: \S+|package: \S+)$")
    status: Status
    verified: date

    @field_validator("reports_to", "talks_to", "cert_from", "devices", mode="before")
    @classmethod
    def _listify(cls, v: object) -> object:
        return [v] if isinstance(v, str) else v

    @model_validator(mode="after")
    def _installed_by_for_things(self) -> Frontmatter:
        if self.kind in ("app", "component", "access") and not self.installed_by:
            raise ValueError(f"installed-by is required for kind {self.kind}")
        return self

    def relations(self) -> list[tuple[str, str]]:
        """(kind, target id) for every frontmatter relation, in a stable order."""
        out = [("runs-on", self.runs_on), ("part-of", self.part_of)]
        out += [("reports-to", t) for t in self.reports_to]
        out += [("talks-to", t) for t in self.talks_to]
        out += [("cert-from", t) for t in self.cert_from]
        out += [("devices", t) for t in self.devices]
        return [(k, t) for k, t in out if t]
