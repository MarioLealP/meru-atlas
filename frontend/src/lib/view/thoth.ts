// What Thoth says about each Meru app (J5), as a tag beside it in the On main list. Thoth's statuses follow D53/D85:
// planned (asked for, not seen running yet), active (Heimdall sees it), missing, decommissioning, retained, retired.
import type { ThothApp } from "../schemas";

export type Tone = "ok" | "warn" | "crit" | "quiet";

const TONES: Record<string, Tone> = {
  active: "ok",
  planned: "warn", // requested, not running yet
  missing: "crit", // Anubis found it gone while a request still asks for it
  decommissioning: "warn",
  retained: "quiet",
  retired: "quiet",
};

// An unknown status (Thoth grew one) still shows, quietly, instead of breaking the list.
export const toneOf = (status: string): Tone => TONES[status] ?? "quiet";

export const statusByApp = (apps: ThothApp[] | null): Map<string, string> =>
  new Map((apps ?? []).map((a) => [a.key, a.status]));
