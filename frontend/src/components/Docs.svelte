<script lang="ts">
  import DocPage from "./DocPage.svelte";
  import { attention, search, type DocIndex } from "../lib/docs/pages";

  let {
    index,
    current,
    error,
    onopen,
    onmap,
  }: {
    index: DocIndex | null;
    current: string | null;
    error: string | null;
    onopen: (id: string | null) => void;
    onmap: (node: string) => void;
  } = $props();

  const FILTERS = [
    ["all", "All"],
    ["attention", "Needs a look"],
    ["device", "Devices"],
    ["topic", "Topics"],
  ] as const;
  let filter = $state<(typeof FILTERS)[number][0]>("all");
  let q = $state("");
  const pages = $derived(index?.d.pages ?? []);
  const scoped = $derived(
    filter === "all"
      ? pages
      : filter === "attention"
        ? attention(pages)
        : pages.filter((p) => p.kind === filter),
  );
  const shown = $derived(search(scoped, q));
  const needs = $derived(attention(pages).length);
</script>

<!-- covers the map like the catalogue; phone: the list, or the open page with a back button -->
<div class="absolute inset-x-0 top-14 bottom-0 flex bg-ground">
  <nav
    class={[
      "w-full flex-col gap-2 overflow-y-auto border-line p-3 lg:flex lg:w-80 lg:shrink-0 lg:border-r",
      current ? "hidden" : "flex",
    ]}
    aria-label="Docs pages"
  >
    <input
      class="ef-input w-full"
      type="search"
      bind:value={q}
      placeholder="search the docs…"
      aria-label="Search docs"
    />
    <div class="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filter">
      {#each FILTERS as [k, label] (k)}
        <button class="ef-pill shrink-0" aria-pressed={filter === k} onclick={() => (filter = k)}>
          {label}{k === "attention" && needs ? ` · ${needs}` : ""}
        </button>
      {/each}
    </div>
    {#if !index}
      <p class="text-sm text-ink-3">{error ? `No docs yet (${error}).` : "loading the docs…"}</p>
    {/if}
    <ul>
      {#each shown as p (p.id)}
        <li>
          <button
            class={[
              "flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left",
              p.id === current ? "rail bg-surface-2 text-accent" : "hover:bg-surface-2",
            ]}
            onclick={() => onopen(p.id)}
          >
            <span class="font-display font-semibold">{p.title}</span>
            <span class="ef-label shrink-0">{p.status === "active" ? p.kind : p.status}</span>
          </button>
        </li>
      {:else}
        {#if index}<li class="px-2 py-1.5 text-sm text-ink-3">Nothing matches.</li>{/if}
      {/each}
    </ul>
    {#if index?.d.uncovered_nodes.length}
      <p class="ef-label mt-2 normal-case">
        {index.d.uncovered_nodes.length} map units have no page yet.
      </p>
    {/if}
  </nav>

  {#if current && index}
    <div class="min-w-0 flex-1 overflow-y-auto px-3 pt-3 pb-12 lg:px-8">
      <div class="mx-auto max-w-[80ch]">
        <button class="ef-btn ef-btn--ghost mb-2 lg:hidden" onclick={() => onopen(null)}>← all pages</button>
        <h2 class="mb-3 font-display text-2xl font-bold uppercase lg:text-3xl">{index.title(current)}</h2>
        <DocPage {index} id={current} {onopen} {onmap} />
      </div>
    </div>
  {:else}
    <div class="hidden flex-1 items-center justify-center text-ink-3 lg:flex">Pick a page.</div>
  {/if}
</div>
