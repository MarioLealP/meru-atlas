<script lang="ts">
  import { onMount } from "svelte";
  import type { Model } from "../lib/graph/model";
  import type { Layout } from "../lib/layout/columns";
  import type { UnitLive } from "../lib/live/health";
  import { ui } from "../lib/state.svelte";
  import type { Lens } from "../lib/view/exposure";
  import { overview } from "../lib/view/overview";
  import { panzoom, type View } from "../lib/view/panzoom";
  import { visible } from "../lib/view/visible";
  import Lines from "./Lines.svelte";
  import Unit from "./Unit.svelte";
  import ZoneBox from "./ZoneBox.svelte";

  let {
    model,
    layout,
    paths,
    liveBy,
    lens = null,
    onpick,
    api = $bindable(),
  }: {
    model: Model;
    layout: Layout;
    paths: Map<number, string>;
    liveBy: Map<string, UnitLive>;
    lens?: Lens | null;
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
      lens,
      allLines: ui.allLines,
      layers: ui.layers,
    }),
  );

  onMount(() => {
    api = panzoom(svg, (v) => (view = v));
    overview(api, layout);
    return () => api?.destroy();
  });

  const pick = (id: string) => !api?.wasDrag() && onpick(id);
  const background = (e: MouseEvent) => e.target === svg && !api?.wasDrag() && onpick(null);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<!-- panzoom toggles `.dragging` on the svg while a drag is in progress -->
<svg
  bind:this={svg}
  class="absolute inset-0 size-full cursor-grab touch-none select-none [&.dragging]:cursor-grabbing"
  role="application"
  aria-label="Clockmost lab map"
  onclick={background}
>
  <g transform="translate({view.x},{view.y}) scale({view.k})">
    {#each layout.zones as z (z.id)}<ZoneBox {z} />{/each}
    <Lines edges={vis.edges} {paths} strong={vis.strong} flow={!!ui.trace || !!lens} />
    {#each [...layout.nodes] as [id, b] (id)}
      <Unit
        n={model.nodes.get(id)!}
        {b}
        live={liveBy.get(id)}
        tag={lens?.why?.get(id)}
        dim={!!vis.lit && !vis.lit.has(id)}
        active={ui.selected === id || ui.traceFrom === id}
        onpick={pick}
        onhover={(h) => (ui.hover = h)}
      />
    {/each}
  </g>
</svg>
