<script lang="ts">
  import { actions } from "../lib/graph/actions";
  import type { Model } from "../lib/graph/model";
  import { ago, type UnitLive } from "../lib/live/health";

  let {
    model,
    id,
    live,
    onpick,
    ontrace,
    onclose,
  }: {
    model: Model;
    id: string;
    live?: UnitLive;
    onpick: (id: string) => void;
    ontrace: (from: string) => void;
    onclose: () => void;
  } = $props();

  const n = $derived(model.nodes.get(id)!);
  const zone = $derived(model.g.zones.find((z) => z.id === n.zone)?.title ?? n.zone);
  const SEV = ["info", "info", "warning", "average", "high", "disaster"];
  const acts = $derived(actions(n));

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

<aside class="card" aria-label="{n.label} details">
  <header>
    <div class="zone">{zone}</div>
    <h2>{n.label}</h2>
    {#if n.sub}<div class="sub">{n.sub}</div>{/if}
    <button class="x" onclick={onclose} aria-label="Close">×</button>
  </header>

  {#if n.does}<p class="does">{n.does}</p>{/if}
  {#if n.about}<p class="about">{n.about}</p>{/if}
  {#if n.login_note}<p class="note">{n.login_note}</p>{/if}

  {#if acts.length}
    <div class="links">
      {#each acts as a (a.title)}
        {#if a.kind === "link"}
          <a class:primary={a.primary} href={a.url} target="_blank" rel="noopener noreferrer">{a.title} ↗</a>
        {:else}
          <button onclick={() => copy(a.text)}>{copied === a.text ? "Copied ✓" : a.title}</button>
        {/if}
      {/each}
    </div>
  {/if}

  {#if live && (live.containers.length || live.problems.length || live.note)}
    <section>
      <h3>Live</h3>
      {#if live.note}<div class="kv"><span>status</span><span>{live.note}</span></div>{/if}
      {#each live.containers as [c, st] (c)}
        <div class="ct" class:bad={!st || st.state !== "running" || st.health === "unhealthy"}>
          <span class="name">{c}</span>
          <span>{st ? st.state + (st.health ? ` · ${st.health}` : "") : "missing"}</span>
          <span>{st?.uptime ? `up ${ago(Date.now() / 1000 - st.uptime)}` : ""}</span>
          <span>{st?.restarts ? `${st.restarts} restarts` : ""}</span>
        </div>
      {/each}
      {#if live.crit || live.high}<div class="kv">
          <span>vulns</span><span>{live.crit} critical · {live.high} high</span>
        </div>{/if}
      {#each live.problems as p (p.name + p.since)}
        <div class="prob sev{p.severity}"><b>{SEV[p.severity]}</b> {p.name} <i>{ago(p.since)}</i></div>
      {/each}
    </section>
  {/if}

  {#if n.facts?.length || n.version}
    <section>
      <h3>Facts</h3>
      {#if n.version}<div class="kv"><span>version</span><span>{n.version}</span></div>{/if}
      {#each n.facts ?? [] as [k, v] (k)}<div class="kv"><span>{k}</span><span>{v}</span></div>{/each}
    </section>
  {/if}

  <section>
    <h3>Connected to</h3>
    <div class="peers">
      {#each model.peers(id) as p (p)}<button onclick={() => onpick(p)}>{model.nodes.get(p)!.label}</button
        >{/each}
    </div>
    <button class="trace" onclick={() => ontrace(id)}>Trace a route from here →</button>
  </section>
</aside>

<style>
  .card {
    position: absolute;
    top: 72px;
    right: 16px;
    bottom: 16px;
    width: min(420px, calc(100vw - 32px));
    overflow-y: auto;
    background: color-mix(in srgb, var(--color-panel) 94%, transparent);
    border: 1px solid var(--color-line);
    border-left: 4px solid var(--color-signal);
    padding: 18px 20px;
    backdrop-filter: blur(6px);
  }
  /* phone / narrow: a bottom sheet, the map stays visible above it */
  @media (max-width: 900px) {
    .card {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      max-height: 58vh;
      border-left: 1px solid var(--color-line);
      border-top: 4px solid var(--color-signal);
      padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
    }
    h2 {
      font-size: 26px;
    }
  }
  header {
    position: relative;
    margin-bottom: 10px;
  }
  .zone {
    font: 600 13px var(--font-display);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-signal);
  }
  h2 {
    font: 700 32px/1.05 var(--font-display);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .sub,
  .kv span:first-child,
  i {
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: 12px;
    font-style: normal;
  }
  .x {
    position: absolute;
    top: -6px;
    right: -6px;
    font-size: 26px;
    color: var(--color-muted);
    padding: 0 8px;
  }
  .x:hover {
    color: var(--color-ink);
  }
  p {
    margin: 8px 0;
    line-height: 1.45;
  }
  .about,
  .note {
    color: var(--color-muted);
    font-size: 14px;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0;
  }
  .links a,
  .links button,
  .peers button,
  .trace {
    border: 1px solid var(--color-line);
    padding: 4px 10px;
    font-size: 14px;
  }
  .links a.primary {
    background: var(--color-signal);
    border-color: var(--color-signal);
    color: var(--color-bg);
    font-weight: 600;
  }
  .links button {
    font: 12px var(--font-mono);
  }
  .links a:not(.primary):hover,
  .links button:hover,
  .peers button:hover,
  .trace:hover {
    border-color: var(--color-signal);
    color: var(--color-signal);
  }
  section {
    margin-top: 16px;
    border-top: 1px solid var(--color-line);
    padding-top: 10px;
  }
  h3 {
    font: 600 14px var(--font-display);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 6px;
  }
  .kv,
  .ct {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 8px;
    font-size: 13px;
    padding: 2px 0;
  }
  .ct {
    grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .ct span:nth-child(2) {
    color: var(--color-ok);
  }
  .ct.bad span:nth-child(2) {
    color: var(--color-danger);
  }
  .prob {
    font-size: 13px;
    padding: 3px 0 3px 8px;
    border-left: 3px solid var(--color-signal);
    margin: 4px 0;
  }
  .prob.sev4,
  .prob.sev5 {
    border-color: var(--color-danger);
  }
  .peers {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .trace {
    margin-top: 12px;
    width: 100%;
    text-align: left;
    color: var(--color-signal);
  }
</style>
