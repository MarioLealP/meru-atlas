// The "home" view of the map: everything on a big screen; on a phone the first two zone
// columns at full width (the whole lab at phone scale is unreadable), pan from there.
import { GEO, type Layout } from "../layout/columns";
import { TOP_BAR, type panzoom } from "./panzoom";

export const NARROW_PX = 900; // same breakpoint as the components' @media (max-width: 900px)
export const isNarrow = () => innerWidth <= NARROW_PX;

export function overview(api: ReturnType<typeof panzoom>, l: Layout) {
  if (!isNarrow()) return api.fit({ x: 0, y: 0, w: l.width, h: l.height }, { top: TOP_BAR });
  const twoColumns = 2 * (GEO.colW + GEO.colGap) + GEO.pad;
  api.fitWidth({ x: 0, y: GEO.pad / 2, w: twoColumns, h: l.height }, TOP_BAR + 8);
}
