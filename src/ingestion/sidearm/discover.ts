const UA = "Mozilla/5.0 (compatible; ne-sports-aggregator/0.1; +https://ne-sports-aggregator.local)";

export interface SidearmSportMeta {
  sportId: number;
  title: string; // e.g. "Women's Soccer"
  genderCode: string; // "m" | "f" | other
  slug: string; // URL slug, e.g. "womens-soccer"
}

/** Fetch a SIDEARM athletics homepage and extract every /sports/<slug>/schedule link. */
export async function discoverSportSlugs(hostname: string): Promise<string[]> {
  const res = await fetch(`https://${hostname}/`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to fetch homepage for ${hostname}: ${res.status}`);
  const html = await res.text();
  const matches = html.matchAll(/href="\/sports\/([a-zA-Z0-9-]+)\/schedule"/g);
  const slugs = new Set<string>();
  for (const m of matches) slugs.add(m[1]);
  return [...slugs];
}

/** Fetch a sport's schedule page and pull the embedded `associated_sport` JSON blob. */
export async function fetchSportMeta(
  hostname: string,
  slug: string
): Promise<SidearmSportMeta | null> {
  const res = await fetch(`https://${hostname}/sports/${slug}/schedule`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/associated_sport\s*=\s*(\{[^;]*\});/);
  if (!match) return null;

  const parsed = JSON.parse(match[1]);
  if (!parsed || typeof parsed.id !== "number") return null;

  return {
    sportId: parsed.id,
    title: parsed.title,
    genderCode: parsed.gender ?? "",
    slug,
  };
}
