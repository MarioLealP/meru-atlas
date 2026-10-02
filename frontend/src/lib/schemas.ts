// Runtime validation of API responses (zod). The backend already validates against the
// JSON Schemas in /schemas; this guards the frontend against drift or a bad deploy, so a
// malformed response becomes a clear error instead of a broken map.
import { z } from "zod";

export const Link = z.object({ title: z.string(), url: z.url() });

export const Node = z.object({
  id: z.string(),
  label: z.string(),
  zone: z.string(),
  sub: z.string().optional(),
  rank: z.number().int().optional(),
  icon: z.string().optional(),
  does: z.string().optional(),
  about: z.string().optional(),
  flag: z.enum(["", "warn", "off"]).optional(),
  login_note: z.string().optional(),
  links: z.array(Link).optional(),
  containers: z.array(z.string()).optional(),
  project: z.string().optional(),
  version: z.string().optional(),
  ports: z.array(z.string()).optional(),
  networks: z.array(z.string()).optional(),
  public: z.boolean().optional(),
  zabbix_hostid: z.string().optional(),
  facts: z.array(z.tuple([z.string(), z.string()])).optional(),
});

export const EdgeKind = z.enum(["traffic", "route", "sso", "data", "watch", "alert", "ship", "backup"]);
export const Edge = z.object({
  from: z.string(),
  to: z.string(),
  kind: EdgeKind,
  label: z.string().optional(),
});

export const Zone = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number().int().optional(),
  strip: z.boolean().optional(),
});

export const Graph = z.object({
  schema_version: z.literal(1),
  zones: z.array(Zone),
  nodes: z.array(Node),
  edges: z.array(Edge),
  warnings: z.array(z.string()).optional(),
});
export type Graph = z.infer<typeof Graph>;
