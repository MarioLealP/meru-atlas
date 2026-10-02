<script lang="ts">
  import type { Edge } from "../lib/graph/model";
  import { KIND_COLOR, KIND_DASH } from "../lib/view/kinds";

  let {
    edges,
    paths,
    strong = false,
    flow = false,
  }: { edges: Edge[]; paths: Map<number, string>; strong?: boolean; flow?: boolean } = $props();
</script>

<g class="lines" class:strong>
  {#each edges as e (e.i)}
    {@const d = paths.get(e.i)}
    {#if d}
      <path class="halo" {d} />
      <path {d} stroke={KIND_COLOR[e.kind]} stroke-dasharray={KIND_DASH[e.kind]} />
      {#if flow}<path class="pulse" {d} />{/if}
    {/if}
  {/each}
</g>

<style>
  path {
    fill: none;
    stroke-width: 2.4;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .halo {
    stroke: var(--color-bg);
    stroke-width: 6;
    opacity: 0.85;
  }
  /* a traced route: signal pulses running from source to target (paths start at `from`) */
  .pulse {
    stroke: var(--color-signal);
    stroke-width: 3.6;
    stroke-dasharray: 6 26;
    animation: flow 0.9s linear infinite;
  }
  @keyframes flow {
    to {
      stroke-dashoffset: -32;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
    }
  }
  .strong path:not(.halo, .pulse) {
    stroke-width: 3.2;
  }
</style>
