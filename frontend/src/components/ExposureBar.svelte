<script lang="ts">
  import type { Model } from "../lib/graph/model";
  import type { Exposure } from "../lib/view/exposure";

  let {
    model,
    x,
    onstep,
    onclose,
  }: { model: Model; x: Exposure; onstep: (id: string) => void; onclose: () => void } = $props();
</script>

<!-- The exposure lens's answer: what the internet can reach, each one tappable (fly to it). -->
<div
  class={[
    "ef-panel absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 border-crit p-3",
    "lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:max-w-[calc(100vw-2rem)] lg:-translate-x-1/2",
  ]}
  role="status"
>
  <div class="mb-1 flex items-baseline gap-3">
    <span class="ef-label text-crit">Exposure</span>
    <span class="text-sm text-ink-2">{x.targets.length} units reachable from the internet</span>
    <button class="ef-label ml-auto hover:text-ink" onclick={onclose}>close</button>
  </div>
  <div class="flex flex-wrap gap-x-4 gap-y-1">
    {#each x.targets as id (id)}
      <button class="text-left hover:text-accent" onclick={() => onstep(id)}>
        <span class="font-display font-semibold">{model.nodes.get(id)?.label}</span>
        <span class="ef-label normal-case">{x.why.get(id)}</span>
      </button>
    {/each}
  </div>
</div>
