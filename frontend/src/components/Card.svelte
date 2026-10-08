<script lang="ts">
  import { actions } from "../lib/graph/actions";
  import type { Model } from "../lib/graph/model";
  import { ago, type UnitLive } from "../lib/live/health";
  import type { DocIndex } from "../lib/docs/pages";
  import DocPage from "./DocPage.svelte";

  let {
    model,
    id,
    live,
    docs,
    onpick,
    onopendoc,
    ontrace,
    onclose,
  }: {
    model: Model;
    id: string;
    live?: UnitLive;
    docs: DocIndex | null;
    onpick: (id: string) => void;
    onopendoc: (id: string) => void;
    ontrace: (from: string) => void;
    onclose: () => void;
  } = $props();

  const n = $derived(model.nodes.get(id)!);
  const zone = $derived(model.g.zones.find((z) => z.id === n.zone)?.title ?? n.zone);
  const SEV = ["info", "info", "warning", "average", "high", "disaster"];
  const acts = $derived(actions(n));
  const down = (st?: { state: string; health?: string }) =>
    !st || st.state !== "running" || st.health === "unhealthy";

  const page = $derived(docs?.byNode.get(id));
  let tab = $state<"overview" | "docs">("overview");

  let copied = $state<string | null>(null);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = text;
      setTimeout(() => (copied = null), 1500);
    } catch {
      copied = null; // no clipboard permission: the command is still readable in the title
    }
  }
</script>

<!-- phone: a bottom sheet (58vh, App.svelte frames the map above it); desktop: a side panel -->
<aside
  class={[
    "ef-drawer absolute inset-x-0 bottom-0 z-10 max-h-[58vh] border-t-2 border-t-accent",
    "lg:inset-x-auto lg:top-[4.5rem] lg:right-4 lg:bottom-4 lg:max-h-none lg:w-[26rem]",
    "lg:border-t lg:border-t-line lg:border-l-accent",
  ]}
  aria-label="{n.label} details"
>
  <header class="ef-drawer__head">
    <div class="min-w-0 flex-1">
      <div class="ef-drawer__sub text-accent">{zone}</div>
      <h2 class="font-display text-2xl font-bold uppercase lg:text-3xl">{n.label}</h2>
      {#if n.sub}<div class="ef-label">{n.sub}</div>{/if}
    </div>
    <button class="ef-btn ef-btn--ghost px-2" onclick={onclose} aria-label="Close">✕</button>
  </header>

  {#if page}
    <div class="ef-tabs px-4" role="tablist" aria-label="Card">
      <button class="ef-tab" role="tab" aria-selected={tab === "overview"} onclick={() => (tab = "overview")}>
        Overview
      </button>
      <button class="ef-tab" role="tab" aria-selected={tab === "docs"} onclick={() => (tab = "docs")}>
        Docs
      </button>
    </div>
  {/if}

  {#if page && docs && tab === "docs"}
    <div class="ef-drawer__body pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <DocPage index={docs} id={page.id} onopen={onopendoc} />
      <button class="ef-btn w-full justify-between" onclick={() => onopendoc(page.id)}>
        Open the full page <span>→</span>
      </button>
    </div>
  {:else}
    <div class="ef-drawer__body pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {#if n.does}<p>{n.does}</p>{/if}
      {#if n.about}<p class="text-sm text-ink-2">{n.about}</p>{/if}
      {#if n.login_note}<p class="text-sm text-ink-3">{n.login_note}</p>{/if}

      {#if acts.length}
        <div class="flex flex-wrap gap-2">
          {#each acts as a (a.title)}
            {#if a.kind === "link"}
              <a
                class={["ef-btn", a.primary && "ef-btn--primary"]}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer">{a.title} ↗</a
              >
            {:else}
              <button class="ef-btn ef-btn--ghost normal-case" onclick={() => copy(a.text)}>
                {copied === a.text ? "Copied ✓" : a.title}
              </button>
            {/if}
          {/each}
        </div>
      {/if}

      {#if live && (live.containers.length || live.problems.length || live.note)}
        <div class="ef-drawer__sec">Live</div>
        <div>
          {#if live.note}
            <div class="ef-statrow">
              <span class="ef-statrow__k">status</span><span class="ef-statrow__v">{live.note}</span>
            </div>
          {/if}
          {#each live.containers as [c, st] (c)}
            <div class="ef-statrow">
              <span class="ef-statrow__k normal-case">{c}</span>
              <span class={["ef-statrow__v", down(st) ? "text-crit" : "text-ok"]}>
                {st ? st.state + (st.health ? ` · ${st.health}` : "") : "missing"}
                {#if st?.uptime}<span class="text-ink-3">
                    · up {ago(Date.now() / 1000 - st.uptime)}</span
                  >{/if}
                {#if st?.restarts}<span class="text-warn"> · {st.restarts} restarts</span>{/if}
              </span>
            </div>
          {/each}
          {#if live.crit || live.high}
            <div class="ef-statrow">
              <span class="ef-statrow__k">vulns</span>
              <span class="ef-statrow__v">{live.crit} critical · {live.high} high</span>
            </div>
          {/if}
        </div>
        {#each live.problems as p (p.name + p.since)}
          <div class={["border-l-2 pl-2 text-sm", p.severity >= 4 ? "border-crit" : "border-warn"]}>
            <span class="ef-badge">{SEV[p.severity]}</span>
            {p.name} <span class="ef-label">{ago(p.since)}</span>
          </div>
        {/each}
      {/if}

      {#if n.facts?.length || n.version}
        <div class="ef-drawer__sec">Facts</div>
        <div>
          {#if n.version}
            <div class="ef-statrow">
              <span class="ef-statrow__k">version</span><span class="ef-statrow__v">{n.version}</span>
            </div>
          {/if}
          <!-- keyed by position: a unit with two web routes has two "URL" facts -->
          {#each n.facts ?? [] as [k, v], i (i)}
            <div class="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-line py-1 text-sm">
              <span class="ef-label">{k}</span><span class="break-words text-ink-2">{v}</span>
            </div>
          {/each}
        </div>
      {/if}

      <div class="ef-drawer__sec">Connected to</div>
      <div class="flex flex-wrap gap-1">
        {#each model.peers(id) as p (p)}
          <button class="ef-tag hover:border-accent hover:text-accent" onclick={() => onpick(p)}>
            {model.nodes.get(p)!.label}
          </button>
        {/each}
      </div>
      <button class="ef-btn w-full justify-between" onclick={() => ontrace(id)}>
        Trace a route from here <span>→</span>
      </button>
    </div>
  {/if}
</aside>
