import type { Kind } from "../state.svelte";

export const KIND_COLOR: Record<Kind, string> = {
  traffic: "#e7e6e1",
  route: "#8a8d93",
  sso: "#6fcf8a",
  data: "#7aa7da",
  watch: "#f2c300",
  alert: "#ff6b5f",
  ship: "#b49cf0",
  backup: "#5fc9c4",
};
export const KIND_DASH: Partial<Record<Kind, string>> = { sso: "6 5", watch: "2 5", backup: "10 4 2 4" };
