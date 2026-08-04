# PROJECT: [Working Name TBD] — New England College Sports & Campus Events Aggregator

> This file is read automatically by Claude Code at the start of every session in this repo.
> Keep it current — when a real decision is made in chat or in code, update this file so the
> next session doesn't relitigate it. Treat it as the single source of truth for context,
> not as documentation to write once and ignore.

---

## 1. What this is

A geography-and-date-first discovery product that answers: **"What college games or campus
events are happening near me this weekend?"** — for New England families, alumni, and fans.

The Kayak analogy: Kayak doesn't sell flights, it aggregates fragmented airline inventory into
one comparison/discovery layer and profits from being the decision layer. We do the same thing
for ~130 college athletic programs across ME/NH/VT/MA/RI/CT, whose schedules currently live
scattered across ~130 separate school websites with no unified consumer-facing view.

**Coverage principle:** every varsity team, every season, every school. A school like Harvard
fields dozens of varsity programs across three seasons (fall: football, soccer, field hockey,
volleyball, cross country, sailing...; winter: basketball, ice hockey, squash, swimming,
wrestling...; spring: lacrosse, baseball, softball, rowing, track, tennis, golf...) — all of
it is in scope, not just the marquee sports (football/basketball/hockey). Rowing matters as much
as football here. This is a deliberate differentiator: ESPN and NCAA.com effectively cover only
the marquee sports at scale; full-roster coverage across every varsity program is part of the
breadth advantage.

**Also in scope: special/multi-school sporting events** — regional or conference-level events
that aren't a single school's home game but are still a "college sporting event near me" a
family would want to know about. Examples: Head of the Charles Regatta, NE10 championship
tournaments, NESCAC/conference championship weekends, ECAC hockey tournaments hosted in the
region. These get modeled as events too (see schema), typically without a single "home team,"
possibly with multiple participating schools and a neutral or rotating venue.

**Explicitly NOT:**
- Not covering club or intramural sports — **varsity only**, across every division (D1/D2/D3).
- Not covering non-sporting campus events — no homecoming, festivals, arts events, lectures,
  etc. Sporting events (single-school games/meets and multi-school special events like Head of
  the Charles) are the entire scope. Don't build for or scaffold a "general campus events"
  category.
- Not a ticketing company. We link out to GoFan/Hometown/school ticket pages; we do not process
  payments in v1.
- Not trying to compete with ESPN on D1 depth or live stats. Our edge is breadth — especially
  D2/D3 and non-marquee sports, which ESPN and NCAA.com underserve — and a "near me, this
  weekend" UX they don't have.
- Not scraping HTML as the default strategy. Prefer structured feeds (see Data Architecture).

## 2. Business context (condensed — full reports exist outside this repo)

- **Market:** ~110 four-year NCAA programs + ~20-25 juco in New England. ~24 D1, ~10 D2, ~70-75
  D3. Peak season (fall: soccer/football/field hockey/volleyball/XC; winter: basketball/hockey/
  swimming) generates hundreds of home dates per week region-wide.
- **Competitive gap:** No product combines all-division coverage + geographic/date-first
  discovery + casual-family UX. ESPN/NCAA.com are team-first and D1-weighted. Ticketing apps
  (GoFan, Hometown) are transaction-first and single-vendor (only show schools using that
  vendor).
- **Data reality:** The two dominant athletics CMS platforms — SIDEARM Sports (~1,500+ programs)
  and PrestoSports (~1,600+ programs, 100+ conferences) — already expose iCal (.ics) and RSS
  feeds for schedule syndication. This is the single most important feasibility fact: **build
  feed adapters for these two platforms first**, not a general-purpose scraper.
- **Monetization priority (in order):**
  1. B2B licensing — white-label embeddable calendar widget sold to conferences, athletic
     departments, local media
  2. Tourism board / local business sponsorship (geo-targeted, "presented by")
  3. Hospitality/travel affiliate (hotels, restaurants near campus towns — genuinely Kayak-like)
  4. Ticketing referral links (secondary — most D3 games are free, so this is thin, not core)
  5. Consumer freemium (alerts, favorites) — nice-to-have, not the primary bet
- **Full context:** market/competitive/data-feasibility research and monetization analysis exist
  as separate reference documents (business_report.md if present in this repo, or ask the user
  — they have the full versions from earlier planning).

## 3. Scope: full New England D1–D3 (~110 four-year programs)

**Target coverage, all six states, no permanent conference limitation:**
- ~24 D1 programs (America East, Hockey East, Ivy League, CAA, MAAC, Patriot, NEC, etc.)
- ~10 D2 programs (nearly all Northeast-10: Bentley, Assumption, AIC, Saint Anselm, SNHU,
  Franklin Pierce, Southern Connecticut, Bridgeport, Post, Saint Michael's)
- ~70-75 D3 programs across NESCAC, Little East, Conference of New England (ex-CCC), MASCAC,
  GNAC, NEWMAC, North Atlantic Conference

This is the real target — build and design for this scale from the start (schema, ingestion
architecture, UI) rather than something that has to be re-architected later.

**In scope for the full build:**
- Ingest schedules for all ~110 New England D1–D3 programs, **every varsity sport, all three
  seasons (fall/winter/spring)** — not just marquee sports
- Ingest **special/multi-school sporting events** (Head of the Charles, conference championship
  tournaments, hosted postseason events) as their own event type
- Canonical event database (see schema below) sized for full regional coverage and full sport
  breadth
- Deduplication of the same game appearing on both schools' feeds
- Simple mobile-first web UI: "What's happening [today / this weekend] near [me / a town]"
- Basic map or list view, filterable by sport/school/division/date
- Deep link out to each school's official ticket/schedule page (no embedded checkout in v1)

**Explicitly out of scope for now:**
- Club/intramural sports (varsity only)
- Non-sporting campus events of any kind (festivals, lectures, arts, homecoming-as-a-festival —
  not just "later," genuinely not the product)
- Native mobile apps (mobile-first responsive web only)
- Ticketing affiliate integration (revisit once there's real traffic — see prior monetization
  discussion)
- Push notifications / accounts / freemium tier

### Recommended build sequencing (engineering practice, not a scope limit)

Even with full New England as the target, don't point the pipeline at 110 unaudited feeds on
day one — that's how silent breakage goes unnoticed. Sequence the *build*, not the *ambition*:

1. **Validation batch (~10-15 schools):** Pick a mix that stresses both major CMS platforms —
   e.g. a handful of NESCAC (mostly one platform) plus a few Northeast-10 or America East
   schools (likely the other platform / edge cases). Get feed adapters, dedupe, and the UI
   working end-to-end against real, messy data.
2. **Full D3 rollout:** Once adapters are proven, scale ingestion to all ~70-75 D3 programs —
   this is mostly a matter of adding schools to a config list, not new adapter code, assuming
   the SIDEARM/Presto adapters are solid.
3. **D2 + D1 rollout:** Add Northeast-10 (D2) and the D1 programs. D1 schools are more likely to
   have custom/WMT Digital sites or stricter feed access — budget extra adapter time here.
4. **Ongoing:** monitor feed health across all ~110 sources; this becomes the main operational
   workload once coverage is complete (see Section 6 on feed breakage as the core risk).

Treat step 1 as a 2-4 week engineering milestone, not a multi-month standalone "pilot product" —
the goal is full regional coverage, reached quickly and in a controlled order.

## 4. Tech stack (decided — don't relitigate without a strong reason)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS. Mobile-first, SEO matters a
  lot (this is how AllTrails/Bandsintown win — ranking for "college games near me" type
  queries), so favor server-rendered pages over client-only SPA patterns.
- **Backend/API:** Next.js API routes or a lightweight separate Node service for the ingestion
  pipeline — start monolithic, split out the ingestion worker only when it needs its own
  deploy/scaling cadence.
- **Database:** Postgres (via Supabase or Neon for managed hosting + easy geo queries via
  PostGIS if we need proximity search).
- **Hosting:** Vercel (frontend) + managed Postgres. Keep infra boring and cheap at this stage.
- **Ingestion pipeline:** scheduled jobs (cron via Vercel Cron or a small worker) that pull
  iCal/RSS feeds, normalize, dedupe, and upsert into the canonical events table.

## 5. Data architecture

### Ingestion priority order
1. SIDEARM Sports iCal/RSS feed adapter (build first — largest single-platform coverage)
2. PrestoSports feed adapter
3. Conference-level feeds where available (NESCAC office, if it aggregates)
4. schema.org `SportsEvent` JSON-LD opportunistic harvesting (supplementary only)
5. Manual/custom handler for any NESCAC school not covered by 1-3 (expect to need this for
   at least a couple of schools — audit before assuming full coverage)

### Canonical event schema (starting point — refine in code, not just here)

Two event shapes exist: **single-school games** (the vast majority — one home team, one venue,
tied to one school) and **special multi-school events** (Head of the Charles, conference
championships — no single "home team," possibly many participating schools, neutral/rotating
venue). Model both through one `events` table with a `type` discriminator rather than two
separate tables, so the UI/query layer doesn't need to branch everywhere.

```
events
  id                uuid primary key
  type              text            -- "game" | "special_event"
  sport             text            -- normalized enum, full varsity list (see sports table),
                                        e.g. "football", "rowing", "squash", "lacrosse" — not
                                        just marquee sports
  gender             text           -- "mens" | "womens" | "coed" (many programs run separate
                                        men's/women's teams per sport — do not collapse these)
  season            text            -- "fall" | "winter" | "spring", derived from sport +
                                        start_datetime, used for filtering
  division          text            -- "D1" | "D2" | "D3" (for "special_event" rows, this may
                                        be null or span multiple divisions)
  home_team_id      uuid fk -> teams, nullable      -- null for special_event rows
  away_team_id      uuid fk -> teams, nullable      -- null for special_event rows
  participating_school_ids  uuid[]  -- used for special_event rows with multiple schools;
                                        null/unused for ordinary games
  event_name        text nullable   -- e.g. "Head of the Charles Regatta", "NE10 Championship"
                                        — used for special_event rows, null for ordinary games
  venue_id          uuid fk -> venues
  start_datetime    timestamptz
  end_datetime      timestamptz nullable
  status            text            -- "scheduled" | "postponed" | "cancelled" | "final"
  ticket_url        text nullable
  is_free           boolean nullable
  source            text            -- "sidearm" | "presto" | "conference" | "manual"
  source_event_id   text            -- source's own ID, for dedupe/re-sync
  dedupe_key        text            -- computed: normalized(date+home+away) for games (NOT
                                        +venue - see Section 9, 2026-08-04: the two schools'
                                        own feeds report venue inconsistently for the same real
                                        game, so including it defeats the dedupe); normalized
                                        (event_name+date+venue) for special_events
  created_at        timestamptz
  updated_at        timestamptz

teams
  id, school_id fk -> schools, sport, gender          -- one row per school+sport+gender combo,
                                                          e.g. Harvard/rowing/womens is distinct
                                                          from Harvard/rowing/mens

sports
  id, name, typical_season ("fall"|"winter"|"spring")  -- reference table covering the full
    varsity sport list (football, soccer, field hockey, volleyball, cross country, sailing,
    basketball, ice hockey, squash, swimming, wrestling, lacrosse, baseball, softball, rowing/
    crew, track & field, tennis, golf, etc.) — used to validate ingestion isn't silently
    dropping non-marquee sports

schools
  id, name, conference, division, city, state, lat, lng, website_url,
  cms_platform ("sidearm" | "presto" | "other")

venues
  id, name, school_id fk -> schools nullable (special-event venues may not belong to a single
    school, e.g. the Charles River), city, state, lat, lng, address
    -- city/state added 2026-08-04 to support state-level filtering ("games in RI"); state is
    -- normalized to a standard 2-letter USPS code (see normalizeState() - source feeds are
    -- wildly inconsistent: "MA", "Mass.", "Massachusetts" all show up for one school)
```

**Coverage-completeness check:** because it's easy for an adapter to only pick up the sports a
school's homepage highlights (usually football/basketball/hockey), periodically audit ingested
data against the `sports` reference table per school to confirm rowing, squash, sailing, etc.
aren't silently missing. This is a real failure mode to watch for, not a hypothetical.

**Sourcing special events:** these don't come from a single school's feed. Sources include
conference websites (NE10, NESCAC championship pages), event-specific sites (Head of the
Charles), and NCAA regional/postseason announcements. Expect this to require more manual
curation than the school-by-school pipeline — budget for it as a lighter-weight, human-in-the-
loop feed rather than trying to fully automate it in Phase 0.

### Deduplication approach
Same game often appears in both schools' feeds. Compute `dedupe_key` from normalized
(date + home_team + away_team) — **not** + venue, confirmed 2026-08-04: the two schools' own
feeds format venue differently for the same real game (home school's feed has the exact
building name, away school's feed often only has city/state), so including venue in the key
produces two different keys for one real game and defeats the whole point of deduping. Upsert
on that key rather than insert. When two sources disagree (e.g., postponement reflected on one
site before the other), prefer the most recently updated source and log the conflict — don't
silently drop data.

**Also confirmed 2026-08-04:** home_team/away_team must be the *resolved* canonical school name
(from the `schools` table), not the raw opponent text parsed off the feed — the two sides of the
same game often name each other differently even without formatting issues (Bowdoin's feed calls
its opponent just "Amherst"; Amherst's own feed calls itself "Amherst College"), which produces
the same two-different-keys-for-one-game problem venue did. See `findSchoolByName()` in
`src/ingestion/upsert.ts`. Also watch for promo suffixes feeds tack onto the opponent name itself
(e.g. `"vs Southern Connecticut State - Family Weekend"`) - strip anything after " - ".

### Legal/practical notes for ingestion
- Public schedule facts (date, opponent, venue) are low copyright/legal risk to aggregate.
- Strongly prefer the official iCal/RSS syndication endpoints over scraping HTML — they're
  explicitly published for this purpose.
- Respect robots.txt and rate limits on anything that does require scraping.
- Log every source's last-successful-fetch time; alert (even just a console warning at this
  stage) when a feed goes stale — feed breakage is the main operational risk for this product.

## 6. Working conventions for Claude Code sessions

- **Always check this file first**, then check `/docs` (if present) for anything more detailed
  before assuming context from a prior session that isn't written down here.
- **Update this file** when a real architectural or scope decision is made — don't let decisions
  live only in chat history.
- **Prefer boring, well-documented tools** over clever ones. This is a solo/small-team project;
  optimize for something the founder can maintain, not for engineering elegance.
- **Feed adapters are the highest-leverage code in this repo.** Spend disproportionate care here:
  write tests against real sample feed data, handle malformed/missing fields gracefully, and log
  failures loudly rather than failing silently.
- **Don't build ticketing checkout, accounts, or push notifications until Phase 0 validates
  demand.** If asked to build these prematurely, flag that they're out of Phase 0 scope per
  Section 3 and confirm before proceeding.
- **SEO is a first-class requirement**, not an afterthought — server-render event pages with
  proper metadata, since organic search is the likely primary acquisition channel (per the
  AllTrails/Bandsintown precedent in the business research).
- When in doubt about scope, re-read Section 3 before writing code.

## 7. Immediate next steps (first Claude Code session should do these, in order)

1. ✅ Scaffold the Next.js + TypeScript + Tailwind project. Done 2026-08-04, at
   `~/ne-sports-aggregator` (this repo).
2. ✅ Set up Postgres schema per Section 5 as a Drizzle migration (see Section 9 for the
   Drizzle-vs-Prisma decision), sized for ~110 schools from the start.
3. ⏳ Master school registry: only the 10-school validation batch is seeded so far
   (`src/db/seed/schools.ts`), not all ~110. Full registry is a later-phase task (Section 3
   step 2), not done today.
4. ✅ Validation batch CMS audit done by actually fetching each school's real schedule page —
   see Section 9 for what was found (materially different from what this section originally
   assumed).
5. ✅ SIDEARM feed adapter built and proven end-to-end (fetch → parse → normalize → dedupe →
   upsert), first against Amherst alone across 5 sports/genders/seasons, then generalized to
   all 10 validation-batch schools across every varsity sport each school's site lists. Real
   result: 4,400+ ingested games. See Section 9 for the exact feed mechanism found (not
   documented anywhere public) and known limitations.
6. ✅ Minimal "this weekend" list page built (`src/app/page.tsx`), server-rendered, querying
   real ingested data for the upcoming Fri-Sun window. No map, no filters yet (as planned).

**Not done today (next session):** PrestoSports adapter (blocked — see Section 9), full D3/D2/D1
rollout beyond the 10-school batch, special/multi-school events, map/filters, deployment to
Vercel, migration off local PGlite to managed Postgres.

## 8. Open questions to resolve early (don't guess silently — surface these)

- Final product/company name and domain
- ~~Drizzle vs Prisma for the ORM~~ — resolved, see Section 9.
- Whether NESCAC has a conference-level feed worth ingesting directly, or whether it's 11
  separate school feeds
- Hosting budget ceiling (affects choice of managed Postgres tier, etc.)
- **New (2026-08-04): Is PrestoSports actually still live for any New England school?** Every
  `*.prestosports.com` subdomain checked (Rivier, Simmons, and a non-NE control school) returned
  "Site in Maintenance Mode." Re-verify before committing real time to a PrestoSports adapter —
  it may be that PrestoSports schools have quietly migrated to SIDEARM or custom domains.
- **New (2026-08-04): How should multi-team meets (XC, track & field, golf tournaments,
  bowling) be modeled?** They don't fit the two-team `game` shape (no "vs"/"at" opponent, no
  single away team) — see Section 9. They're conceptually closer to `special_event` rows
  (multi-participant, no fixed home/away) but Section 3 explicitly deferred special-event
  sourcing. Today's adapter just skips them (logged, not silently dropped) rather than forcing
  them into a shape that doesn't fit. Needs a real decision, not a default.

## 9. Session log: 2026-08-04 (Day 1 — scaffold + validation-batch proof)

**ORM decision: Drizzle**, not Prisma. No query-engine binary (lighter serverless cold starts on
Vercel), schema defined close to raw SQL (easy to keep in sync with Section 5's schema, and
`uuid[]` for `participating_school_ids` is supported directly), migrations are plain readable
SQL a solo founder can hand-edit — matches Section 6's "boring, maintainable tools" principle.

**Local dev database: PGlite, not a locally-installed Postgres server.** This machine had no
Homebrew, Node, or Docker installed at session start, and the interactive sudo prompt Homebrew's
installer needs can't be supplied through a non-interactive tool session. Installed Node via nvm
(no sudo needed) and used `@electric-sql/pglite` (Postgres itself, compiled to run embedded, real
SQL/Drizzle-compatible, no server process or account) for today's local dev DB instead of
requiring a Neon/Supabase signup. Swap `src/db/client.ts` to a real Postgres connection string
when deploying — schema is unchanged either way. **Gotcha:** PGlite's WASM binary must not be
bundled by Turbopack/webpack or its internal path resolution breaks
(`ERR_INVALID_ARG_TYPE`); `next.config.ts` sets
`serverExternalPackages: ["@electric-sql/pglite"]` to fix this.

**SIDEARM has near-total real-world dominance in New England — Section 2's "roughly even split"
framing doesn't hold up.** Checked 24 real athletics sites across NESCAC, NE10, America East,
GNAC, MASCAC-adjacent, and CNE before picking the validation batch. All 24 were SIDEARM. This
isn't a scope problem (Section 5 already ranks SIDEARM first) but it means the validation batch
below is 100% SIDEARM, not a platform mix — see the new open question above on PrestoSports.

**The real SIDEARM iCal feed mechanism** (reverse-engineered from live network traffic, not
documented publicly anywhere found): every SIDEARM school exposes, per sport,
`https://<hostname>/calendar.ashx/calendar.ics?sport_id=<N>` (`.rss`/`.csv`/`.vcal` siblings
also exist). `sport_id` isn't guessable — it's embedded in each sport's own schedule page as
`associated_sport = {"id":N,"title":"...","gender":"m"|"f","global_sport_name_slug":"...",...}`.
The full varsity sport list per school is discoverable from the athletics homepage nav
(`href="/sports/<slug>/schedule"` links) — no hardcoded sport list needed, which is what makes
"every varsity sport, not just marquee" actually achievable per-school. Implementation:
`src/ingestion/sidearm/`.

**Validation batch actually used (10 schools, all confirmed live SIDEARM as of 2026-08-04):**
Amherst, Williams, Bowdoin, Middlebury, Tufts (NESCAC/D3); Bentley, Saint Anselm, Assumption
(NE10/D2); Vermont, Bryant (America East/D1). See `src/db/seed/schools.ts`.

**Real ingestion result:** 242 teams, 4,400+ games across all 10 schools, every varsity sport
each school's own site lists (rowing, sailing, squash, skiing, fencing, wrestling — not just
football/basketball/hockey) — directly proves Section 1's coverage-breadth differentiator isn't
just aspirational.

**Two real bugs found and fixed by inspecting actual ingested data (not by guessing):**
1. Season was initially derived from calendar month alone, which misclassified November
   basketball games (a winter sport) as "fall" since fall/winter seasons overlap in
   Nov. Fixed: season is now derived primarily from the sport's `typical_season` in the sports
   reference table, with month-based logic only as a fallback for sports not in the table.
2. Away-game venues were showing the bare state abbreviation ("MA", "NY") as the venue name.
   SIDEARM's `LOCATION` field is `"City, ST, Venue Name"` for home games but often just
   `"City, ST"` for away games (the ingesting school's feed doesn't always know the opponent's
   building name) — a naive 3-part split misread the 2-part case. Fixed in `parseLocation()`.

**One real dedupe design flaw found via visual inspection of the rendered list page (not
caught by the "run ingestion twice" test alone):** the same real game was appearing twice when
both participating schools were in the batch (e.g. "Middlebury at Bowdoin" hockey), because the
two schools' own feeds report the venue differently (home school's feed: exact building name;
away school's feed: city/state only, per the bug above) — so the venue component of
`dedupe_key` produced two different keys for one real game. **Fixed: `dedupe_key` now excludes
venue entirely** — date + normalized home + normalized away is the actual unique identity of a
game; venue is stored as an attribute but isn't part of the identity key. This directly
contradicts Section 5's original dedupe formula (`date+home+away+venue`) — that formula doesn't
survive contact with real, inconsistently-formatted source data. Section 5 should be corrected
to drop venue from the key in the next edit pass.

**Known limitation, not yet fixed:** meets/invitationals (cross country, track & field, golf,
bowling) publish `SUMMARY` text without a "vs"/"at" opponent (e.g. "NESCAC Championships",
"Panther Invite") since they're multi-team, not head-to-head. Today's adapter correctly logs
and skips these (loudly, per Section 6's "log failures loudly" principle) rather than forcing
them into the two-team `game` shape. See the new open question above.

**Known limitation, not yet fixed:** opponents outside the 10-school batch (e.g. Amherst's real
opponents Bates, Hamilton, Colby) resolve to `home_team_id`/`away_team_id` = `null` and render
as "TBD" on the list page — accurate to today's actual coverage (10 of ~110 schools), but a
rough UX edge once more of the batch is seeded and cross-references improve.

## 10. Session log: 2026-08-04 (continued) — date/calendar navigation + filters

Added a calendar/month view (Today / This Weekend / Next 7 Days / any date via a native date
picker, with Prev/Next month navigation once in month view) and five filters — **Division,
State, School, Sport, League** — per user request, explicitly scoped as "the next phase of
development." All server-rendered via query params (`range`, `date`, `division`, `state`,
`school`, `sport`, `league`) — no client JS, forms/links only, per Section 6's SEO-first
requirement. See `src/app/page.tsx`, `src/db/queries.ts`.

**Filter semantics (deliberate, not arbitrary):**
- **State** matches the venue's location (`venues.state`), not either participating school's
  home state — the product question is "what's happening *in* this state," which a venue
  answers and a school's mailing address doesn't (e.g. a Bowdoin sailing regatta hosted in
  Newport, RI should show up under "RI" even though Bowdoin itself is a Maine school).
- **League** and **School** match either side of the matchup (`OR` across home/away) — a game
  is "an NESCAC game" or "an Amherst game" regardless of which side Amherst is on.
- **Division** filters on the event's own stored `division` column (not an OR-join) — see
  Section 5's schema note on why that column reflects whichever seeded school's feed the row
  came from, not a derived property of both sides.

**Operational rule learned the hard way — PGlite does not support concurrent multi-process
access to its data directory.** Running the ingestion script while `npm run dev` was also open
against the same `.pglite/` directory corrupted it badly enough that even a bare `select * from
schools` crashed the WASM engine (`RuntimeError: Aborted()`) in every subsequent process,
including after the dev server was stopped — the corruption was already on disk, not a live lock
contention issue. **Rule: always stop the dev server (or any other process touching `.pglite/`)
before running `scripts/migrate.ts`, `scripts/seed.ts`, or `scripts/ingest.ts`.** Recovery when
this happens is just `rm -rf .pglite` and rebuild (migrate → seed → ingest --all) — the data is
fully reproducible from source, not a real loss, but it costs a full re-ingestion cycle (all 10
schools, ~5-10 min) each time, so avoiding it in the first place is worth the discipline. This
stops being a concern once the project moves to a real Postgres server (Section 8 still has
"managed Postgres" as a deferred item) since Postgres is designed for concurrent connections;
this is specifically a PGlite-for-local-dev limitation.

**Real data-quality bugs found by testing the filters against live data (not by guessing) —
all fixed, all required a full re-ingest to take effect:**
1. `venues.state` was frequently garbage (e.g. `"CONN / DAYTON ARENA"` instead of `"CT"`) —
   SIDEARM `LOCATION` fields use two different real formats across sites/sports: `"City, ST,
   Venue"` (comma-comma) and `"City, ST / Venue"` (comma then a slash, no second comma). Only
   the first was handled. Fixed in `parseLocation()`; state values also normalized to standard
   USPS 2-letter codes via a full state-name/abbreviation alias table (`normalizeState()`) since
   raw feeds mix `"MA"`, `"Mass."`, `"Massachusetts"` for the same school. A handful of exotic
   Nordic-skiing/tournament-round-suffix outliers remain unparsed (e.g. `"CRAFTSBURY OUTDOOR"`)
   — low-impact, not worth chasing further today.
2. Venue display text duplicated the state (e.g. "Durham, NH, NH") when no specific building
   name was known — the fallback venue name used to bake in `"city, state"` redundantly on top
   of the separately-displayed state field. Fixed to just use the city as the fallback.
3. "Track & Field" and "Track and Field" showed as two separate Sport filter options because
   sport-name normalization didn't account for the ampersand variant some schools use. Fixed in
   `sportNameFromTitle()`.
4. Two different real dedupe bugs (see Section 5's dedup note above) surfaced specifically by
   *looking at* the filtered results, not by the "run ingestion twice" test alone — that test
   only catches a script re-ingesting identical data against itself, not two different schools'
   feeds disagreeing about the same shared game.

**Net result after all fixes:** 4,164 events (down from 4,281 pre-fix — the difference is real
duplicate games that now correctly collapse to one row).

## 11. Session log: 2026-08-04 (continued again) — New England scope + city display

Per user feedback, tightened the filters further:
- **State options are now a hardcoded whitelist** (`NE_STATES` in `src/db/queries.ts`:
  CT/ME/MA/NH/RI/VT) instead of `DISTINCT venues.state` - the distinct-values approach
  surfaced the exotic unparsed outliers (`"CRAFTSBURY OUTDOOR"` etc.) directly in the
  dropdown. The whitelist sidesteps that entirely rather than chasing every parsing edge
  case.
- **The event query now unconditionally excludes anything outside New England** - not an
  optional filter, a permanent `WHERE venues.state IN (CT,ME,MA,NH,RI,VT)` in
  `getFilteredEvents()`. This matches the product's actual scope (Section 1/2): an NE
  school's away game in Pennsylvania or Florida isn't "a college sporting event near me."
  This is a display/query-layer decision, not an ingestion-time one - out-of-region events
  are still stored (harmless, and keeps the door open if that scope decision changes
  later), just never shown. October 2026 went from 427 to 357 games after this landed.
- **Cards now show the venue's city**, not just the building name and state (e.g. "Cole
  Field, Williamstown, MA" instead of just "Cole Field, MA"). See `formatLocation()` in
  `src/app/page.tsx` - it skips the venue-name segment when there's no real building name
  known and the fallback venue name already equals the city (avoids "Williamstown,
  Williamstown, MA").

No re-ingestion needed for this pass - `venues.city`/`venues.state` were already being
captured and stored; this was purely a query/display change.
