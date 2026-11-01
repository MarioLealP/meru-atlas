<script lang="ts" module>
  import type { Pill } from "../lib/view/catalogue";

  /** Login pill → Endfield badge: SSO is "ok", public is "warn", nothing in front is "crit". */
  export const PILL: Record<Pill["kind"], string> = {
    sso: "ef-badge ef-badge--ok mr-1",
    pub: "ef-badge ef-badge--warn mr-1",
    none: "ef-badge ef-badge--crit mr-1",
    note: "ef-tag mr-1",
  };
</script>

<script lang="ts">
  import type { Level, UnitLive } from "../lib/live/health";
  import type { Row } from "../lib/view/catalogue";

  let { r, live, onshow }: { r: Row; live?: UnitLive; onshow: (id: string) => void } = $props();

  const LONG = 4; // longer lists (Caddy sits on ~25 networks) fold so one row can't eat the screen
  const DOT: Record<Level, string> = {
    "": "bg-line-2",
    ok: "bg-ok",
    warn: "bg-warn",
    bad: "bg-crit",
    off: "bg-ink-4",
  };
  // phone: each cell is a labelled line of a card (the label is ef-label, as utilities, since
  // variants like before: only apply to Tailwind utilities); desktop: an ef-table cell
  const cell = [
    "grid grid-cols-[5.5rem_1fr] gap-2 border-0 px-2 py-0.5 text-sm",
    "before:font-mono before:text-[11px] before:tracking-[0.14em] before:text-ink-3 before:uppercase",
    "before:content-[attr(data-k)]",
    "lg:table-cell lg:border-b lg:px-3 lg:py-2 lg:align-top lg:before:content-none",
  ];
</script>

{#snippet list(items: string[], noun: string)}
  {#if items.length > LONG}
    <details>
      <summary class="cursor-pointer text-ink-3">{items.length} {noun}</summary>
      {items.join(", ")}
    </details>
  {:else}
    {items.join(", ") || "—"}
  {/if}
{/snippet}

<!-- phone: an ef-card; desktop: a plain table row (card frame removed) -->
<tr
  class={[
    "ef-card mb-2 block p-2",
    "lg:table-row lg:border-0 lg:bg-transparent lg:p-0 lg:[clip-path:none] lg:hover:bg-surface-2",
  ]}
>
  <td class="block border-0 px-2 pb-1 lg:table-cell lg:border-b lg:px-3 lg:py-2 lg:align-top">
    <button
      class="flex items-center gap-2 text-left hover:text-accent"
      onclick={() => onshow(r.id)}
      title="Show on the map"
    >
      <span class={["size-2 flex-none rotate-45", DOT[live?.level ?? ""]]}></span>
      <span class="font-display text-lg font-semibold">{r.label}</span>
    </button>
    <span class="ef-label block pl-4 normal-case">{r.sub}</span>
  </td>
  <td class={[cell, "font-mono text-xs"]} data-k="Version">{r.version || "—"}</td>
  <td class={cell} data-k="Does">{r.does}</td>
  <td class={[cell, "font-mono text-xs"]} data-k="Reach">{r.reach.join(" · ") || "internal"}</td>
  <td class={cell} data-k="Login">
    <span>
      {#each r.logins as p (p.label)}<span class={PILL[p.kind]}>{p.label}</span>{:else}—{/each}
    </span>
  </td>
  <td class={[cell, "font-mono text-xs"]} data-k="Networks">{@render list(r.networks, "networks")}</td>
  <td class={cell} data-k="Talks to">{@render list(r.talks, "peers")}</td>
</tr>
