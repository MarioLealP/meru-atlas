<script lang="ts">
  import type { Net } from "../lib/view/networks";

  let {
    nets,
    current,
    onpick,
    onclose,
  }: { nets: Net[]; current: string | null; onpick: (name: string) => void; onclose: () => void } = $props();
  const flag = $derived(nets.find((n) => n.name === current)?.flag);
</script>

<!-- The networks lens: each shared Docker network as a chip (flagged ones first, in red);
     the chosen one's members are lit on the map. -->
<div
  class={[
    "ef-panel absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 border-accent p-3",
    "lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:max-w-[min(64rem,calc(100vw-2rem))] lg:-translate-x-1/2",
  ]}
  role="status"
>
  <div class="mb-2 flex items-baseline gap-3">
    <span class="ef-label text-accent">Networks</span>
    <span class="text-sm text-ink-2">shared Docker networks (each app's own link to Caddy left out)</span>
    <button class="ef-label ml-auto hover:text-ink" onclick={onclose}>close</button>
  </div>
  <div class="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-wrap">
    {#each nets as n (n.name)}
      <button
        class={[
          "ef-pill flex-none normal-case",
          n.flag && "border-crit text-crit",
          n.name === current && "bg-surface-2 text-accent",
        ]}
        aria-pressed={n.name === current}
        onclick={() => onpick(n.name)}>{n.name} · {n.units.length}</button
      >
    {/each}
  </div>
  {#if flag}<p class="mt-2 text-sm text-crit">⚠ {flag}</p>{/if}
</div>
