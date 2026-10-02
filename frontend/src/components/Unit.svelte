<script lang="ts">
  import { iconUrl, initials } from "../lib/graph/icons";
  import type { Node } from "../lib/graph/model";
  import type { UnitLive } from "../lib/live/health";
  import type { Rect } from "../lib/router";

  let {
    n,
    b,
    live,
    dim = false,
    active = false,
    onpick,
    onhover,
  }: {
    n: Node;
    b: Rect;
    live?: UnitLive;
    dim?: boolean;
    active?: boolean;
    onpick: (id: string) => void;
    onhover: (id: string | null) => void;
  } = $props();

  const icon = $derived(iconUrl(n.icon));
  const note = $derived(live?.note ?? "");
  const noteW = $derived(note.length * 7.2 + 12);
  // the card is fixed-width; long subtitles are cut here and shown whole in the detail card
  const fit = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events (keyboard handled by the map) -->
<g
  class="unit lvl-{live?.level || 'none'}"
  class:dim
  class:active
  class:flag-warn={n.flag === "warn"}
  transform="translate({b.x},{b.y})"
  role="button"
  tabindex="-1"
  aria-label={n.label}
  onclick={() => onpick(n.id)}
  onpointerenter={() => onhover(n.id)}
  onpointerleave={() => onhover(null)}
>
  <rect class="card" width={b.w} height={b.h} />
  <rect class="sbar" width="5" height={b.h} />
  {#if icon}
    <image href={icon} x="16" y={b.h / 2 - 18} width="36" height="36" />
  {:else}
    <rect class="mono" x="16" y={b.h / 2 - 18} width="36" height="36" />
    <text class="mono-t" x="34" y={b.h / 2 + 6}>{initials(n.label)}</text>
  {/if}
  <text class="label" x="66" y={n.sub ? 34 : 46}>{fit(n.label, 18)}</text>
  {#if n.sub}<text class="sub" x="66" y="56">{fit(n.sub, 23)}</text>{/if}
  {#if live && live.crit > 0}
    <g class="badge cve"
      ><rect x={b.w - 70} y={b.h - 10} width="60" height="18" /><text x={b.w - 40} y={b.h + 3}
        >{live.crit} CVE</text
      ></g
    >
  {/if}
  {#if note}
    {@const x = b.w - 10 - noteW - (live && live.crit > 0 ? 66 : 0)}
    <g class="badge note"
      ><rect {x} y={b.h - 10} width={noteW} height="18" /><text x={x + noteW / 2} y={b.h + 3}>{note}</text></g
    >
  {/if}
</g>

<style>
  .unit {
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .unit.dim {
    opacity: 0.22;
  }
  .card {
    fill: #202327;
    stroke: #45484e;
  }
  .unit:hover .card,
  .unit.active .card {
    stroke: var(--color-signal);
    stroke-width: 2;
  }
  .flag-warn .card {
    stroke-dasharray: 6 4;
  }
  .sbar {
    fill: #45484e;
  }
  .lvl-ok .sbar {
    fill: var(--color-ok);
  }
  .lvl-warn .sbar {
    fill: var(--color-signal);
  }
  .lvl-off .sbar {
    fill: #5b5e64;
  }
  .lvl-bad .sbar {
    fill: var(--color-danger);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  .mono {
    fill: #2c2f34;
    stroke: #45484e;
  }
  .mono-t {
    fill: var(--color-muted);
    font: 600 15px var(--font-display);
    text-anchor: middle;
  }
  .label {
    fill: var(--color-ink);
    font: 600 20px var(--font-display);
    letter-spacing: 0.02em;
  }
  .sub {
    fill: var(--color-muted);
    font: 13px var(--font-mono);
  }
  .badge text {
    font: 11px var(--font-mono);
    text-anchor: middle;
  }
  .cve rect {
    fill: var(--color-danger);
  }
  .cve text {
    fill: #131416;
  }
  .note rect {
    fill: #2c2f34;
    stroke: #55585e;
  }
  .note text {
    fill: var(--color-ink);
  }
</style>
