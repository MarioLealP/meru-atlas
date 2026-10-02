// The "home" view of the map: everything on a big screen; on a phone the first two zone
// columns at full width (the whole lab at phone scale is unreadable), pan from there.
import { GEO, type Layout } from "../layout/columns";
import { TOP_BAR, type panzoom } from "./panzoom";

/** Below Tailwind's `lg` is the phone layout: the same breakpoint the `lg:` classes use. */
export function isNarrow(): boolean {
  const lg = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-lg").trim();
  return !matchMedia(`(min-width: ${lg || "64rem"})`).matches;
}

export function overview(api: ReturnType<typeof panzoom>, l: Layout) {
  if (!isNarrow()) return api.fit({ x: 0, y: 0, w: l.width, h: l.height }, { top: TOP_BAR });
  const twoColumns = 2 * (GEO.colW + GEO.colGap) + GEO.pad;
  api.fitWidth({ x: 0, y: GEO.pad / 2, w: twoColumns, h: l.height }, TOP_BAR + 8);
}
