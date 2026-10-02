<script lang="ts">
  import { onMount } from "svelte";
  import type { Model } from "../lib/graph/model";
  import type { Layout } from "../lib/layout/columns";
  import type { UnitLive } from "../lib/live/health";
  import { ui } from "../lib/state.svelte";
  import { panzoom, TOP_BAR, type View } from "../lib/view/panzoom";
  import { visible } from "../lib/view/visible";
  import Lines from "./Lines.svelte";
  import Unit from "./Unit.svelte";
  import ZoneBox from "./ZoneBox.svelte";

  let {
    model,
    layout,
    paths,
    liveBy,
    onpick,
    api = $bindable(),
  }: {
    model: Model;
    layout: Layout;
    paths: Map<number, string>;
    liveBy: Map<string, UnitLive>;
    onpick: (id: string | null) => void;
    api?: ReturnType<typeof panzoom>;
  } = $props();

  let svg: SVGSVGElement;
  let view = $state<View>({ x: 0, y: 0, k: 1 });
  const vis = $derived(
    visible(model, {
      selected: ui.selected,
      hover: ui.hover,
      trace: ui.trace,
      allLines: ui.allLines,
      layers: ui.layers,
    }),
  );

  onMount(() => {
    api = panzoom(svg, (v) => (view = v));
    api.fit({ x: 0, y: 0, w: layout.width, h: layout.height }, TOP_BAR);
    return () => api?.destroy();
  });

  const pick = (id: string) => !api?.wasDrag() && onpick(id);
  const background = (e: MouseEvent) => e.target === svg && !api?.wasDrag() && onpick(null);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<svg bind:this={svg} class="map" role="application" aria-label="Clockmost lab map" onclick={background}>
  <g transform="translate({view.x},{view.y}) scale({view.k})">
    {#each layout.zones as z (z.id)}<ZoneBox {z} />{/each}
    <Lines edges={vis.edges} {paths} strong={vis.strong} flow={!!ui.trace} />
    {#each [...layout.nodes] as [id, b] (id)}
      <Unit
        n={model.nodes.get(id)!}
        {b}
        live={liveBy.get(id)}
        dim={!!vis.lit && !vis.lit.has(id)}
        active={ui.selected === id || ui.traceFrom === id}
        onpick={pick}
        onhover={(h) => (ui.hover = h)}
      />
    {/each}
  </g>
</svg>

<style>
  .map {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
    cursor: grab;
  }
  :global(.map.dragging) {
    cursor: grabbing;
  }
</style>
