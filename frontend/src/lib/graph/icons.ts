// Icon name (overlay `icon:`) -> bundled URL. Tries name.svg, name.png, si-name.svg like v0.
const files = import.meta.glob("../../assets/icons/*.{svg,png}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const byFile = new Map(Object.entries(files).map(([p, url]) => [p.split("/").pop()!, url]));

export function iconUrl(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return byFile.get(`${name}.svg`) ?? byFile.get(`${name}.png`) ?? byFile.get(`si-${name}.svg`);
}

export const initials = (label: string) =>
  label
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
