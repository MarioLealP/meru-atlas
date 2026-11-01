// Docs helpers: relation wording, staleness, the attention list, search. Pure, tested.
import { score } from "../view/launcher";
import type { DocPage, Docs, RelKind } from "../schemas";

/** How a relation reads from the page that declares it, and from the page it points at. */
export const REL: Record<RelKind, [forward: string, reverse: string]> = {
  "runs-on": ["runs on", "runs here"],
  "part-of": ["part of", "parts"],
  "reports-to": ["reports to", "reported by"],
  "talks-to": ["talks to", "talked to by"],
  "cert-from": ["certs from", "issues certs to"],
  devices: ["reachable from", "access from here"],
  mentions: ["mentions", "mentioned by"],
  embeds: ["embeds", "embedded in"],
};

export const STALE_DAYS = 60;

export class DocIndex {
  readonly byId = new Map<string, DocPage>();
  readonly byNode = new Map<string, DocPage>();
  constructor(readonly d: Docs) {
    for (const p of d.pages) {
      this.byId.set(p.id, p);
      if (p.node) this.byNode.set(p.node, p);
    }
  }
  title(id: string): string {
    return this.byId.get(id)?.title ?? id;
  }
}

export function ageDays(p: DocPage, now = Date.now()): number {
  return Math.floor((now - Date.parse(p.verified)) / 86_400_000);
}
export const isStale = (p: DocPage, now = Date.now()) => ageDays(p, now) > STALE_DAYS;

/** Pages that need a look: not active, or not checked against the real machine for 60 days. */
export function attention(pages: DocPage[], now = Date.now()): DocPage[] {
  return pages.filter((p) => p.status !== "active" || isStale(p, now));
}

/** Title matches first, then the page's text (section titles + rendered body, tags stripped). */
export function search(pages: DocPage[], query: string): DocPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...pages].sort((a, b) => a.title.localeCompare(b.title));
  const text = (p: DocPage) =>
    p.sections
      .flatMap((s) => [s.title, ...s.blocks.map((b) => ("html" in b ? b.html.replace(/<[^>]+>/g, " ") : ""))])
      .join(" ")
      .toLowerCase();
  return pages
    .map((p) => ({ p, s: score(p.title, q) * 2 || (text(p).includes(q) ? 1 : 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.title.localeCompare(b.p.title))
    .map((x) => x.p);
}
