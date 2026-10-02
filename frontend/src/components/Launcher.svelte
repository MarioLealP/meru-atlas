<script lang="ts">
  import { onMount } from "svelte";
  import type { Model } from "../lib/graph/model";
  import { entries, rank, type Entry } from "../lib/view/launcher";

  let { model, onshow, onclose }: { model: Model; onshow: (unit: string) => void; onclose: () => void } =
    $props();

  const all = $derived(entries(model));
  let q = $state("");
  let cur = $state(0);
  let input: HTMLInputElement;
  const hits = $derived(rank(all, q));
  $effect(() => {
    void q;
    cur = 0; // a new query starts at the top
  });
  onMount(() => input.focus());

  /** Enter: open the link (new tab), or show a link-less unit; Shift+Enter: show on the map. */
  function choose(e: Entry | undefined, onMap: boolean) {
    if (!e) return;
    if (e.url && !onMap) window.open(e.url, "_blank", "noopener,noreferrer");
    else onshow(e.unit);
    onclose();
  }
  function onkey(ev: KeyboardEvent) {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      const d = ev.key === "ArrowDown" ? 1 : -1;
      cur = (cur + d + hits.length) % Math.max(1, hits.length);
    } else if (ev.key === "Enter") choose(hits[cur], ev.shiftKey);
    else if (ev.key === "Escape") onclose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-30 bg-ground/70 backdrop-blur-sm" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class={[
      "ef-panel absolute inset-x-0 top-0 p-3",
      "lg:inset-x-auto lg:top-24 lg:left-1/2 lg:w-[38rem] lg:-translate-x-1/2 lg:p-4",
    ]}
    role="dialog"
    aria-label="Launcher"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
  >
    <input
      class="ef-input w-full text-base"
      bind:this={input}
      bind:value={q}
      onkeydown={onkey}
      placeholder="Open… (Enter opens, Shift+Enter shows on the map)"
      aria-label="Search units and links"
    />
    <ul class="mt-2 max-h-[60vh] overflow-y-auto">
      {#each hits as e, i (e.unit + e.title)}
        <li>
          <button
            class={[
              "flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left",
              i === cur ? "rail bg-surface-2 text-accent" : "hover:bg-surface-2",
            ]}
            onmouseenter={() => (cur = i)}
            onclick={(ev) => choose(e, ev.shiftKey)}
          >
            <span class="font-display text-lg font-semibold">{e.title}</span>
            <span class="ef-label truncate normal-case">{e.url ? e.hint : `map · ${e.hint}`}</span>
          </button>
        </li>
      {:else}
        <li class="px-3 py-2 text-ink-3">Nothing matches.</li>
      {/each}
    </ul>
  </div>
</div>
