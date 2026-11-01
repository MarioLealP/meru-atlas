// Runtime validation of API responses (zod). The backend already validates against the
// JSON Schemas in /schemas; this guards the frontend against drift or a bad deploy, so a
// malformed response becomes a clear error instead of a broken map.
import { z } from "zod";

// http(s) only: a link is rendered as <a href>, never a javascript:/data: URL
export const Link = z.object({ title: z.string(), url: z.url({ protocol: /^https?$/ }) });
export type Link = z.infer<typeof Link>;

export const Route = z.object({ host: z.string(), login: z.string(), sso: z.boolean(), public: z.boolean() });

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
  routes: z.array(Route).optional(),
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

export const RouterForward = z.object({
  proto: z.enum(["tcp", "udp"]),
  port: z.number().int(),
  target: z.string(),
});

export const Graph = z.object({
  schema_version: z.literal(1),
  source: z.object({ repo: z.string().optional(), commit: z.string().optional() }).optional(),
  router_forwards: z.array(RouterForward).optional(),
  zones: z.array(Zone),
  nodes: z.array(Node),
  edges: z.array(Edge),
  warnings: z.array(z.string()).optional(),
});
export type Graph = z.infer<typeof Graph>;

// Live status (status.schema.json): runtime data written every minute by the host collector.
const Container = z.object({
  state: z.string(),
  health: z.string().optional(),
  restarts: z.number().int().optional(),
  uptime: z.number().int().optional(),
  image: z.string().optional(),
});
const Problem = z.object({
  name: z.string(),
  severity: z.number().int().min(0).max(5),
  since: z.number().int(),
  host: z.string().optional(),
  hostid: z.string().optional(),
});
const Timer = z.object({ result: z.string().optional(), at: z.number().int().optional() });
export const Status = z.object({
  generated: z.number().int(),
  containers: z.record(z.string(), Container),
  problems: z.array(Problem),
  errors: z.array(z.string()),
  bans: z
    .array(z.object({ ip: z.string(), since: z.string().optional(), why: z.string().optional() }))
    .optional(),
  trivy: z
    .record(z.string(), z.object({ c: z.number().int().optional(), h: z.number().int().optional() }))
    .optional(),
  trivy_at: z.number().int().optional(),
  deploy: z.record(z.string(), z.unknown()).optional(),
  headscale: z
    .object({ online: z.number().int().optional(), total: z.number().int().optional() })
    .loose()
    .optional(),
  wazuh: z.array(z.record(z.string(), z.unknown())).optional(),
  timers: z.record(z.string(), Timer).optional(),
});
export type Status = z.infer<typeof Status>;
export type Problem = z.infer<typeof Problem>;
export type Container = z.infer<typeof Container>;

// Docs (docs.schema.json): the infra repo's docs pages, linked both ways and pre-rendered by
// atlas_gen (markdown-it, raw HTML disabled). Optional: the map works without it.
const RelKind = z.enum([
  "runs-on",
  "part-of",
  "reports-to",
  "talks-to",
  "cert-from",
  "devices",
  "mentions",
  "embeds",
]);
const Block = z.union([z.object({ html: z.string() }), z.object({ embed: z.string() })]);
export const DocPage = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["app", "component", "device", "topic", "access"]),
  path: z.string(),
  node: z.string().optional(),
  status: z.enum(["active", "temporary", "retire", "junk?"]),
  verified: z.iso.date(),
  installed_by: z.string().optional(),
  relations: z.array(z.object({ kind: RelKind, to: z.string() })),
  backrefs: z.array(z.object({ kind: RelKind, from: z.string() })),
  children: z.array(z.string()),
  sections: z.array(z.object({ title: z.string(), blocks: z.array(Block) })),
});
export type DocPage = z.infer<typeof DocPage>;
export type RelKind = z.infer<typeof RelKind>;
export const Docs = z.object({
  schema_version: z.literal(1),
  pages: z.array(DocPage),
  uncovered_nodes: z.array(z.string()),
});
export type Docs = z.infer<typeof Docs>;
