// How an Approve / Deny ended (D98). Janus sends the browser back to #v=requests with a fixed result code and a
// few checked fields; the words live here, so a crafted link can only pick one of these messages.
export type Decision = "approve" | "deny";
export type Outcome = {
  result: Result;
  pr?: number;
  decision?: Decision;
  by?: string;
  commit?: string;
};
const RESULTS = [
  "done",
  "not-atlas",
  "not-approver",
  "bad-button",
  "not-yours",
  "sign-in",
  "authentik-no",
  "refused",
  "changed",
  "problems",
  "down",
] as const;
export type Result = (typeof RESULTS)[number];

const USER = /^[A-Za-z0-9._@-]{1,64}$/;
const SHA = /^[0-9a-f]{7,40}$/;

/** The outcome in an address hash, or null when there's none (or it doesn't check out). */
export function readOutcome(h = location.hash): Outcome | null {
  const q = new URLSearchParams(h.replace(/^#/, ""));
  const result = q.get("res") as Result | null;
  if (!result || !RESULTS.includes(result)) return null;
  const pr = Number(q.get("pr"));
  const decision = q.get("dec");
  const by = q.get("by");
  const commit = q.get("c");
  return {
    result,
    pr: Number.isInteger(pr) && pr > 0 ? pr : undefined,
    decision: decision === "approve" || decision === "deny" ? decision : undefined,
    by: by && USER.test(by) ? by : undefined,
    commit: commit && SHA.test(commit) ? commit : undefined,
  };
}

export type Message = { tone: "ok" | "crit"; title: string; text: string };

export function describe(o: Outcome): Message {
  const pr = o.pr ? `#${o.pr}` : "the request";
  const verb = o.decision === "deny" ? "Deny" : "Approve";
  const no = (text: string): Message => ({ tone: "crit", title: `${verb} on ${pr} didn't go through`, text });
  switch (o.result) {
    case "done":
      return o.decision === "deny"
        ? { tone: "ok", title: `${pr} denied`, text: `Denied by ${o.by ?? "you"} - the PR is closed.` }
        : {
            tone: "ok",
            title: `${pr} approved`,
            text:
              `Approved by ${o.by ?? "you"} - on Meru/requests main` +
              (o.commit ? ` in ${o.commit.slice(0, 12)}` : "") +
              ". Shikigami builds it next.",
          };
    case "not-atlas":
      return no("The click didn't come from the atlas's own page, so nothing started.");
    case "not-approver":
      return no(
        "Your atlas sign-in doesn't carry meru-approvers. If you were added just now, sign out of the atlas " +
          "(/outpost.goauthentik.io/sign_out) and come back - groups are read at sign-in.",
      );
    case "bad-button":
      return no("The button didn't say which commit and decision it was for. Refresh and try again.");
    case "not-yours":
      return no("Authentik's answer didn't belong to a click started here, so it went nowhere. Click again.");
    case "sign-in":
      return no("Your Authentik sign-in ran out. Reload the atlas, sign in, and click again.");
    case "authentik-no":
      return no("Authentik turned the check down. Nothing changed.");
    case "refused":
      return no("Xolotl didn't accept Authentik's answer. Nothing changed - Xolotl's log says why.");
    case "changed":
      return no("The request changed or was closed since you looked. Read it again before deciding.");
    case "problems":
      return no(
        "Shikigami found problems with it against today's main. Nothing changed - Xolotl's log has them.",
      );
    case "down":
      return no("Xolotl couldn't be reached. Nothing changed - try again in a minute.");
  }
}
