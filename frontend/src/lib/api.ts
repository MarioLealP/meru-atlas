// Typed, same-origin, read-only API client. No credentials or tokens ever live here:
// auth is the SSO session cookie handled by Caddy, invisible to this code.
import type { z } from "zod";

export async function getValidated<S extends z.ZodType>(
  path: `/api/${string}`,
  schema: S,
): Promise<z.infer<S>> {
  const r = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  const parsed = schema.safeParse(await r.json());
  if (!parsed.success)
    throw new Error(`${path}: unexpected data (${parsed.error.issues[0]?.path.join(".")})`);
  return parsed.data;
}
