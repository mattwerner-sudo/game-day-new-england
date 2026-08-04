const UA = "Mozilla/5.0 (compatible; ne-sports-aggregator/0.1; +https://ne-sports-aggregator.local)";

/** Fetch the real SIDEARM iCal feed for one sport at one school. */
export async function fetchIcsFeed(hostname: string, sportId: number): Promise<string> {
  const url = `https://${hostname}/calendar.ashx/calendar.ics?sport_id=${sportId}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS feed for ${hostname} sport_id=${sportId}: ${res.status}`);
  }
  return res.text();
}
