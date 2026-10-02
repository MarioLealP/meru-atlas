<script lang="ts">
  import { iconUrl, initials } from "../lib/graph/icons";
  import type { Model, Node } from "../lib/graph/model";
  import type { UnitLive } from "../lib/live/health";
  import type { Link } from "../lib/schemas";
  import { catalogue, filterRows } from "../lib/view/catalogue";
  import CatalogueRow from "./CatalogueRow.svelte";

  let {
    model,
    liveBy,
    onshow,
  }: { model: Model; liveBy: Map<string, UnitLive>; onshow: (id: string) => void } = $props();

  const COLUMNS = ["Unit", "Version", "Does", "Reach", "Login", "Networks", "Talks to"];
  const rows = $derived(catalogue(model));
  const zones = $derived(model.g.zones.filter((z) => rows.some((r) => r.zone === z.id)));
  let zone = $state("all");
  let q = $state("");
  const shown = $derived(filterRows(rows, zone, q));

  // quick-link directory: every link of every unit, one tile each
  function tile(n: Node, l: Link, many: boolean) {
    return { n, l, title: many ? `${n.label} · ${l.title}` : n.label };
  }
  const links = $derived(
    [...model.nodes.values()].flatMap((n) => (n.links ?? []).map((l) => tile(n, l, n.links!.length > 1))),
  );
  const where = (url: string) => {
    const u = new URL(url);
    return u.host + (u.pathname.length > 1 ? u.pathname : "");
  };
</script>

<div class="page">
  <section>
    <h2><span class="no">01</span>Unit catalogue</h2>
    <p class="lede">
      Generated from the infra repo on every push: every service, what it's for, how you reach it, how it logs
      you in, its networks and what it talks to.
    </p>
    <div class="tools">
      <div class="filters" role="group" aria-label="Filter by zone">
        <button aria-pressed={zone === "all"} onclick={() => (zone = "all")}>All</button>
        {#each zones as z (z.id)}
          <button aria-pressed={zone === z.id} onclick={() => (zone = z.id)}>{z.title}</button>
        {/each}
      </div>
      <input type="search" bind:value={q} placeholder="search units, hosts, logins…" aria-label="Search" />
    </div>
    <div class="legend">
      <span><span class="pill sso">SSO</span> Authentik login</span>
      <span><span class="pill pub">public</span> via Cloudflare tunnel</span>
      <span><span class="pill none">no SSO</span> nothing in front</span>
    </div>
    <table>
      <thead>
        <tr>
          {#each COLUMNS as c (c)}<th>{c}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each shown as r (r.id)}
          <CatalogueRow {r} live={liveBy.get(r.id)} {onshow} />
        {:else}
          <tr><td colspan="7" class="empty">No units match.</td></tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section>
    <h2><span class="no">02</span>Quick links</h2>
    <div class="dir">
      {#each links as { n, l, title } (l.url + title)}
        {@const icon = iconUrl(n.icon)}
        <a href={l.url} target="_blank" rel="noopener noreferrer">
          {#if icon}<img alt="" src={icon} />{:else}<span class="pb">{initials(n.label)}</span>{/if}
          <span><b>{title}</b><i>{where(l.url)}</i></span>
        </a>
      {/each}
    </div>
  </section>
</div>

<style>
  .page {
    position: absolute;
    inset: 56px 0 0;
    background: var(--color-bg); /* covers the map, which stays mounted underneath */
    overflow-y: auto;
    padding: 16px 24px 48px;
  }
  section {
    max-width: 1800px;
    margin: 0 auto 40px;
  }
  h2 {
    font: 700 30px var(--font-display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 2px solid var(--color-ink);
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .no {
    color: var(--color-signal);
    margin-right: 12px;
    font-size: 18px;
    vertical-align: middle;
  }
  .lede {
    color: var(--color-muted);
    max-width: 80ch;
    margin-bottom: 12px;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .filters button {
    border: 1px solid var(--color-line);
    padding: 4px 10px;
    font: 600 14px var(--font-display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .filters button[aria-pressed="true"] {
    background: var(--color-signal);
    border-color: var(--color-signal);
    color: var(--color-bg);
  }
  input {
    flex: 1 1 240px;
    max-width: 380px;
    background: var(--color-panel);
    border: 1px solid var(--color-line);
    padding: 5px 10px;
  }
  input:focus {
    outline: none;
    border-color: var(--color-signal);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    color: var(--color-muted);
    font-size: 13px;
    margin-bottom: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font: 600 13px var(--font-display);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-muted);
    border-bottom: 1px solid var(--color-line);
    padding: 6px 10px;
  }
  .empty {
    padding: 20px 10px;
    color: var(--color-muted);
  }
  .dir {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
  }
  .dir a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--color-panel);
    border: 1px solid var(--color-line);
    border-left: 3px solid var(--color-line);
  }
  .dir a:hover {
    border-left-color: var(--color-signal);
  }
  .dir img,
  .pb {
    width: 28px;
    height: 28px;
    flex: none;
  }
  .pb {
    display: grid;
    place-items: center;
    background: #2c2f34;
    font: 600 12px var(--font-display);
    color: var(--color-muted);
  }
  .dir b {
    display: block;
    font: 600 17px var(--font-display);
  }
  .dir i {
    display: block;
    font: 12px var(--font-mono);
    font-style: normal;
    color: var(--color-muted);
  }
  /* pills are shared with the rows */
  :global(.pill) {
    display: inline-block;
    padding: 1px 7px;
    margin: 1px 4px 1px 0;
    font: 12px var(--font-mono);
    border: 1px solid var(--color-line);
  }
  :global(.pill.sso) {
    border-color: var(--color-ok);
    color: var(--color-ok);
  }
  :global(.pill.pub) {
    border-color: var(--color-signal);
    color: var(--color-signal);
  }
  :global(.pill.none) {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }
  :global(.pill.note) {
    color: var(--color-muted);
  }
  @media (max-width: 900px) {
    .page {
      padding: 12px 12px 40px;
    }
    /* zone chips: one swipeable row instead of half a screen of buttons */
    .filters {
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      max-width: 100%; /* else the row's content width stretches the whole page sideways */
    }
    .filters button {
      flex: none;
    }
    .tools {
      flex-direction: column;
    }
    input {
      flex: none;
      max-width: none;
      order: -1; /* search first, chips under it */
    }
    thead {
      display: none;
    }
    table,
    tbody {
      display: block;
    }
  }
</style>
