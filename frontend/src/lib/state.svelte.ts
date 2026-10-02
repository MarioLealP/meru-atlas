// UI state (Svelte 5 runes). One place for selection, route and layer switches.
export type Kind = "traffic" | "route" | "sso" | "data" | "watch" | "alert" | "ship" | "backup";
export const KINDS: [Kind, string][] = [
  ["traffic", "Traffic"],
  ["route", "Web routes"],
  ["sso", "SSO"],
  ["data", "Data"],
  ["watch", "Monitoring"],
  ["alert", "Alerts"],
  ["ship", "Delivery"],
  ["backup", "Backups"],
];

function stored(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

class UiState {
  selected = $state<string | null>(null);
  cardOpen = $state(false);
  hover = $state<string | null>(null);
  trace = $state<{ path: string[]; edges: number[] } | null>(null);
  traceFrom = $state<string | null>(null); // "route from here to…" waiting for a target
  allLines = $state(stored("atlas.alllines", false));
  layers = $state<Record<Kind, boolean>>(
    Object.fromEntries(KINDS.map(([k]) => [k, true])) as Record<Kind, boolean>,
  );

  setAllLines(v: boolean) {
    this.allLines = v;
    try {
      localStorage.setItem("atlas.alllines", v ? "1" : "0");
    } catch {
      /* private mode etc.: not remembered, fine */
    }
  }
  clear() {
    this.selected = null;
    this.cardOpen = false;
    this.trace = null;
    this.traceFrom = null;
  }
}

export const ui = new UiState();
