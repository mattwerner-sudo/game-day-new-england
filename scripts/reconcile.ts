import { reconcileOrphanedOpponents } from "../src/ingestion/reconcile";

/**
 * Run after onboarding any new school - finds games ingested before that school existed (the
 * opponent recorded as unresolved raw text, since findSchoolByName had nothing to match) that
 * now have a real duplicate row from the new school's own feed, and merges them. See
 * src/ingestion/reconcile.ts and CLAUDE.md Section 53 for the full root cause.
 *
 * Defaults to a dry run (prints the plan, no writes) - pass --apply to actually merge/delete.
 * Matches this project's convention of real writes needing an explicit, deliberate step rather
 * than being a silent side effect of routine ingestion.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const result = await reconcileOrphanedOpponents({ dryRun: !apply });

  console.log(`${apply ? "Applied" : "Dry run"}: ${result.merged.length} duplicate pair(s) found`);
  for (const m of result.merged) {
    const fields = m.mergedFields.length > 0 ? ` (merged: ${m.mergedFields.join(", ")})` : "";
    console.log(`  keep ${m.keptId}, delete ${m.deletedId}${fields}`);
  }

  if (result.skippedFollowed.length > 0) {
    console.log(`\n${result.skippedFollowed.length} skipped (real user data references the orphan row):`);
    for (const s of result.skippedFollowed) {
      console.log(`  ${s.orphanId}: ${s.reason}`);
    }
  }

  if (!apply && result.merged.length > 0) {
    console.log("\nRun again with --apply to actually merge and delete these.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
