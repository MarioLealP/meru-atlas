// Line kinds → Tailwind classes on the Endfield tokens (theme.css --color-k-*). Written out in
// full so Tailwind's scanner finds them.
import type { Kind } from "../state.svelte";

export const KIND_STROKE: Record<Kind, string> = {
  traffic: "stroke-k-traffic",
  route: "stroke-k-route",
  sso: "stroke-k-sso",
  data: "stroke-k-data",
  watch: "stroke-k-watch",
  alert: "stroke-k-alert",
  ship: "stroke-k-ship",
  backup: "stroke-k-backup",
};
export const KIND_BG: Record<Kind, string> = {
  traffic: "bg-k-traffic",
  route: "bg-k-route",
  sso: "bg-k-sso",
  data: "bg-k-data",
  watch: "bg-k-watch",
  alert: "bg-k-alert",
  ship: "bg-k-ship",
  backup: "bg-k-backup",
};
export const KIND_DASH: Partial<Record<Kind, string>> = { sso: "6 5", watch: "2 5", backup: "10 4 2 4" };
