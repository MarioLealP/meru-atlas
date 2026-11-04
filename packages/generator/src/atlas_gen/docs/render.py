"""Markdown -> HTML for the atlas.

Raw HTML in a page is escaped (html=False) and markdown-it refuses javascript:/vbscript:/file: links, so the page
can't inject markup or script.
"""

import re
from typing import Any

from markdown_it import MarkdownIt

from atlas_gen.docs.parse import EMBED_LINE, LINK

_md = MarkdownIt("commonmark", {"html": False}).enable(["table", "strikethrough"])


def _escape(text: str) -> str:
    return re.sub(r"([\\\[\]*_`])", r"\\\1", text)


def _wikilinks(body: str, titles: dict[str, str]) -> str:
    def sub(m: re.Match[str]) -> str:
        target = m.group(2).strip()
        label = m.group(3) or titles.get(target, target)
        return f"[{_escape(label.strip())}](#doc/{target})"

    return LINK.sub(sub, body)


def blocks(body: str, titles: dict[str, str]) -> list[dict[str, Any]]:
    """A section body as blocks: rendered HTML, with `![[id]]` lines split out as embeds."""
    out: list[dict[str, Any]] = []
    buf: list[str] = []

    def flush() -> None:
        if text := "\n".join(buf).strip():
            out.append({"html": _md.render(_wikilinks(text, titles))})
        buf.clear()

    for line in body.splitlines():
        if m := EMBED_LINE.match(line):
            flush()
            out.append({"embed": m.group(1)})
        else:
            buf.append(line)
    flush()
    return out
