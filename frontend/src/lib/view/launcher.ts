// Ctrl+K launcher: every link of every unit (plus units with no link, to show on the map),
// ranked against what you type. Pure, tested.
import type { Model } from "../graph/model";

export type Entry = { unit: string; title: string; hint: string; url?: string; doc?: string };

export function entries(m: Model): Entry[] {
  return [...m.nodes.values()].flatMap((n): Entry[] => {
    const links = n.links ?? [];
    if (!links.length) return [{ unit: n.id, title: n.label, hint: n.sub ?? "" }];
    return links.map((l) => ({
      unit: n.id,
      title: links.length > 1 ? `${n.label} · ${l.title}` : n.label,
      hint: new URL(l.url).host,
      url: l.url,
    }));
  });
}

/** 3 = a word starts with q, 2 = contains q, 1 = q's letters in order, 0 = no match. */
export function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t.split(/[\s·.\-/]+/).some((w) => w.startsWith(q))) return 3;
  if (t.includes(q)) return 2;
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

export function rank(all: Entry[], query: string, max = 10): Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return all.filter((e) => e.url).slice(0, max);
  return all
    .map((e) => ({ e, s: Math.max(score(e.title, q) * 2, score(e.hint, q)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || Number(!a.e.url) - Number(!b.e.url) || a.e.title.localeCompare(b.e.title))
    .slice(0, max)
    .map((x) => x.e);
}

/** Docs pages as launcher entries: Enter opens the page in the Docs view. */
export function docEntries(pages: { id: string; title: string; kind: string }[]): Entry[] {
  return pages.map((p) => ({ unit: "", title: p.title, hint: `docs · ${p.kind}`, doc: p.id }));
}
