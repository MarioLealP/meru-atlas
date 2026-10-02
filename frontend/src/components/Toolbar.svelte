<script lang="ts">
  import type { Model } from "../lib/graph/model";
  import { ago, isStale } from "../lib/live/health";
  import { live } from "../lib/live/poll.svelte";
  import { KINDS, ui } from "../lib/state.svelte";
  import { KIND_BG } from "../lib/view/kinds";

  let {
    model,
    onpick,
    onfit,
    onview,
    onwall,
  }: {
    model: Model;
    onpick: (id: string) => void;
    onfit: () => void;
    onview: (v: "map" | "list") => void;
    onwall: () => void;
  } = $props();

  let q = $state("");
  let layersOpen = $state(false); // phone: the line chips drop down on demand
  let input: HTMLInputElement;
  const hits = $derived(
    q.trim()
      ? [...model.nodes.values()]
          .filter((n) =>
            `${n.label} ${n.sub ?? ""} ${n.does ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
          )
          .slice(0, 8)
      : [],
  );
  const choose = (id: string) => {
    q = "";
    input.blur();
    onpick(id);
  };
  export const focusSearch = () => input.focus();
  const bad = $derived(live.data ? live.data.problems.filter((p) => p.severity >= 4).length : 0);
  const liveState = $derived(!live.data || isStale(live.data) || live.error ? "crit" : bad ? "warn" : "ok");
  const onMap = $derived(ui.view === "map");
</script>

<header
  class={[
    "absolute inset-x-0 top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-ground px-3",
    "lg:gap-4 lg:px-4",
  ]}
>
  <div class="hidden font-display text-2xl font-bold tracking-[0.2em] whitespace-nowrap lg:block">
    CLOCKMOST <span class="text-accent">ATLAS</span>
  </div>

  <div class="flex self-stretch" role="tablist" aria-label="View">
    <button class="ef-tab px-2 lg:px-4" role="tab" aria-selected={onMap} onclick={() => onview("map")}>
      Map
    </button>
    <button class="ef-tab px-2 lg:px-4" role="tab" aria-selected={!onMap} onclick={() => onview("list")}>
      Catalogue
    </button>
  </div>

  <div class="relative min-w-0 flex-1 lg:max-w-sm">
    <input
      class="ef-input w-full"
      bind:this={input}
      bind:value={q}
      placeholder={ui.traceFrom
        ? `Route from ${model.nodes.get(ui.traceFrom)?.label} to… (pick a unit)`
        : "Find a unit  /"}
      aria-label="Find a unit"
      onkeydown={(e) => {
        if (e.key === "Enter" && hits[0]) choose(hits[0].id);
        if (e.key === "Escape") ((q = ""), input.blur());
      }}
    />
    {#if hits.length}
      <ul class="absolute inset-x-0 top-full z-20 border border-line bg-surface">
        {#each hits as h (h.id)}
          <li>
            <button
              class="flex w-full justify-between gap-2 px-3 py-2 text-left hover:bg-surface-2"
              onclick={() => choose(h.id)}
            >
              {h.label}<span class="ef-label">{h.sub ?? ""}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if onMap}
    <button
      class="ef-btn ef-btn--ghost px-2 lg:hidden"
      aria-expanded={layersOpen}
      onclick={() => (layersOpen = !layersOpen)}
    >
      Lines
    </button>
    <!-- phone: a sheet under the bar; desktop: inline chips -->
    <div
      class={[
        "absolute inset-x-0 top-14 flex-wrap gap-1 border-b border-line bg-ground p-3",
        layersOpen ? "flex" : "hidden",
        "lg:static lg:flex lg:border-0 lg:bg-transparent lg:p-0",
      ]}
    >
      {#each KINDS as [k, label] (k)}
        <button
          class={["ef-pill", !ui.layers[k] && "opacity-40"]}
          aria-pressed={ui.layers[k]}
          onclick={() => (ui.layers[k] = !ui.layers[k])}
          title="Show {label} lines"
        >
          <span class={["h-0.5 w-4", KIND_BG[k]]}></span>{label}
        </button>
      {/each}
      <button
        class={["ef-pill", ui.allLines && "border-accent text-accent"]}
        aria-pressed={ui.allLines}
        onclick={() => ui.setAllLines(!ui.allLines)}
      >
        All lines
      </button>
      <button
        class={["ef-pill", ui.lens === "exposure" && "border-crit text-crit"]}
        aria-pressed={ui.lens === "exposure"}
        onclick={() => {
          ui.lens = ui.lens === "exposure" ? null : "exposure";
          ui.net = null;
        }}
        title="What the internet can reach (e)"
      >
        Exposure
      </button>
      <button
        class={["ef-pill", ui.lens === "networks" && "border-accent text-accent"]}
        aria-pressed={ui.lens === "networks"}
        onclick={() => {
          ui.lens = ui.lens === "networks" ? null : "networks";
          ui.net = null;
        }}
        title="Which units share a Docker network (n)"
      >
        Networks
      </button>
      <button class="ef-pill" onclick={onfit} title="Fit the map (f)">Fit</button>
      <button class="ef-pill hidden lg:inline-flex" onclick={onwall} title="Wall mode (w)">Wall</button>
    </div>
  {/if}

  <div class="ef-pill ml-auto border-0 px-1 lg:border lg:px-3" data-state={liveState}>
    <span class="ef-diamond"></span>
    <span class="hidden lg:inline">
      {#if live.data}
        live · {ago(live.data.generated)} ago{#if bad}<span class="text-crit"> · {bad} high</span>{/if}
      {:else if live.error}
        live status unavailable
      {:else}
        connecting…
      {/if}
    </span>
  </div>
</header>
