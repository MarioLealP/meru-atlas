"""Split one page file into frontmatter + `## ` sections, and find its [[links]]."""

import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field, ValidationError

from atlas_gen.docs.model import ID, REQUIRED_SECTIONS, SECTIONS, Frontmatter

FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n?(.*)\Z", re.S)
LINK = re.compile(r"(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
EMBED_LINE = re.compile(r"^!\[\[([a-z0-9][a-z0-9-]*)\]\]\s*$")


class Page(BaseModel):
    id: str
    path: str  # relative to the repo root
    fm: Frontmatter | None
    sections: list[tuple[str, str]]  # (title, markdown body)
    links: list[tuple[str, str]] = Field(default_factory=list)  # ("mentions"|"embeds", target id)
    errors: list[str] = Field(default_factory=list)


def _sections(body: str, where: str, errors: list[str]) -> list[tuple[str, str]]:
    """`## ` headings outside code fences start sections; text before the first is refused
    (an H1 is allowed and dropped: the title comes from frontmatter)."""
    out: list[tuple[str, list[str]]] = []
    fence = False
    for n, line in enumerate(body.splitlines(), 1):
        if line.lstrip().startswith(("```", "~~~")):
            fence = not fence
        if not fence and line.startswith("## "):
            out.append((line[3:].strip(), []))
        elif out:
            out[-1][1].append(line)
        elif line.strip() and not line.startswith("# "):
            errors.append(f"{where}: line {n} of the body is outside any `## ` section")
    return [(t, "\n".join(b).strip()) for t, b in out]


def _links(sections: list[tuple[str, str]], where: str, errors: list[str]) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for _, body in sections:
        for m in LINK.finditer(body):
            target = m.group(2).strip()
            if not re.fullmatch(ID, target):
                errors.append(f"{where}: [[{target}]] is not a page id (lowercase, digits, -)")
                continue
            found.append(("embeds" if m.group(1) else "mentions", target))
    return list(dict.fromkeys(found))


def parse(path: Path, repo: Path) -> Page:
    rel = path.relative_to(repo).as_posix()
    errors: list[str] = []
    m = FRONTMATTER.match(path.read_text(encoding="utf-8-sig").replace("\r\n", "\n"))
    if not m:
        return Page(
            id=path.stem, path=rel, fm=None, sections=[], errors=[f"{rel}: no `---` frontmatter block"]
        )
    fm: Frontmatter | None = None
    try:
        raw: Any = yaml.safe_load(m.group(1)) or {}
        fm = Frontmatter.model_validate(raw)
    except yaml.YAMLError as e:
        errors.append(f"{rel}: frontmatter is not valid YAML ({e.__class__.__name__})")
    except ValidationError as e:
        for err in e.errors():
            loc = ".".join(str(x) for x in err["loc"]) or "frontmatter"
            errors.append(f"{rel}: {loc}: {err['msg']}")
    sections = _sections(m.group(2), rel, errors)
    titles = [t for t, _ in sections]
    errors += [
        f"{rel}: unknown section `## {t}` (allowed: {', '.join(SECTIONS)})"
        for t in titles
        if t not in SECTIONS
    ]
    errors += [
        f"{rel}: duplicate section `## {t}`" for t in sorted({t for t in titles if titles.count(t) > 1})
    ]
    errors += [f"{rel}: missing section `## {t}`" for t in REQUIRED_SECTIONS if t not in titles]
    if not re.fullmatch(ID, path.stem):
        errors.append(f"{rel}: file name must be a page id (lowercase, digits, -)")
    return Page(
        id=path.stem, path=rel, fm=fm, sections=sections, links=_links(sections, rel, errors), errors=errors
    )
