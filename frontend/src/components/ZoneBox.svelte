<script lang="ts">
  import { GEO, type ZoneBox } from "../lib/layout/columns";

  let { z }: { z: ZoneBox } = $props();
</script>

<g class="zone">
  <rect class="body" x={z.x} y={z.y} width={z.w} height={z.h} />
  <rect class="band" x={z.x} y={z.y} width={z.w} height={GEO.band - GEO.grid} />
  <rect class="tick" x={z.x} y={z.y} width="6" height={GEO.band - GEO.grid} />
  <text x={z.x + 18} y={z.y + 28}>{z.title.toUpperCase()}</text>
</g>

<style>
  .body {
    fill: var(--color-panel);
    stroke: var(--color-line);
  }
  .band {
    fill: var(--color-ink);
    opacity: 0.92;
  }
  .tick {
    fill: var(--color-signal);
  }
  text {
    fill: var(--color-bg);
    font: 700 21px var(--font-display);
    letter-spacing: 0.08em;
  }
</style>
