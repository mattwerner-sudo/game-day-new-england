import { db } from "../src/db/client";
import { events, teams, venues } from "../src/db/schema";

async function main() {
  await db.delete(events);
  await db.delete(teams);
  await db.delete(venues);
  console.log("Cleared events, teams, venues (schools/sports untouched).");
  process.exit(0);
}

main();
