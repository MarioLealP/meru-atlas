<script lang="ts">
  import { getValidated } from "./lib/api";
  import { Graph } from "./lib/schemas";

  const graph = getValidated("/api/graph", Graph);
</script>

<main class="mx-auto max-w-[2400px] p-6">
  <h1 class="font-display text-5xl font-bold tracking-wide uppercase">
    Clockmost <span class="text-signal">Atlas</span>
  </h1>
  {#await graph}
    <p class="mt-4 font-mono text-muted">loading…</p>
  {:then g}
    <p class="mt-4 font-mono text-muted">{g.nodes.length} units · {g.edges.length} links</p>
  {:catch e}
    <p class="mt-4 font-mono text-danger">{e.message}</p>
  {/await}
</main>
