<script lang="ts">
  // Requests waiting for approval (Janus, D93) with Approve / Deny (D98). The buttons are plain form posts, not
  // fetch(): they have to be a real page navigation - Janus answers with a redirect to Authentik's silent check and
  // sets its short anti-forgery cookie. No token or code is ever seen by this code.
  import { onMount } from "svelte";
  import { getValidated } from "../lib/api";
  import { PendingList, type Pending } from "../lib/schemas";

  let items = $state<Pending[] | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      items = await getValidated("/api/janus/requests", PendingList);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  const startUrl = (pr: number) => `/api/janus/approve/${pr}/start`;
</script>

<!-- covers the map, which stays mounted underneath so pan/zoom survive a trip here -->
<div class="absolute inset-x-0 top-14 bottom-0 overflow-y-auto bg-ground px-3 pt-4 pb-12 lg:px-6">
  <section class="mx-auto max-w-[1100px]">
    <h2 class="ef-sec-head mb-3 font-display text-2xl font-bold uppercase lg:text-3xl">
      <span class="ef-idx">01</span>Requests
    </h2>
    <p class="mb-4 max-w-[80ch] text-ink-2">
      Apps and databases asked for through Janus, waiting for your yes. Approve checks with Authentik that
      it's you, for this request at this exact commit; Xolotl then puts it on Meru/requests main and Shikigami
      builds it. Read the change in Gitea first.
    </p>

    <div class="mb-4">
      <button class="ef-btn" onclick={load} disabled={loading}>
        {#if loading}<span class="ef-spinner"></span>{/if}Refresh
      </button>
    </div>

    {#if error}
      <p class="ef-card border-crit p-3 text-crit" role="alert">Can't load the requests: {error}</p>
    {:else if items === null}
      <p class="text-ink-3">Loading…</p>
    {:else}
      <ul class="flex flex-col gap-3">
        {#each items as r (r.pr)}
          <li class="ef-card flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:p-4">
            <div class="min-w-0 flex-1">
              <div class="ef-card__title break-words">{r.title}</div>
              <div class="ef-card__meta mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span>#{r.pr}</span>
                <span>asked by {r.requested_by ?? r.author}</span>
                <span title={r.head}>at {r.head.slice(0, 12)}</span>
              </div>
              <ul class="mt-2 font-mono text-sm text-ink-2">
                {#each r.files as f (f)}<li>{f}</li>{/each}
              </ul>
            </div>
            <div class="flex flex-wrap gap-2">
              <a class="ef-btn ef-btn--ghost" href={r.url} target="_blank" rel="noopener noreferrer">Review</a
              >
              <form method="post" action={startUrl(r.pr)}>
                <input type="hidden" name="head" value={r.head} />
                <input type="hidden" name="decision" value="deny" />
                <button class="ef-btn ef-btn--danger" type="submit">Deny</button>
              </form>
              <form method="post" action={startUrl(r.pr)}>
                <input type="hidden" name="head" value={r.head} />
                <input type="hidden" name="decision" value="approve" />
                <button class="ef-btn ef-btn--primary" type="submit">Approve</button>
              </form>
            </div>
          </li>
        {:else}
          <li class="text-ink-3">Nothing waiting for approval.</li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
