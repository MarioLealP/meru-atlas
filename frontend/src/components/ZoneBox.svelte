<script lang="ts">
  import { GEO, type ZoneBox } from "../lib/layout/columns";

  let { z }: { z: ZoneBox } = $props();
  const bandH = GEO.band - GEO.grid;
</script>

<g>
  <rect class="fill-surface stroke-line" x={z.x} y={z.y} width={z.w} height={z.h} />
  <rect class="fill-surface-2 stroke-line-2" x={z.x} y={z.y} width={z.w} height={bandH} />
  <rect class="fill-accent" x={z.x} y={z.y} width="4" height={bandH} />
  <text class="fill-ink font-display text-[20px] font-semibold tracking-[0.08em]" x={z.x + 18} y={z.y + 27}>
    {z.title.toUpperCase()}
  </text>
</g>
