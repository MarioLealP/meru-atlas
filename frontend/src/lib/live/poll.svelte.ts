// Polls /api/status every 30 s while the tab is visible. Failure keeps the last good data.
import { getValidated } from "../api";
import { Status } from "../schemas";

class Live {
  data = $state<Status | null>(null);
  error = $state<string | null>(null);
  #timer: ReturnType<typeof setInterval> | undefined;

  async refresh() {
    try {
      this.data = await getValidated("/api/status", Status);
      this.error = null;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  start(everyMs = 30_000) {
    void this.refresh();
    this.#timer = setInterval(() => document.visibilityState === "visible" && void this.refresh(), everyMs);
    document.addEventListener("visibilitychange", this.#onVis);
  }
  stop() {
    clearInterval(this.#timer);
    document.removeEventListener("visibilitychange", this.#onVis);
  }
  #onVis = () => document.visibilityState === "visible" && void this.refresh();
}
export const live = new Live();
