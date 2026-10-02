<script lang="ts">
  import type { Edge } from "../lib/graph/model";
  import { KIND_DASH, KIND_STROKE } from "../lib/view/kinds";

  let {
    edges,
    paths,
    strong = false,
    flow = false,
  }: { edges: Edge[]; paths: Map<number, string>; strong?: boolean; flow?: boolean } = $props();
</script>

<!-- a halo under each line keeps crossings readable; a traced route gets a signal pulse
     running source → target (routed paths always start at `from`) -->
<g class="pointer-events-none fill-none" stroke-linejoin="round">
  {#each edges as e (e.i)}
    {@const d = paths.get(e.i)}
    {#if d}
      <path class="stroke-ground opacity-85" stroke-width="6" {d} />
      <path
        class={KIND_STROKE[e.kind]}
        stroke-width={strong ? 3.2 : 2.4}
        stroke-dasharray={KIND_DASH[e.kind]}
        {d}
      />
      {#if flow}
        <path
          class="stroke-accent animate-flow motion-reduce:animate-none"
          stroke-width="3.6"
          stroke-dasharray="6 26"
          {d}
        />
      {/if}
    {/if}
  {/each}
</g>
