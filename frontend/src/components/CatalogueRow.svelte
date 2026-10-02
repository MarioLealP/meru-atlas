<script lang="ts">
  import type { UnitLive } from "../lib/live/health";
  import type { Row } from "../lib/view/catalogue";

  let { r, live, onshow }: { r: Row; live?: UnitLive; onshow: (id: string) => void } = $props();
  const LONG = 4; // longer lists (Caddy sits on ~25 networks) fold so one row can't eat the screen
</script>

{#snippet list(items: string[], noun: string)}
  {#if items.length > LONG}
    <details><summary>{items.length} {noun}</summary>{items.join(", ")}</details>
  {:else}
    {items.join(", ") || "—"}
  {/if}
{/snippet}

<tr>
  <td class="name" data-k="Unit">
    <button onclick={() => onshow(r.id)} title="Show on the map">
      <span class="dot lvl-{live?.level || 'none'}"></span>{r.label}
    </button>
    <span class="sub">{r.sub}</span>
  </td>
  <td class="mono" data-k="Version">{r.version || "—"}</td>
  <td data-k="Does">{r.does}</td>
  <td class="mono" data-k="Reach">{r.reach.join(" · ") || "internal"}</td>
  <td data-k="Login">
    {#each r.logins as p (p.label)}<span class="pill {p.kind}">{p.label}</span>{:else}—{/each}
  </td>
  <td class="mono" data-k="Networks">{@render list(r.networks, "networks")}</td>
  <td data-k="Talks to">{@render list(r.talks, "peers")}</td>
</tr>

<style>
  td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-line);
    vertical-align: top;
    font-size: 14px;
  }
  tr:hover td {
    background: #1d1f23;
  }
  .mono {
    font: 12px var(--font-mono);
  }
  .name button {
    display: flex;
    align-items: center;
    gap: 8px;
    font: 600 18px var(--font-display);
    text-align: left;
  }
  .name button:hover {
    color: var(--color-signal);
  }
  .sub {
    display: block;
    padding-left: 16px;
    color: var(--color-muted);
    font: 12px var(--font-mono);
  }
  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    background: #45484e;
  }
  .lvl-ok {
    background: var(--color-ok);
  }
  .lvl-warn {
    background: var(--color-signal);
  }
  .lvl-bad {
    background: var(--color-danger);
  }
  .lvl-off {
    background: #5b5e64;
  }
  summary {
    cursor: pointer;
    color: var(--color-muted);
  }
  /* phone: each row is a card, cells labelled by their column */
  @media (max-width: 900px) {
    tr {
      display: block;
      background: var(--color-panel);
      border: 1px solid var(--color-line);
      border-left: 3px solid var(--color-signal);
      margin-bottom: 10px;
      padding: 8px 4px;
    }
    td {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 8px;
      border: 0;
      padding: 3px 8px;
    }
    td::before {
      content: attr(data-k);
      color: var(--color-muted);
      font: 600 12px var(--font-display);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    td.name {
      display: block;
    }
    td.name::before {
      content: none;
    }
  }
</style>
