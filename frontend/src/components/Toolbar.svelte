<script lang="ts">
  import type { Model } from "../lib/graph/model";
  import { ago, isStale } from "../lib/live/health";
  import { live } from "../lib/live/poll.svelte";
  import { KINDS, ui } from "../lib/state.svelte";
  import { KIND_COLOR } from "../lib/view/kinds";

  let { model, onpick, onfit }: { model: Model; onpick: (id: string) => void; onfit: () => void } = $props();

  let q = $state("");
  let layersOpen = $state(false); // narrow screens: layer chips live in a dropdown
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
</script>

<header class="bar">
  <div class="brand">CLOCKMOST <span>ATLAS</span></div>

  <div class="search">
    <input
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
      <ul>
        {#each hits as h (h.id)}<li>
            <button onclick={() => choose(h.id)}>{h.label}<i>{h.sub ?? ""}</i></button>
          </li>{/each}
      </ul>
    {/if}
  </div>

  <button class="lines-btn" class:on={layersOpen} onclick={() => (layersOpen = !layersOpen)}>Lines</button>
  <div class="layers" class:open={layersOpen}>
    {#each KINDS as [k, label] (k)}
      <button
        class:off={!ui.layers[k]}
        onclick={() => (ui.layers[k] = !ui.layers[k])}
        title="Show {label} lines"
      >
        <svg width="18" height="6"
          ><line x1="0" y1="3" x2="18" y2="3" stroke={KIND_COLOR[k]} stroke-width="3" /></svg
        >{label}
      </button>
    {/each}
    <button class="all" class:on={ui.allLines} onclick={() => ui.setAllLines(!ui.allLines)}>All lines</button>
    <button onclick={onfit} title="Fit the map">Fit</button>
  </div>

  <div class="live" class:stale={!live.data || isStale(live.data)} class:err={!!live.error}>
    {#if live.data}
      <b>●</b> live · {ago(live.data.generated)} ago{#if bad}
        · <em>{bad} high</em>{/if}
    {:else if live.error}
      live status unavailable
    {:else}
      live status: connecting…
    {/if}
  </div>
</header>

<style>
  .bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 10px 16px;
    background: linear-gradient(var(--color-bg) 70%, transparent);
    z-index: 2;
    flex-wrap: wrap;
  }
  .brand {
    font: 700 28px var(--font-display);
    letter-spacing: 0.1em;
  }
  .brand span {
    color: var(--color-signal);
  }
  .search {
    position: relative;
    flex: 0 1 340px;
  }
  input {
    width: 100%;
    background: var(--color-panel);
    border: 1px solid var(--color-line);
    padding: 7px 12px;
    font-size: 15px;
  }
  input:focus {
    outline: none;
    border-color: var(--color-signal);
  }
  ul {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-panel);
    border: 1px solid var(--color-line);
    z-index: 3;
  }
  li button {
    width: 100%;
    text-align: left;
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  li button:hover {
    background: #26292d;
    color: var(--color-signal);
  }
  i {
    color: var(--color-muted);
    font: 12px var(--font-mono);
  }
  .layers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .layers button {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--color-line);
    padding: 3px 9px;
    font: 600 14px var(--font-display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .layers button.off {
    opacity: 0.35;
  }
  .layers button.on,
  .layers button:hover {
    border-color: var(--color-signal);
  }
  .live {
    margin-left: auto;
    font: 13px var(--font-mono);
    color: var(--color-muted);
  }
  .live b {
    color: var(--color-ok);
  }
  .live.stale b,
  .live em {
    color: var(--color-danger);
    font-style: normal;
  }
  .lines-btn {
    display: none;
  }

  /* phone / narrow: one row (brand, search, Lines, live dot); chips drop down on demand */
  @media (max-width: 900px) {
    .bar {
      flex-wrap: nowrap;
      gap: 10px;
      padding: 8px 12px;
      height: 56px;
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-line);
    }
    .brand {
      font-size: 20px;
      white-space: nowrap;
    }
    .search {
      flex: 1 1 auto;
      min-width: 0;
    }
    .lines-btn {
      display: block;
      border: 1px solid var(--color-line);
      padding: 6px 10px;
      font: 600 14px var(--font-display);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .lines-btn.on {
      border-color: var(--color-signal);
      color: var(--color-signal);
    }
    .layers {
      display: none;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      padding: 10px 12px;
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-line);
    }
    .layers.open {
      display: flex;
    }
    .layers button {
      padding: 6px 10px;
    }
    .live {
      font-size: 0;
      margin-left: 0;
    }
    .live b {
      font-size: 14px;
    }
  }
</style>
