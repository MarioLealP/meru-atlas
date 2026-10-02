<script lang="ts">
  import { onMount } from "svelte";
  import Card from "./components/Card.svelte";
  import Map from "./components/Map.svelte";
  import RouteBar from "./components/RouteBar.svelte";
  import Toolbar from "./components/Toolbar.svelte";
  import { getValidated } from "./lib/api";
  import { Model } from "./lib/graph/model";
  import { unitLive, type UnitLive } from "./lib/live/health";
  import { live } from "./lib/live/poll.svelte";
  import { Graph } from "./lib/schemas";
  import { ui } from "./lib/state.svelte";
  import { readHash, writeHash } from "./lib/view/hash";
  import { isNarrow, overview } from "./lib/view/overview";
  import { TOP_BAR, type Inset, type panzoom } from "./lib/view/panzoom";
  import { boundsOf } from "./lib/view/bounds";
  import { buildScene } from "./lib/view/scene";

  let model = $state<Model | null>(null);
  let scene = $state<Awaited<ReturnType<typeof buildScene>> | null>(null);
  let error = $state<string | null>(null);
  let api = $state<ReturnType<typeof panzoom>>();
  let toolbar = $state<{ focusSearch: () => void }>();

  const liveBy = $derived.by(() => {
    const out = new globalThis.Map<string, UnitLive>();
    if (model && live.data) for (const n of model.nodes.values()) out.set(n.id, unitLive(n, live.data));
    return out;
  });

  let notice = $state<string | null>(null); // an answer, e.g. "no request path": not an error
  const CARD_PX = 452; // card width + gutters (Card.svelte)
  const SHEET = 0.58; // phone bottom sheet height, share of the viewport (Card.svelte)

  /** What the open card covers: a side panel on a big screen, a bottom sheet on a phone. */
  function cardInset(): Inset {
    if (!ui.cardOpen) return { top: TOP_BAR };
    return isNarrow() ? { top: TOP_BAR, bottom: innerHeight * SHEET } : { top: TOP_BAR, right: CARD_PX };
  }
  /** Frame the focused unit and its peers (or a traced route) in the uncovered part. */
  function frame() {
    if (!model || !scene) return;
    // phone: the unit alone (peers would shrink it to unreadable; the card lists them)
    const focus = ui.selected && (isNarrow() ? [ui.selected] : [ui.selected, ...model.peers(ui.selected)]);
    const ids = ui.trace ? ui.trace.path : focus || [];
    const lines = (ui.trace?.edges ?? []).map((i) => scene!.points.get(i) ?? []);
    const b = boundsOf(ids, scene.layout.nodes, lines);
    if (b) api?.fit(b, cardInset(), ui.trace ? 0.88 : 0.95, 1.1); // traces leave room for the toast
  }
  const home = () => api && scene && overview(api, scene.layout);
  /** Fly to one unit at reading zoom without changing the selection (route steps). */
  function flyTo(id: string) {
    const b = scene && boundsOf([id], scene.layout.nodes, [], 120);
    if (b) api?.fit(b, { top: TOP_BAR, bottom: 120 }, 0.95, 1.1);
  }
  function pick(id: string | null) {
    if (!model) return;
    if (id && ui.traceFrom && id !== ui.traceFrom) {
      const t = model.trace(ui.traceFrom, id);
      const from = model.nodes.get(ui.traceFrom)!.label,
        to = model.nodes.get(id)!.label;
      ui.trace = t ? { path: t.path, edges: t.edges.map((e) => e.i) } : null;
      notice = t ? null : `${from} has no request path to ${to}.`;
      writeHash(t ? { route: [ui.traceFrom, id] } : {});
      ui.traceFrom = null;
      ui.selected = t ? id : null;
      ui.cardOpen = false;
      frame();
      return;
    }
    ui.trace = null;
    ui.traceFrom = null;
    notice = null;
    ui.selected = id;
    ui.cardOpen = !!id;
    writeHash(id ? { unit: id } : {});
  }
  /** Pick from a list (search, peers): also move the view there. */
  const go = (id: string) => (pick(id), frame());
  function startTrace(from: string) {
    ui.trace = null;
    ui.traceFrom = from;
    ui.cardOpen = false;
  }
  function applyHash() {
    if (!model) return;
    const d = readHash();
    if (d.route && model.nodes.has(d.route[0]) && model.nodes.has(d.route[1])) {
      ui.traceFrom = d.route[0];
      pick(d.route[1]);
    } else if (d.unit && model.nodes.has(d.unit)) {
      go(d.unit);
    }
  }

  function onkey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "Escape") pick(null);
    else if (e.key === "/") {
      e.preventDefault();
      toolbar?.focusSearch();
    } else if (e.key === "f") home();
    else if (e.key === "+" || e.key === "=") api?.zoomBy(1.25);
    else if (e.key === "-") api?.zoomBy(0.8);
  }

  onMount(() => {
    getValidated("/api/graph", Graph)
      .then(async (g) => {
        model = new Model(g);
        scene = await buildScene(model);
        queueMicrotask(applyHash);
      })
      .catch((e: Error) => (error = e.message));
    live.start();
    return () => live.stop();
  });
</script>

<svelte:window onkeydown={onkey} onhashchange={applyHash} />

<main>
  {#if model && scene}
    <!-- on a phone a tap also frames the unit, else the bottom sheet could cover it -->
    <Map
      {model}
      layout={scene.layout}
      paths={scene.paths}
      {liveBy}
      onpick={(id) => (id && isNarrow() ? go(id) : pick(id))}
      bind:api
    />
    <Toolbar bind:this={toolbar} {model} onpick={go} onfit={home} />
    {#if ui.selected && ui.cardOpen}
      <Card
        {model}
        id={ui.selected}
        live={liveBy.get(ui.selected)}
        onpick={go}
        ontrace={startTrace}
        onclose={() => (ui.cardOpen = false)}
      />
    {/if}
    {#if ui.trace || notice}
      <RouteBar {model} path={ui.trace?.path ?? null} {notice} onstep={flyTo} onclear={() => pick(null)} />
    {/if}
  {:else if !error}
    <p class="status">loading the map…</p>
  {/if}
  {#if error}<p class="status err">{error}</p>{/if}
</main>

<style>
  main {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }
  .status {
    position: absolute;
    bottom: 16px;
    left: 16px;
    font: 14px var(--font-mono);
    color: var(--color-muted);
  }
  .err {
    color: var(--color-danger);
  }
</style>
