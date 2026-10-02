// Which lines are drawn and which units are lit. Lines are on demand: none in the overview
// (unless "all lines" is on), the hovered unit's as a preview, the focused unit's on focus,
// a traced route on its own. Pure, tested.
import type { Edge, Model } from "../graph/model";
import type { Kind } from "../state.svelte";

export type Focus = {
  selected: string | null;
  hover: string | null;
  trace: { path: string[]; edges: number[] } | null;
  allLines: boolean;
  layers: Record<Kind, boolean>;
};
export type Visible = { edges: Edge[]; lit: Set<string> | null; strong: boolean };

export function visible(m: Model, f: Focus): Visible {
  if (f.trace) {
    const ids = new Set(f.trace.edges);
    return { edges: m.edges.filter((e) => ids.has(e.i)), lit: new Set(f.trace.path), strong: true };
  }
  const on = (e: Edge) => f.layers[e.kind];
  if (f.selected) {
    const edges = m.edgesOf(f.selected).filter(on);
    const lit = new Set([f.selected, ...edges.flatMap((e) => [e.from, e.to])]);
    return { edges, lit, strong: true };
  }
  if (f.hover) return { edges: m.edgesOf(f.hover).filter(on), lit: null, strong: false };
  return { edges: f.allLines ? m.edges.filter(on) : [], lit: null, strong: false };
}
