import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { gte } from "drizzle-orm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/**
 * Scoped to upcoming events only (not the full historical archive) - matches this product's
 * own forward-looking scope (Section 1/2: "what's happening near me this weekend") and keeps
 * this comfortably under the 50,000-URL sitemap limit without needing pagination.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const upcoming = await db
    .select({ id: events.id, startDatetime: events.startDatetime })
    .from(events)
    .where(gte(events.startDatetime, new Date()));

  return [
    { url: BASE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/follow`, changeFrequency: "monthly", priority: 0.5 },
    ...upcoming.map((e) => ({
      url: `${BASE_URL}/events/${e.id}`,
      lastModified: e.startDatetime,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
