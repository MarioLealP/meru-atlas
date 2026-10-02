<script lang="ts">
  import { onMount } from "svelte";
  import Card from "./components/Card.svelte";
  import Catalogue from "./components/Catalogue.svelte";
  import Map from "./components/Map.svelte";
  import ExposureBar from "./components/ExposureBar.svelte";
  import Launcher from "./components/Launcher.svelte";
  import RouteBar from "./components/RouteBar.svelte";
  import Toolbar from "./components/Toolbar.svelte";
  import { getValidated } from "./lib/api";
  import { Model } from "./lib/graph/model";
  import { unitLive, type UnitLive } from "./lib/live/health";
  import { live } from "./lib/live/poll.svelte";
  import { Graph } from "./lib/schemas";
  import { ui } from "./lib/state.svelte";
  import { exposure } from "./lib/view/exposure";
  import { readHash, writeHash } from "./lib/view/hash";
  import { isNarrow, overview } from "./lib/view/overview";
  import { TOP_BAR, type Inset, type panzoom } from "./lib/view/panzoom";
  import { boundsOf } from "./lib/view/bounds";
  import { layoutScene, routeScene, type Scene } from "./lib/view/scene";
  import { wallList, wallTour } from "./lib/view/wall";

  let model = $state<Model | null>(null);
  let scene = $state.raw<Scene | null>(null); // replaced whole, never mutated: no deep proxy
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
      return;
    }
    ui.trace = null;
    ui.traceFrom = null;
    notice = null;
    ui.selected = id;
    ui.cardOpen = !!id;
    writeHash(id ? { unit: id } : {});
  }
  /** A tap on a box: the 1st selects it (its lines, the rest dimmed), the 2nd opens the card. */
  function tap(id: string | null) {
    if (id && id === ui.selected && !ui.trace && !ui.traceFrom) ui.cardOpen = true;
    else {
      pick(id);
      if (id && !ui.trace) ui.cardOpen = false;
    }
  }
  /** Pick from a list (search, peers, catalogue): switch to the map and move the view there. */
  function go(id: string) {
    ui.view = "map";
    pick(id);
    frame();
  }
  function setView(v: "map" | "list") {
    if (v === "list") pick(null);
    ui.view = v;
    writeHash(v === "list" ? { list: true } : {});
  }
  function startTrace(from: string) {
    ui.trace = null;
    ui.traceFrom = from;
    ui.cardOpen = false;
  }
  function applyHash() {
    if (!model) return;
    const d = readHash();
    if (d.list) setView("list");
    else if (d.route && model.nodes.has(d.route[0]) && model.nodes.has(d.route[1])) {
      ui.traceFrom = d.route[0];
      pick(d.route[1]);
    } else if (d.unit && model.nodes.has(d.unit)) {
      go(d.unit);
    }
  }

  // wall mode: full screen, no chrome, the card tours red then amber units (lib/view/wall.ts)
  let stopWall = $state<(() => void) | null>(null);
  function toggleWall() {
    if (stopWall) return stopWall();
    let i = 0;
    const step = () => {
      const list = model ? wallList(model, liveBy) : [];
      if (list.length) go(list[i++ % list.length]!);
    };
    stopWall = wallTour(step, () => {
      stopWall = null;
      pick(null);
      home();
    });
  }

  const xp = $derived(model && ui.lens === "exposure" ? exposure(model) : null);
  let launcher = $state(false); // Ctrl/Cmd+K palette (phase 5: the atlas as start page)

  function onkey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); // works from anywhere, inputs included
      launcher = !launcher;
      return;
    }
    if (launcher || (e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "Escape") stopWall ? stopWall() : pick(null);
    else if (e.key === "w" && ui.view === "map") toggleWall();
    else if (e.key === "e" && ui.view === "map") ui.lens = ui.lens === "exposure" ? null : "exposure";
    else if (e.key === "/") {
      e.preventDefault();
      toolbar?.focusSearch();
    } else if (e.key === "f") home();
    else if (e.key === "+" || e.key === "=") api?.zoomBy(1.25);
    else if (e.key === "-") api?.zoomBy(0.8);
  }

  /** Load (or, on a graph event, reload) the lab. The view and the hash selection survive. */
  async function loadGraph() {
    try {
      const m = new Model(await getValidated("/api/graph", Graph));
      const s = layoutScene(m); // boxes paint now; lines follow from the worker
      [model, scene, error] = [m, s, null];
      queueMicrotask(applyHash);
      const lines = await routeScene(m, s.layout);
      if (scene?.layout === s.layout) scene = { ...s, ...lines }; // unless a newer graph won
    } catch (e) {
      error = (e as Error).message;
    }
  }

  onMount(() => {
    void loadGraph();
    live.start(() => void loadGraph());
    return () => live.stop();
  });
</script>

<svelte:window onkeydown={onkey} onhashchange={applyHash} />

<main class="fixed inset-0 overflow-hidden">
  {#if model && scene}
    <!-- a tap on a box never moves or zooms the map (Mario, 2026-10-02); only list picks fly -->
    <Map {model} layout={scene.layout} paths={scene.paths} {liveBy} lens={xp} onpick={tap} bind:api />
    {#if ui.view === "list"}<Catalogue {model} {liveBy} onshow={go} />{/if}
    {#if !stopWall}
      <Toolbar bind:this={toolbar} {model} onpick={go} onfit={home} onview={setView} onwall={toggleWall} />
    {/if}
    {#if ui.view === "map" && ui.selected && ui.cardOpen}
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
    {#if xp && !ui.trace && !notice}
      <ExposureBar {model} x={xp} onstep={flyTo} onclose={() => (ui.lens = null)} />
    {/if}
    {#if launcher}<Launcher {model} onshow={go} onclose={() => (launcher = false)} />{/if}
  {:else if !error}
    <p class="ef-label absolute bottom-4 left-4">loading the map…</p>
  {/if}
  {#if error}<p class="absolute bottom-4 left-4 font-mono text-sm text-crit">{error}</p>{/if}
</main>
