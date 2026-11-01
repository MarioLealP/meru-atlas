<script lang="ts">
  import { iconUrl, initials } from "../lib/graph/icons";
  import type { Model, Node } from "../lib/graph/model";
  import type { UnitLive } from "../lib/live/health";
  import type { Link } from "../lib/schemas";
  import { catalogue, filterRows } from "../lib/view/catalogue";
  import CatalogueRow, { PILL } from "./CatalogueRow.svelte";

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

<!-- covers the map, which stays mounted underneath so pan/zoom survive a trip here -->
<div class="absolute inset-x-0 top-14 bottom-0 overflow-y-auto bg-ground px-3 pt-4 pb-12 lg:px-6">
  <section class="mx-auto mb-10 max-w-[1800px]">
    <h2 class="ef-sec-head mb-3 font-display text-2xl font-bold uppercase lg:text-3xl">
      <span class="ef-idx">01</span>Unit catalogue
    </h2>
    <p class="mb-3 max-w-[80ch] text-ink-2">
      Generated from the infra repo on every push: every service, what it's for, how you reach it, how it logs
      you in, its networks and what it talks to.
    </p>

    <!-- phone: search on top, zone chips in one swipeable row; desktop: one wrapping row -->
    <div class="mb-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
      <input
        class="ef-input lg:order-last lg:w-80"
        type="search"
        bind:value={q}
        placeholder="search units, hosts, logins…"
        aria-label="Search"
      />
      <div
        class="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-wrap"
        role="group"
        aria-label="Filter by zone"
      >
        {#each [{ id: "all", title: "All" }, ...zones] as z (z.id)}
          <button
            class={["ef-pill flex-none", zone === z.id && "border-accent bg-accent text-on-accent"]}
            aria-pressed={zone === z.id}
            onclick={() => (zone = z.id)}>{z.title}</button
          >
        {/each}
      </div>
    </div>

    <div class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
      <span><span class={PILL.sso}>SSO</span> Authentik login</span>
      <span><span class={PILL.pub}>public</span> via Cloudflare tunnel</span>
      <span><span class={PILL.none}>no SSO</span> nothing in front</span>
    </div>

    <!-- ef-table styles the desktop table; on a phone the rows/cells are blocks (CatalogueRow) -->
    <table class="ef-table block lg:table">
      <thead class="hidden lg:table-header-group">
        <tr>
          {#each COLUMNS as c (c)}<th>{c}</th>{/each}
        </tr>
      </thead>
      <tbody class="block lg:table-row-group">
        {#each shown as r (r.id)}
          <CatalogueRow {r} live={liveBy.get(r.id)} {onshow} />
        {:else}
          <tr><td colspan="7" class="py-5 text-ink-3">No units match.</td></tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section class="mx-auto max-w-[1800px]">
    <h2 class="ef-sec-head mb-3 font-display text-2xl font-bold uppercase lg:text-3xl">
      <span class="ef-idx">02</span>Quick links
    </h2>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]">
      {#each links as { n, l, title } (l.url + title)}
        {@const icon = iconUrl(n.icon)}
        <a
          class="ef-card flex items-center gap-3 p-3 hover:border-accent"
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {#if icon}
            <img class="size-7 flex-none" alt="" src={icon} />
          {:else}
            <span class="grid size-7 flex-none place-items-center bg-well font-display text-xs text-ink-3">
              {initials(n.label)}
            </span>
          {/if}
          <span class="min-w-0">
            <b class="block truncate font-display text-lg font-semibold">{title}</b>
            <span class="ef-label block truncate normal-case">{where(l.url)}</span>
          </span>
        </a>
      {/each}
    </div>
  </section>
</div>
