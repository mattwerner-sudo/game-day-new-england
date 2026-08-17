/**
 * School names are unique (schools.name has a DB-level unique constraint) and league names are
 * already deduped text values (getFilterOptions().leagues) - both make stable, collision-free
 * slugs on their own, no stored/generated column needed. Strips accents so a name like "café"
 * (none currently in this data, but plausible) still produces plain ASCII.
 */
export function slugify(value: string): string {
  const stripped = value.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
