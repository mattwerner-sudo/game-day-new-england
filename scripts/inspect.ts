import { db } from "../src/db/client";
import { schools, sports, events, teams } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const schoolRows = await db.select().from(schools);
  console.log(`schools: ${schoolRows.length}`);
  for (const s of schoolRows) console.log(`  - ${s.name} (${s.division}, ${s.conference}) ${s.websiteUrl}`);

  const sportCount = await db.select({ count: sql<number>`count(*)` }).from(sports);
  console.log(`sports: ${sportCount[0].count}`);

  const teamCount = await db.select({ count: sql<number>`count(*)` }).from(teams);
  console.log(`teams: ${teamCount[0].count}`);

  const eventCount = await db.select({ count: sql<number>`count(*)` }).from(events);
  console.log(`events: ${eventCount[0].count}`);

  process.exit(0);
}

main();
