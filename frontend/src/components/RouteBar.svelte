<script lang="ts">
  import type { Model } from "../lib/graph/model";

  let {
    model,
    path,
    notice,
    onstep,
    onclear,
  }: {
    model: Model;
    path: string[] | null;
    notice: string | null;
    onstep: (id: string) => void;
    onclear: () => void;
  } = $props();
</script>

<!-- A traced route as tappable steps (fly to a hop, the trace stays), or a "no path" answer. -->
<div class="bar" class:no={!!notice} role="status">
  {#if path}
    <span class="k">Route</span>
    {#each path as id, i (id)}
      {#if i}<span class="arrow">→</span>{/if}
      <button class="step" onclick={() => onstep(id)}>{model.nodes.get(id)?.label ?? id}</button>
    {/each}
  {:else}
    {notice}
  {/if}
  <button class="clear" onclick={onclear}>clear</button>
</div>

<style>
  .bar {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100vw - 32px);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    background: var(--color-panel);
    border: 1px solid var(--color-signal);
    padding: 8px 14px;
    font: 600 16px var(--font-display);
    letter-spacing: 0.04em;
  }
  .bar.no {
    border-color: var(--color-danger);
  }
  .k {
    color: var(--color-signal);
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.14em;
    margin-right: 4px;
  }
  .arrow {
    color: var(--color-muted);
  }
  .step {
    border-bottom: 1px dashed var(--color-line);
  }
  .step:hover {
    color: var(--color-signal);
    border-color: var(--color-signal);
  }
  .clear {
    margin-left: 8px;
    color: var(--color-muted);
    font: 12px var(--font-mono);
  }
  @media (max-width: 900px) {
    .bar {
      left: 12px;
      right: 12px;
      transform: none;
      bottom: calc(12px + env(safe-area-inset-bottom));
    }
    .step {
      padding: 4px 0; /* bigger tap target */
    }
  }
</style>
