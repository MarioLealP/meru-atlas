<script lang="ts">
  import type { Model } from "../lib/graph/model";

  let {
    model,
    path,
    notice,
    onstep,
    onclear,
  }: {
    model: Model;
    path: string[] | null;
    notice: string | null;
    onstep: (id: string) => void;
    onclear: () => void;
  } = $props();
</script>

<!-- A traced route as tappable steps (fly to a hop, the trace stays), or a "no path" answer.
     Phone: full width above the safe area; desktop: centred. -->
<div
  class={[
    "ef-panel absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10",
    "flex flex-wrap items-center gap-x-2 gap-y-1 p-3 font-display text-lg font-semibold",
    "lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:max-w-[calc(100vw-2rem)] lg:-translate-x-1/2",
    notice ? "border-crit" : "border-accent",
  ]}
  role="status"
>
  {#if path}
    <span class="ef-label text-accent">Route</span>
    {#each path as id, i (id)}
      {#if i}<span class="text-ink-3">→</span>{/if}
      <button
        class="border-b border-dashed border-line-2 py-1 hover:border-accent hover:text-accent"
        onclick={() => onstep(id)}
      >
        {model.nodes.get(id)?.label ?? id}
      </button>
    {/each}
  {:else}
    {notice}
  {/if}
  <button class="ef-label ml-2 hover:text-ink" onclick={onclear}>clear</button>
</div>
