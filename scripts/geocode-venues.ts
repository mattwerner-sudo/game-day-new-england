/**
 * Backfills venues.lat/lng for New England venues (out-of-region venues are never displayed
 * per the permanent NE-only filter in getFilteredEvents(), so there's no reason to geocode
 * them). Human-triggered, like migrate.ts/seed.ts/ingest.ts - not run automatically.
 *
 * Two-tier match, in precision order:
 *   1. Venue city matches a seeded school's own city -> use that school's campus lat/lng
 *      (more precise - a real campus location, not just a city centroid).
 *   2. Venue city matches a place in the Census Gazetteer -> use that place's centroid
 *      (src/geo/neGazetteer.ts - see that file for provenance).
 * Venues that match neither are left null and logged, not guessed at.
 */
import { eq, and, inArray, isNull } from "drizzle-orm";
import { db } from "../src/db/client";
import { venues, schools } from "../src/db/schema";
import { NE_GAZETTEER } from "../src/geo/neGazetteer";
import { NE_STATES } from "../src/db/queries";

async function main() {
  const gazetteer = new Map<string, [number, number]>();
  for (const [state, name, lat, lng] of NE_GAZETTEER) {
    gazetteer.set(`${name.toLowerCase()}|${state}`, [lat, lng]);
  }

  const schoolRows = await db.select({ city: schools.city, state: schools.state, lat: schools.lat, lng: schools.lng }).from(schools);
  const schoolLookup = new Map<string, [number, number]>();
  for (const s of schoolRows) {
    if (s.lat != null && s.lng != null) schoolLookup.set(`${s.city.toLowerCase()}|${s.state}`, [s.lat, s.lng]);
  }

  const targets = await db
    .select({ id: venues.id, city: venues.city, state: venues.state })
    .from(venues)
    .where(and(inArray(venues.state, NE_STATES), isNull(venues.lat)));

  let bySchool = 0;
  let byGazetteer = 0;
  const unmatched: string[] = [];

  for (const v of targets) {
    if (!v.city || !v.state) continue;
    const key = `${v.city.toLowerCase()}|${v.state}`;
    const match = schoolLookup.get(key);
    const [lat, lng] = match ?? gazetteer.get(key) ?? [];
    if (lat != null && lng != null) {
      await db.update(venues).set({ lat, lng }).where(eq(venues.id, v.id));
      if (match) bySchool++;
      else byGazetteer++;
    } else {
      unmatched.push(`${v.city}, ${v.state}`);
    }
  }

  console.log(`Geocoded ${bySchool + byGazetteer} of ${targets.length} venues needing coordinates`);
  console.log(`  ${bySchool} via school-city match, ${byGazetteer} via Census gazetteer`);
  if (unmatched.length > 0) {
    console.log(`${unmatched.length} unmatched (left null, not guessed):`);
    for (const u of [...new Set(unmatched)].sort()) console.log(`  ${u}`);
  }
  process.exit(0);
}

main();
