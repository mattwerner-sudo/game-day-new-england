import { db } from "../src/db/client";
import { schools, sports } from "../src/db/schema";
import { SCHOOLS_SEED } from "../src/db/seed/schools";
import { SPORTS_SEED } from "../src/db/seed/sports";

async function main() {
  await db.insert(sports).values([...SPORTS_SEED]).onConflictDoNothing();
  console.log(`Seeded ${SPORTS_SEED.length} sports.`);

  await db.insert(schools).values([...SCHOOLS_SEED]).onConflictDoNothing();
  console.log(`Seeded ${SCHOOLS_SEED.length} schools.`);
  process.exit(0);
}

main();
