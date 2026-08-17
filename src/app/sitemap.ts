import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { gte } from "drizzle-orm";
import { getFilterOptions } from "@/db/queries";
import { slugify } from "@/lib/slug";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/**
 * Individual event pages (scoped to upcoming only, matching this product's own forward-looking
 * scope - Section 1/2) plus, as of Section 55, the stable school/league pages and their index
 * pages - both are worth indexing for different reasons: event pages catch very-long-tail
 * "Amherst vs Williams soccer October 15"-style queries, school/league pages catch the more
 * durable "Amherst College schedule"/"NESCAC schedule" queries a search visitor is actually
 * likely to type. Comfortably under the 50,000-URL sitemap limit either way.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [upcoming, { schools, leagues }] = await Promise.all([
    db.select({ id: events.id, startDatetime: events.startDatetime }).from(events).where(gte(events.startDatetime, new Date())),
    getFilterOptions(),
  ]);

  return [
    { url: BASE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/schools`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/leagues`, changeFrequency: "weekly", priority: 0.8 },
    ...schools.map((school) => ({
      url: `${BASE_URL}/schools/${slugify(school.name)}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...leagues.map((league) => ({
      url: `${BASE_URL}/leagues/${slugify(league)}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...upcoming.map((e) => ({
      url: `${BASE_URL}/events/${e.id}`,
      lastModified: e.startDatetime,
      changeFrequency: "daily" as const,
      priority: 0.4,
    })),
  ];
}
