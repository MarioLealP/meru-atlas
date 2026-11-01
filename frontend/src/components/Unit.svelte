<script lang="ts">
  import { iconUrl, initials } from "../lib/graph/icons";
  import type { Node } from "../lib/graph/model";
  import type { Level, UnitLive } from "../lib/live/health";
  import type { Rect } from "../lib/router";

  let {
    n,
    b,
    live,
    tag,
    dim = false,
    active = false,
    onpick,
    onhover,
  }: {
    n: Node;
    b: Rect;
    live?: UnitLive;
    tag?: string; // a lens's word on this unit (e.g. why it's exposed); replaces the live note
    dim?: boolean;
    active?: boolean;
    onpick: (id: string) => void;
    onhover: (id: string | null) => void;
  } = $props();

  const BAR: Record<Level, string> = {
    "": "fill-line-2",
    ok: "fill-ok",
    warn: "fill-warn",
    bad: "fill-crit animate-alarm motion-reduce:animate-none",
    off: "fill-ink-4",
  };
  const icon = $derived(iconUrl(n.icon));
  const note = $derived(tag ?? live?.note ?? "");
  const noteW = $derived(note.length * 7.2 + 12);
  const cve = $derived(live && live.crit > 0 ? live.crit : 0);
  // the card is fixed-width; long text is cut here and shown whole in the detail card
  const fit = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events (keyboard handled by the map) -->
<g
  class={["group cursor-pointer transition-opacity", dim && "opacity-20"]}
  transform="translate({b.x},{b.y})"
  role="button"
  tabindex="-1"
  aria-label={n.label}
  onclick={() => onpick(n.id)}
  onpointerenter={() => onhover(n.id)}
  onpointerleave={() => onhover(null)}
>
  <rect
    class={[
      "fill-surface-2 group-hover:stroke-accent group-hover:stroke-2",
      active ? "stroke-accent stroke-2" : "stroke-line-2",
    ]}
    stroke-dasharray={n.flag === "warn" ? "6 4" : undefined}
    width={b.w}
    height={b.h}
  />
  <rect class={BAR[live?.level ?? ""]} width="4" height={b.h} />
  {#if icon}
    <image href={icon} x="16" y={b.h / 2 - 18} width="36" height="36" />
  {:else}
    <rect class="fill-well stroke-line" x="16" y={b.h / 2 - 18} width="36" height="36" />
    <text
      class="fill-ink-3 font-display text-[15px] font-semibold [text-anchor:middle]"
      x="34"
      y={b.h / 2 + 6}
    >
      {initials(n.label)}
    </text>
  {/if}
  <text class="fill-ink font-display text-[20px] font-semibold" x="66" y={n.sub ? 34 : 46}>
    {fit(n.label, 18)}
  </text>
  {#if n.sub}<text class="fill-ink-3 font-mono text-[12px]" x="66" y="56">{fit(n.sub, 24)}</text>{/if}
  {#if cve}
    <rect class="fill-crit" x={b.w - 70} y={b.h - 10} width="60" height="18" />
    <text class="fill-ground font-mono text-[11px] font-bold [text-anchor:middle]" x={b.w - 40} y={b.h + 3}>
      {cve} CVE
    </text>
  {/if}
  {#if note}
    {@const x = b.w - 10 - noteW - (cve ? 66 : 0)}
    <rect class="fill-well stroke-line-2" {x} y={b.h - 10} width={noteW} height="18" />
    <text class="fill-ink font-mono text-[11px] [text-anchor:middle]" x={x + noteW / 2} y={b.h + 3}>
      {note}
    </text>
  {/if}
</g>
