// Live status: pushed by /api/events (SSE, names only), with a slow poll as the fallback
// while the stream is down. Data always comes from the validated GET; failure keeps the
// last good data. `onGraph` runs when the lab itself changed (a new graph.json), `onDocs`
// when the docs pages did (a new docs.json).
import { getValidated } from "../api";
import { Status } from "../schemas";

class Live {
  data = $state<Status | null>(null);
  error = $state<string | null>(null);
  pushed = $state(false); // true while the event stream is connected
  #timer: ReturnType<typeof setInterval> | undefined;
  #events: EventSource | undefined;

  async refresh() {
    try {
      this.data = await getValidated("/api/status", Status);
      this.error = null;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  start(onGraph: () => void, onDocs: () => void = () => {}, everyMs = 60_000) {
    void this.refresh();
    this.#timer = setInterval(
      () => !this.pushed && document.visibilityState === "visible" && void this.refresh(),
      everyMs,
    );
    document.addEventListener("visibilitychange", this.#onVis);
    if (typeof EventSource === "undefined") return;
    const es = (this.#events = new EventSource("/api/events"));
    es.onopen = () => (this.pushed = true);
    es.onerror = () => (this.pushed = false); // EventSource reconnects by itself
    es.addEventListener("status", () => void this.refresh());
    es.addEventListener("graph", onGraph);
    es.addEventListener("docs", onDocs);
  }
  stop() {
    clearInterval(this.#timer);
    this.#events?.close();
    document.removeEventListener("visibilitychange", this.#onVis);
  }
  #onVis = () => document.visibilityState === "visible" && void this.refresh();
}
export const live = new Live();
