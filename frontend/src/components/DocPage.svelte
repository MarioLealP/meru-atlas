<script lang="ts">
  import DocPage from "./DocPage.svelte";
  import { ageDays, isStale, REL, STALE_DAYS, type DocIndex } from "../lib/docs/pages";

  let {
    index,
    id,
    depth = 0,
    onopen,
    onmap,
  }: {
    index: DocIndex;
    id: string;
    depth?: number; // folded-in pages render one level deep, so an embed loop can't recurse forever
    onopen: (id: string) => void;
    onmap?: (node: string) => void;
  } = $props();

  const p = $derived(index.byId.get(id));
  const STATUS: Record<string, string> = { active: "ef-badge--ok", temporary: "ef-badge--warn" };
  // rendered markdown comes pre-built from atlas_gen (raw HTML escaped); styled from the outside
  const PROSE = [
    "text-sm leading-relaxed text-ink-2",
    "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
    "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-ink",
    "[&_code]:bg-well [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:break-words",
    "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:bg-well [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
    "[&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-line [&_td]:px-2",
    "[&_th]:border [&_th]:border-line [&_th]:px-2 [&_th]:text-left [&_h3]:mt-3 [&_h3]:font-semibold",
  ];

  /** Page links (#doc/<id>) open in place; web links open in a new tab, never in the atlas. */
  function onclick(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    if (href.startsWith("#doc/")) onopen(href.slice(5));
    else if (/^https?:\/\//.test(href)) window.open(href, "_blank", "noopener,noreferrer");
  }
  const groups = (list: { kind: keyof typeof REL; id: string }[], side: 0 | 1) => {
    const out = new Map<string, string[]>();
    for (const r of list) out.set(REL[r.kind][side], [...(out.get(REL[r.kind][side]) ?? []), r.id]);
    return [...out];
  };
  // embeds and children are shown folded in: don't list them again as plain relations
  const folded = $derived(new Set(p ? [...p.children] : []));
  // [[links]] already sit in the text: the header lists only the declared relations
  const out = $derived(
    p
      ? groups(
          p.relations
            .filter((r) => r.kind !== "mentions" && r.kind !== "embeds")
            .map((r) => ({ kind: r.kind, id: r.to })),
          0,
        )
      : [],
  );
  const back = $derived(
    p
      ? groups(
          p.backrefs
            .filter((b) => !folded.has(b.from) && b.kind !== "embeds")
            .map((b) => ({ kind: b.kind, id: b.from })),
          1,
        )
      : [],
  );
</script>

{#if !p}
  <p class="text-sm text-crit">No page `{id}`.</p>
{:else}
  <!-- link clicks bubble up from the rendered HTML; the links themselves are keyboard-reachable -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <article class="flex flex-col gap-3" {onclick}>
    {#if depth === 0}
      <div class="flex flex-wrap items-center gap-1">
        <span class="ef-tag">{p.kind}</span>
        <span class={["ef-badge", STATUS[p.status] ?? "ef-badge--crit"]}>{p.status}</span>
        {#if p.installed_by}<span class="ef-tag">{p.installed_by}</span>{/if}
        <span class={["ef-tag", isStale(p) && "text-warn"]} title="last checked against the real machine">
          verified {p.verified}{isStale(p) ? ` · over ${STALE_DAYS} days (${ageDays(p)})` : ""}
        </span>
        {#if p.node && onmap}
          <button class="ef-tag hover:border-accent hover:text-accent" onclick={() => onmap(p.node!)}>
            show on map →
          </button>
        {/if}
      </div>
      {#if out.length}
        <div class="flex flex-col gap-1">
          {#each out as [label, ids] (label)}
            <div class="flex flex-wrap items-baseline gap-1">
              <span class="ef-label w-36 shrink-0 whitespace-nowrap">{label}</span>
              {#each ids as r (r)}
                <button class="ef-tag hover:border-accent hover:text-accent" onclick={() => onopen(r)}>
                  {index.title(r)}
                </button>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    {#each p.sections as s (s.title)}
      <section>
        <h3 class="ef-drawer__sec">{s.title}</h3>
        {#each s.blocks as b, i (i)}
          {#if "html" in b}
            <div class={PROSE}>{@html b.html}</div>
          {:else if depth < 1}
            {@render fold(b.embed, true)}
          {:else}
            <a class="text-sm text-accent underline" href="#doc/{b.embed}">{index.title(b.embed)}</a>
          {/if}
        {/each}
      </section>
    {/each}

    {#if p.children.length && depth < 1}
      <section>
        <h3 class="ef-drawer__sec">{p.kind === "device" ? "Runs here" : "Parts"}</h3>
        {#each p.children as c (c)}{@render fold(c, false)}{/each}
      </section>
    {/if}

    {#if back.length && depth === 0}
      <section>
        <h3 class="ef-drawer__sec">Linked from</h3>
        {#each back as [label, ids] (label)}
          <div class="flex flex-wrap items-baseline gap-1">
            <span class="ef-label w-36 shrink-0 whitespace-nowrap">{label}</span>
            {#each ids as r (r)}
              <button class="ef-tag hover:border-accent hover:text-accent" onclick={() => onopen(r)}>
                {index.title(r)}
              </button>
            {/each}
          </div>
        {/each}
      </section>
    {/if}
  </article>
{/if}

{#snippet fold(child: string, open: boolean)}
  <details class="my-2 border-l-2 border-line pl-3 open:border-accent" {open}>
    <summary class="cursor-pointer font-display text-lg font-semibold">
      {index.title(child)}
      {#if index.byId.get(child)?.status !== "active"}
        <span class="ef-badge ef-badge--warn ml-1">{index.byId.get(child)?.status}</span>
      {/if}
    </summary>
    <div class="mt-1">
      <DocPage {index} id={child} depth={depth + 1} {onopen} />
      <button class="ef-tag mt-1 hover:border-accent hover:text-accent" onclick={() => onopen(child)}>
        open on its own →
      </button>
    </div>
  </details>
{/snippet}
