// Wall mode (v0): full screen, focus cycles through what needs eyes: red units first, then
// amber; when nothing is wrong, every unit you can open. Pure; the timer lives in the view.
import type { Model } from "../graph/model";
import type { UnitLive } from "../live/health";

export const WALL_STEP_MS = 9000;

/** Start the tour: full screen, `step()` now and every WALL_STEP_MS. Returns stop(); leaving
 *  full screen (Esc) stops it too, and `onExit` runs once either way. */
export function wallTour(step: () => void, onExit: () => void): () => void {
  const timer = setInterval(step, WALL_STEP_MS);
  const onFullscreen = () => !document.fullscreenElement && stop();
  function stop() {
    clearInterval(timer);
    document.removeEventListener("fullscreenchange", onFullscreen);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onExit();
  }
  document.addEventListener("fullscreenchange", onFullscreen);
  // refused (no user gesture, kiosk browser): the tour still runs, just not full screen
  void document.documentElement.requestFullscreen?.().catch(() => {});
  step();
  return stop;
}

export function wallList(m: Model, liveBy: Map<string, UnitLive>): string[] {
  const ids = [...m.nodes.keys()];
  const at = (lvl: string) => ids.filter((id) => liveBy.get(id)?.level === lvl);
  const trouble = [...at("bad"), ...at("warn")];
  return trouble.length ? trouble : ids.filter((id) => m.nodes.get(id)!.links?.length);
}
