# PROJECT: Game Day New England — New England College Sports & Campus Events Aggregator

> This file is read automatically by Claude Code at the start of every session in this repo.
> Keep it current — when a real decision is made in chat or in code, update this file so the
> next session doesn't relitigate it. Treat it as the single source of truth for context,
> not as documentation to write once and ignore.
>
> **2026-08-05 update:** Section 0 below layers in the business/product strategy from
> `GDNE_Business_Plan_v2_5.docx` and `GDNE_Personas.docx` (both companion documents, not
> checked into this repo as source — treat this section as their engineering-facing digest).
> Sections 1–17 are the original Day 1 spec and execution log, **left intact** — they're the
> actual ground truth for what's built. Section 0 exists to reconcile the two: what the full
> business plan wants, what Day 1 actually shipped, and what that implies for schema/roadmap
> decisions going forward. Read Section 0 first for orientation, then treat Sections 1–17 as
> before.

---

## 0. Business Plan v2.5 & Personas — Strategic Layer (added 2026-08-05)

### 0.1 What changed vs. the Day 1 framing

The Day 1 opening prompt and original Sections 1–3 describe GDNE as a **discovery product**:
a Kayak-for-college-sports schedule aggregator. That's still accurate as far as it goes, but
it's now understood to be **one of four surfaces on top of a shared data asset**, not the whole
company. Per Business Plan v2.5:

> GameDay New England is the discovery, sponsorship, and NIL platform for the densest
> college-sports market in America — and the asset it builds is a **permissioned, addressable
> fan graph** that no school, conference, or national platform owns. Discovery, sponsorship
> commerce, NIL, and content are applications that run on that graph. The graph is the company.

**Practical implication for this repo:** the `events`/`teams`/`schools`/`venues` schema built on
Day 1 is the **event supply side** of the graph — necessary but not sufficient. It has no
representation yet of the *demand side* (fans, their permissioned follow/registration data) or
the *commerce side* (sponsors, athletes-as-individuals, NIL deals). See 0.4 for the specific
schema gap this creates and 0.5 for how it maps onto the plan's phased "Gates."

### 0.2 The four surfaces (one spine)

All four are clients of the same event spine and (eventually) the same fan graph:

| # | Surface | Who it's for | Status in this repo |
|---|---|---|---|
| 4.1 | **Consumer app & website** | Fans — "what's happening near me this weekend" | **Built (Day 1).** This is the whole repo so far: schedule ingestion → list page with date/division/state/school/sport/league filters. No registration/accounts yet (out of scope per Section 6). |
| 4.2 | **School portal** | Athletic departments & SIDs — free forever; schedule-sync + fan analytics + revenue share opt-in | Not started. Would need auth, per-school write access to schedule/roster data, and an analytics read layer over the events table. |
| 4.3 | **Sponsor dashboard** | Regional brands (Tier 1) down to local businesses (Tier 3, self-serve) — the "collective buy" across any set of schools | Not started. No `sponsors`, `campaigns`, `offers`, or `redemptions` entities exist yet. |
| 4.4 | **NIL marketplace** | 49,998 NE student-athletes — compliant, tracked deal flow, 15% take rate | Not started. **No individual-athlete entity exists in the schema at all** — `teams` is currently the finest grain (school+sport+gender), not `athlete`. This is the biggest structural gap between what's built and what NIL requires — see 0.4. |

The plan is explicit that discovery (4.1) is the front door and the least monetized surface on
its own — its job is to seed the fan graph that the other three surfaces monetize. That framing
is useful context for why Day 1 prioritized breadth of real ingested data (every varsity sport,
not just marquee) over any monetization feature: a thin, accurate graph is worth more long-term
than a flashy but narrow one.

### 0.3 The agentic operating model — mapped to what's actually built

The plan's cost model depends on five supervised AI agents replacing what would otherwise be a
much larger ops team. Mapping plan language to this repo's actual code:

| Plan's agent | What it does per the plan | This repo |
|---|---|---|
| **Schedule & Results Agent** | Ingests Sidearm/Presto nightly, normalizes, flags conflicts for human review | **Partially built.** `src/ingestion/sidearm/` is a real, working instance of this agent's SIDEARM half — but it's a one-shot script run by a human (`ingest.ts --all`), not a nightly scheduled/autonomous job yet, and it doesn't yet "flag conflicts for human review" as a distinct workflow (errors are logged, not routed). Presto half is blocked (Section 8/9 — PrestoSports appears dead in New England). |
| **Content Agent** | Drafts previews/recaps/social from structured data | Not started. |
| **Sponsor Match & Onboarding Agent** | Scores local businesses against fan-graph geography/affinity | Not started (no sponsor or fan-graph data exists to score against). |
| **NIL Compliance Agent** | Checks deals against school policy + state law | Not started (no NIL marketplace, no athlete entities). |
| **Attribution & Reporting Agent** | Assembles sponsor ROI + school analytics continuously | Not started. |

Worth naming explicitly: everything built on Day 1 is infrastructure for agent #1 only, and even
that is currently human-triggered rather than autonomous. That's fine for a Day 1 proof — but if
a future session is asked to "build the next agent," the honest starting point is "zero of the
other four have any data model to operate on yet," not "extend the existing agent pattern."

### 0.4 Schema gap: the fan graph and NIL athletes don't exist yet

Section 5's schema (`events`, `teams`, `sports`, `schools`, `venues`) is entirely **supply-side**
— it describes what's happening and where, not who's watching or who's playing as an individual.
Two gaps matter most if/when the roadmap moves past discovery:

1. **No fan/user entity.** The plan's central asset is "a fan registers — free — to follow a
   school, a team, or an athlete," and that registration is what becomes the permissioned,
   addressable graph sponsors and schools pay for. There is currently no `users`/`fans` table,
   no follow/registration relationship, and no consent ledger. This is not a Day 1 omission —
   accounts were explicitly out of scope (Section 3/6) — but it's the single biggest build item
   standing between the current repo and Gate G0 as the plan defines it (G0 requires "consent
   ledger operational," not just the schedule data).
2. **No individual-athlete entity.** `teams` is `school_id + sport + gender` — a roster
   aggregate, not a person. The NIL marketplace (4.4) needs athletes as first-class rows with
   their own profile, follower/social data, deal history, and compliance status. Adding this
   later means either a new `athletes` table with a `team_id` fk, or promoting roster data (which
   SIDEARM feeds don't currently expose in the calendar/ICS ingestion path this repo uses —
   rosters are a separate SIDEARM data source, not yet investigated) into the schema.

Neither gap needs to be closed now — Section 3's sequencing (validation batch → full D3 rollout
→ D2/D1 → ongoing) is still the right execution order for the discovery surface specifically.
But when a future session is asked to start on the school portal, sponsor dashboard, or NIL
marketplace, start by re-reading this subsection rather than assuming the existing schema
extends cleanly — it doesn't, by design (Section 5 was scoped to games/events, not people).

### 0.5 Gates vs. actual progress

The plan tracks readiness via capability gates rather than dates (Section 13 of the plan). Mapping
Day 1's actual state onto them:

| Gate | Green means (per plan) | Actual state as of Section 17 (this repo) |
|---|---|---|
| **G0 — Spine** | Data spine live; Schedule Agent ingesting **all 101 schools**; consent ledger operational | **Partial.** 25 of 101 schools ingested (628 teams, 9,151 events), zero ingestion errors, SIDEARM adapter proven end-to-end including tickets/streaming metadata. Consent ledger: not started (see 0.4). Presto adapter: blocked. |
| **G1 — Capital** | SAFE closed; syndicate lanes assigned | Outside this repo's scope — founder/business-side item. |
| **G2 — Cohort** | Year 1 cohort signed (34 schools, one-third of region) | 25 schools *ingested*, not the same as 34 schools *signed/onboarded* — signing implies the school-portal relationship (4.2), which doesn't exist yet. Don't conflate "we can technically ingest a school's feed" with "the school is a GDNE partner" when reporting progress against this gate. |
| **G3 — Commerce** | Sponsor dashboard self-serve; first Tier 1 signed | Not started. |
| **G4 — Proof** | One full season of attribution/retention data; AD Summit #1 held | Not applicable yet. |
| **G5 — Scale** | Cash-positive full year | Not applicable yet. |

The practical read: this repo is building the substrate for G0 and is meaningfully ahead on the
*event-data* half of G0, meaningfully behind on the *consent-ledger* half, and hasn't touched
G1–G5 at all (nor should it yet — those are correctly sequenced after G0 per the plan).

### 0.6 Personas — condensed, for feature-scoping discipline

Full detail lives in `GDNE_Personas.docx` (11 personas + a persona×surface×revenue map). The
plan's own design test is worth repeating here since it's directly useful for scoping future
Claude Code sessions: **"name which persona a feature serves and which of their KPIs it
moves."** If a proposed feature can't answer that, that's a signal to question the feature, not
just document it.

Quick-reference table (condensed from the personas doc):

| Persona | Primary surface | What GDNE gives them | Relevant to current repo? |
|---|---|---|---|
| D3/D2/D1 Athletic Director | School Portal | Free portal + rev share; fan analytics they've never had; schedule-sync saves SID hours | Not yet — no portal/auth exists |
| SID / Athletic Communications Director | School Portal (daily) | Schedule-sync (one update, syncs everywhere); Content Agent drafts recaps | Indirectly — this repo's ingestion *replaces* the manual re-keying pain this persona has, but there's no portal UI for them to see/control it yet |
| Small business owner ("Main Street Margaret") | Sponsor Dashboard | Attributed local reach starting at $300–500 (Tier 3, self-serve) | Not yet |
| State brand marketer | Sponsor Dashboard (Tier 2) | Statewide category exclusivity, one contract across a state's schools | Not yet |
| Regional brand VP | Sponsor Dashboard (Tier 1) | Region-wide founding partnership, NIL portfolio programs | Not yet |
| Student-athlete | NIL Marketplace | Real local deals sized to actual reach, compliance handled | Not yet — no athlete entity (0.4) |
| **Fan/consumer ("Saturday Seeker")** | **Consumer app/web** | **"What's happening near me" in one glance** | **This is the persona Day 1 actually built for.** The list page (Section 7 item 6) with date/state/division/sport/league filters directly targets this persona's stated need. No registration/alerts yet. |
| Alumni professional | Consumer app (diaspora) | Follow-from-anywhere, weekly newsletter | Partially adjacent — nothing diaspora-specific built, but the same event data would power it |
| Student ambassador | All (operator role) | Title, playbook, registrations-driven KPIs | Not applicable to this repo (an ops/people program, not a build item) |
| Recruit household | Consumer + camps | Program discovery, camp listings | Not built (Prospect Mode is explicitly Y3+ per the plan) |
| Conference commissioner | Portal roll-up | Conference-wide packages, championship inventory | Not built; also directly conflicts with current out-of-scope note on special/multi-school events (Section 3) |

**Takeaway for this repo specifically:** Day 1 built exclusively for the Fan/Consumer persona,
which is the correct and intentional starting point (it's the top of the funnel that seeds the
graph everything else depends on). Every other persona is currently unserved by any code in this
repo — that's expected at this stage, not a gap to rush to close.

### 0.7 New open questions from the business plan (append to Section 8's list, don't replace it)

- ~~Consent/registration model~~ — resolved 2026-08-05: built as a stateless double opt-in,
  school-level-only follow mechanism. See Section 20 for the full design and implementation.
- **Athlete entity design:** does an `athletes` table get added under the existing `teams` model,
  and does that require a new SIDEARM roster-page scraping/ingestion path distinct from the
  calendar.ashx mechanism Section 9 already reverse-engineered? Unexplored.
- **Special/multi-school events, revisited:** Section 3 defers these, but the plan's conference
  commissioner persona and Tier 2 conference packages depend on exactly this event type
  (championship inventory). Still correctly out of scope for now — noting the dependency so a
  future session doesn't have to re-derive why it matters when conference-level GTM (plan
  Section 7.4) comes up.
- **25-of-101 vs. 34-of-101 (Year 1 cohort target):** the plan's Year 1 activation bar is 34
  schools *signed*. This repo's 25 *ingested* schools are a useful head start on the technical
  side of that bar but aren't the same commitment — worth being precise about this distinction
  in any future status reporting to avoid overstating GTM progress based on ingestion progress.

### 0.8 Feasibility assessment & recommended next step (added 2026-08-05)

A founder review of Section 0 raised the obvious next question — is the full plan feasible, and
does the current build actually match it? Worth recording the answer plainly so it doesn't get
re-litigated from scratch next session:

**The discovery product (Surface 1) is de-risked; the other three are not.** 25 schools, 9,151
real events, zero ingestion errors is a working pipeline against messy real-world data, not a
mockup. It's also low-regulatory-risk and cheap to run. That's the most solid piece of anything
in Section 0 by a wide margin, and it's reasonable to keep liking it as the anchor of the
product.

**The core mismatch: the plan's central asset doesn't exist yet, not even passively.** The
business plan's thesis is "the graph is the company" — the whole valuation and revenue story
depends on a permissioned, addressable fan-registration layer. Per 0.4, there is currently **no
registration, no follow mechanism, no consent ledger** — the product today is a stateless list
page. The thing the plan says the company *is* isn't being built by anything currently in this
repo, even as a side effect.

**Feasibility by surface, roughly ordered easiest → hardest:**
- **School portal** — moderate. Mostly auth + dashboards over data already in the schema.
  Believable as a focused multi-week/couple-month build.
- **Sponsor dashboard** — real ad-tech-lite build (attribution, self-serve campaigns, redemption
  tracking) *plus* an actual Tier 1/2 sales motion that no code can substitute for. Software is
  the smaller half of this problem.
- **NIL marketplace** — hardest by a wide margin. State-by-state compliance, real legal liability
  if the compliance agent gets something wrong, payment rails, trust dynamics — closer to a
  fintech/marketplace build grafted onto a sports app than an extension of the discovery product.

**The plan is self-aware about the risk, which is a good sign, but the numbers still rest on
unproven bets.** Section 10.1's own Class A/B/C assumption discipline labels things like "sponsors
will pay attributed prices" and "D2/D3 fans will register with a third party" as **Class B,
unproven** — not Class A fact. The Year 5 $7.1M figure is a driver-modeled output of those Class B
assumptions, not a tested result. That's honest framing on the plan's part, but it means the
number shouldn't be treated as load-bearing yet.

**Complexity check against the plan's own gating logic:** the plan's gate structure (G0→G5,
capability-gated not calendar-gated) is the right instinct, but per 0.5 it isn't actually being
followed by the current build path — nothing in flight moves the repo toward G0's "consent ledger
operational" requirement. Five autonomous agents + four surfaces + NIL compliance + a sponsor
sales motion, all in "Year 1," is too much surface area for a sole founder + part-time COO +
ambassadors to run concurrently. The fix isn't dropping the ambition, it's actually respecting the
gates: don't start G3/NIL-adjacent work before G0 is genuinely green (consent ledger included, not
just event data).

**A factual discrepancy worth reconciling in the plan itself, not just carrying silently:** the
plan's data-feasibility narrative assumes something close to a SIDEARM/PrestoSports split.
Section 9 of this file already found PrestoSports dead across every New England school checked.
Not fatal to the plan (SIDEARM alone covers the region), but it's a real place where this repo's
findings should correct the plan document, not sit unreconciled across two sources of truth.

**Recommended next build step (opinion, not yet started, flagged here for a future session to
pick up or override):** before touching the sponsor dashboard or NIL marketplace, build the
cheapest possible version of the registration/follow mechanism on top of the existing discovery
product — "follow your team, get alerts." This is the one thing that (a) actually starts the fan
graph the whole plan depends on, and (b) tests the Class B assumption ("will fans register with a
third party") with real behavior instead of a financial model. If people won't register for free
game alerts, the sponsor and NIL layers don't have a foundation to stand on regardless of how well
they're built — better to learn that early and cheaply than after the sponsor dashboard is built.
This is a genuinely new entity (users/follows/consent, per 0.4), not an extension of the existing
schema — scope it as such.

---

## 1. What this is

A geography-and-date-first discovery product that answers: **"What college games or campus
events are happening near me this weekend?"** — for New England families, alumni, and fans.

The Kayak analogy: Kayak doesn't sell flights, it aggregates fragmented airline inventory into
one comparison/discovery layer and profits from being the decision layer. We do the same thing
for ~130 college athletic programs across ME/NH/VT/MA/RI/CT, whose schedules currently live
scattered across ~130 separate school websites with no unified consumer-facing view.

> **Business Plan v2.5 framing (see Section 0):** this discovery product is Surface 1 of 4
> (consumer app/website) on top of a shared event spine and, eventually, a permissioned fan
> graph. Nothing below in Sections 1–17 needs to change to remain true — it's still an accurate
> description of what this surface does — but it should now be read as "the front door," not
> "the whole product."

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

> **2026-08-05 note:** Section 0.1–0.2 supersede this section's monetization list with the fuller
> Business Plan v2.5 revenue architecture (Tier 1/2/3 sponsorship, NIL marketplace, data &
> analytics, school services — see plan Section 6 for exact Y1→Y5 figures). This section is kept
> as-is because it's still directionally correct and was the framing Day 1 was actually executed
> against; don't silently delete the history of what the team believed on Day 1.

## 3. Scope: full New England D1–D3 (~110 four-year programs)

**Target coverage, all six states, no permanent conference limitation:**
- ~24 D1 programs (America East, Hockey East, Ivy League, CAA, MAAC, Patriot, NEC, etc.)
- ~10 D2 programs (nearly all Northeast-10: Bentley, Assumption, AIC, Saint Anselm, SNHU,
  Franklin Pierce, Southern Connecticut, Bridgeport, Post, Saint Michael's)
- ~70-75 D3 programs across NESCAC, Little East, Conference of New England (ex-CCC), MASCAC,
  GNAC, NEWMAC, North Atlantic Conference

This is the real target — build and design for this scale from the start (schema, ingestion
architecture, UI) rather than something that has to be re-architected later.

> **Business Plan v2.5 cross-check:** the plan's federal EADA-verified count is **101 NCAA
> institutions** (23 D1 · 11 D2 · 67 D3) — close to but not identical to the ~110 estimate
> above (this section's numbers predate the EADA pull described in the plan's Section 2). Prefer
> the EADA-sourced 101/23/11/67 breakdown when precision matters (e.g., reporting progress
> against the plan's Year 1/2/3 activation targets of 34/67/101 schools); the ~110 figure here
> is fine for general engineering-scale planning (schema sizing, etc.) where the exact count
> doesn't change the decision.

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

> **2026-08-05 note:** this sequencing (validation batch → full D3 → D2/D1 → ongoing) lines up
> well with the plan's own Year 1/2/3 activation ramp (34 → 67 → 101 schools), which is a good
> sign the original engineering plan and the later business plan independently converged on the
> same order of operations. Keep using this section's sequencing for *ingestion* order; use the
> plan's Section 7.1 ("the dependence list" — the 33 EADA-flagged schools where athletics is
> ≥25% of enrollment) as an additional signal for *which* schools to prioritize within each phase
> once GTM/school-portal work starts, since those are the schools with the fastest AD buy-in.

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

> **2026-08-05 note (see Section 0.4 for full discussion):** this schema is entirely
> supply-side — events, teams-as-rosters, schools, venues. It has **no** representation of fans
> (registration/follow/consent), sponsors, or individual athletes. That's correct for what
> Day 1 was scoped to build, but don't assume this schema "just extends" when a future session
> is asked to build the school portal, sponsor dashboard, or NIL marketplace — each of those
> needs genuinely new entities, not new columns on existing ones.

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
- **New (2026-08-05): when in doubt about *whose problem a feature solves*, re-read Section 0.6**
  (personas) and name the persona and KPI before building. If a feature request doesn't map to
  any of the 11 personas, flag that explicitly rather than building it speculatively.

## 7. Immediate next steps (first Claude Code session should do these, in order)

1. ✅ Scaffold the Next.js + TypeScript + Tailwind project. Done 2026-08-04, at
   `~/ne-sports-aggregator` (this repo).
2. ✅ Set up Postgres schema per Section 5 as a Drizzle migration (see Section 9 for the
   Drizzle-vs-Prisma decision), sized for ~110 schools from the start.
3. ⏳ Master school registry: 25 of ~110 schools are seeded and fully ingested
   (`src/db/seed/schools.ts`) — the original 10-school validation batch plus 15 more added
   2026-08-04 (14 in Section 12, Hamilton College resolved and added in Section 13). Live in the
   local DB as of Section 13: 25 schools, 628 teams, 9,151 events, zero ingestion errors. Full
   registry is still the later-phase goal (Section 3 step 2).
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

> **2026-08-05 note:** per Section 0.5, this list is entirely G0-scoped (the event data spine).
> Nothing in this list touches G2 (school portal/school signing), G3 (sponsor dashboard), or the
> NIL marketplace — that's expected and correct sequencing, not a gap in the plan.

## 8. Open questions to resolve early (don't guess silently — surface these)

- ~~Final product/company name~~ — resolved 2026-08-04: **Game Day New England**. Repo:
  https://github.com/mattwerner-sudo/game-day-new-england. Domain still open.
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
- ~~Is Hamilton College in scope?~~ — resolved 2026-08-04: **add it to the schools table.**
  Hamilton is NESCAC but its campus is in Clinton, NY, outside the six-state New England
  geography Section 1/2 define. The two considerations from the original open question (Section
  11's venue-state filter is unconditional and already hides Hamilton's own NY home games either
  way; vs. adding an out-of-region school row being a scope call) resolve cleanly once you notice
  the filter makes it a one-sided decision — there's no way to leak out-of-region *display* by
  adding Hamilton, only a fix to the "TBD" opponent bug (Section 7) for its away games at
  in-region NESCAC schools. Seeded in `src/db/seed/schools.ts`, confirmed live SIDEARM at
  `athletics.hamilton.edu`. Not yet migrated/ingested (source-file-only change, per Section 10's
  PGlite concurrency rule — dev server was running).
- **New (2026-08-05, from Business Plan v2.5 — see Section 0.7 for full list):** consent/fan
  registration model; athlete-entity schema design for NIL; how conference-championship
  inventory (special events) intersects with the plan's conference-commissioner GTM channel;
  precision about "25 schools ingested" vs. "34 schools signed" when reporting progress.

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

## 12. Session log: 2026-08-04 (continued again) — batch 2: staging the next 14 schools

Per Section 3's "Full D3 rollout" step, researched and staged the next batch of schools beyond
the original 10-school validation batch — **source file only** (`src/db/seed/schools.ts`); did
**not** run `migrate.ts`/`seed.ts`/`ingest.ts` against the DB, since the dev server was running
against the same `.pglite/` directory and Section 10 already documented what concurrent access
does to it. The schools below exist in the seed array but are not yet in the actual database.

**Method:** same fingerprint as the original batch (Section 9/CLAUDE.md header) — fetched each
candidate school's real athletics homepage and grepped for the
`dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/...` asset domain and/or a "Sidearm Sports"
footer attribution, via WebFetch. Where WebFetch was blocked, fell back to WebSearch rather than
guessing.

**14 schools added, all confirmed live SIDEARM by direct WebFetch fingerprint on 2026-08-04:**
- **NESCAC (5 of 6 candidates):** Wesleyan, Colby, Bates, Trinity, Connecticut College. (Hamilton
  College was the 6th candidate — confirmed live SIDEARM same as the rest, but *not* added; see
  the open Hamilton geographic-scope question in Section 8.)
- **Little East (6 of 10 sampled):** UMass Dartmouth, Keene State, Plymouth State, Rhode Island
  College, University of Southern Maine, Eastern Connecticut State.
- **Northeast-10 (3 of 5 sampled):** American International College, Saint Michael's College,
  Southern Connecticut State — picked over the other 2 confirmed-live candidates (Franklin
  Pierce, SNHU) purely for state diversity, since Saint Anselm (NH) is already in the batch-1
  seed and MA/CT/VT weren't yet represented in the Northeast-10 slice.

**Not added — researched but skipped, with reasons (mirrors how Section 8 documented the
PrestoSports maintenance-mode finding rather than silently dropping it):**
- **Bridgewater State, Framingham State, Salem State, Westfield State** (Little East candidates)
  — WebFetch returned **HTTP 403** on all four real athletics domains (`bsubears.com`,
  `fsurams.com`, `salemstatevikings.com`, `westfieldstateowls.com`), most likely bot/WAF
  protection rather than the sites being down. WebSearch found circumstantial evidence for
  SIDEARM on all four (an S3 `sidearm.sites/westfieldstateowls.com/...` document link for
  Westfield State; general references for the others) but nothing meeting this session's actual
  fingerprint bar (cloudfront asset domain or footer attribution observed directly). Left out
  rather than added on circumstantial evidence — re-check next session, ideally with a
  real-browser fetch instead of the sandboxed WebFetch tool, which several 403s suggest is being
  fingerprinted and blocked.
- **Franklin Pierce University, Southern New Hampshire University** (Northeast-10 candidates) —
  both fully confirmed live SIDEARM (`fpuravens.com`, `snhupenmen.com`), not skipped for any
  data-quality reason, purely deprioritized for the reason above (NH/Northeast-10 already
  represented by Saint Anselm). Good candidates to add first in the next NE10 pass.
- **Hamilton College** (NESCAC candidate) — confirmed live SIDEARM (`athletics.hamilton.edu`),
  not skipped for a data-quality reason either. Held out because its campus is in Clinton, NY,
  outside the six-state New England scope Section 1/2 define — see the open question added to
  Section 8. This is a scope call for the founder, not something to resolve silently in a seed
  data commit.

**Net result of this session:** `SCHOOLS_SEED` in `src/db/seed/schools.ts` now has 24 schools
(10 + 14), still source-only pending a migrate/seed/ingest run in a future session when the dev
server can be safely stopped first (Section 10's rule). 4 Little East schools and 1 NESCAC
school (Hamilton) were investigated and intentionally not added, for the reasons above.

## 13. Session log: 2026-08-04 (continued again) — Hamilton resolved, batch 2 ingested, real
schema bug found and fixed

**Hamilton College scope question resolved: add it.** Section 8/12 flagged this rather than
guessing. The resolution: Section 11's venue-state `WHERE` filter is unconditional, so Hamilton's
own home games (venue = Clinton, NY) will never display regardless of whether Hamilton is seeded
— the only real effect of adding it is that its *away* games at other NESCAC schools (venue =
New England) resolve to a real opponent name instead of the "TBD" gap from Section 7. No scope
leakage either way, so this wasn't actually a coin-flip once traced through the filter logic.
Added to `src/db/seed/schools.ts`, confirmed live SIDEARM at `athletics.hamilton.edu`.

**A real, previously-latent schema bug was found and fixed while running this batch's
migrate/seed/ingest cycle: `schools` had no unique constraint on `name`.** `sports.name` has
`.unique()` (`src/db/schema.ts`); `schools.name` never did. This had never surfaced before
because every prior seed run happened against a freshly-migrated, empty `.pglite` — this session
was the first time `seed.ts` ran against a `.pglite` directory that already had the original 10
schools loaded from a prior session. `db.insert(schools).values(...).onConflictDoNothing()` had
no unique index to conflict against, so it silently inserted all 25 seed rows again on top of the
existing 10, producing **35 school rows (10 duplicated), which cascaded into duplicate `teams`
rows** for those 10 schools (teams' own unique index is on `(schoolId, sport, gender)`, and the
duplicate schools had distinct `schoolId`s, so it didn't catch this).

**Fix:** added `.unique()` to `schools.name` in `src/db/schema.ts` (matching the existing
`sports.name` pattern), generated the migration (`drizzle/0002_omniscient_the_anarchist.sql`:
`ALTER TABLE schools ADD CONSTRAINT schools_name_unique UNIQUE(name)`), then followed Section 10's
already-documented recovery playbook — `rm -rf .pglite` and rebuilt clean from source
(migrate → seed → ingest --all) rather than hand-patching the duplicate rows, since the playbook
already established this is fast and lossless. **This constraint is now permanent protection
against the same class of bug recurring** — any future re-seed against a populated DB will now
correctly no-op on already-present schools instead of silently duplicating them.

**Final clean state after rebuild:** 25 schools, 19 sports, 628 teams, 9,151 events, zero
ingestion errors across all 25 schools' full varsity rosters (confirmed via `scripts/inspect.ts`
and by grepping the ingest log for "error" — none found). Verified live in the browser: filters
list all 25 schools and all 4 leagues (America East, Little East, NESCAC, Northeast-10);
September 2026 shows 820 real games including correctly cross-referenced games between two
batch-2 schools (e.g. "Trinity College at Connecticut College" resolves both sides, not just one).

**Also fixed:** two leftover UI strings in `src/app/page.tsx` still hardcoded "10-school
validation batch" in the empty-state and results-count copy — updated to "25-school batch" to
match current reality.

**Not done this session:** PrestoSports adapter (still blocked, unrevisited), the remaining
~85 D1-D3 schools beyond this batch, special/multi-school events, map view, deployment to Vercel,
migration off local PGlite to managed Postgres. Good next-session candidates for the next
Northeast-10 slice: Franklin Pierce and SNHU (already confirmed live SIDEARM in Section 12, just
deprioritized for state diversity last time).

## 14. Session log: 2026-08-04 (continued again) — deployment prep: `src/db/client.ts` now
driver-agnostic

Prepped the codebase for the Vercel + managed-Postgres path Section 4 already decided on, without
actually deploying anything (no accounts created, no hosted Postgres provisioned — those are
founder actions, not something this session could do).

**`src/db/client.ts` now branches on `DATABASE_URL`:** set → real Postgres via the `postgres`
package (`drizzle-orm/postgres-js`); unset → local embedded PGlite, unchanged from before. This
is exactly the "swap to a real Postgres connection string when deploying" step Section 9 already
flagged as pending. Locally, with no `DATABASE_URL` set, behavior is unchanged — verified in the
browser, dev server still serves all 25 schools correctly.

**One real type wrinkle, fixed:** exporting `db` as a union of `PostgresJsDatabase | PgliteDatabase`
doesn't typecheck cleanly — the two dialects' `.returning()` overloads don't reconcile across a
union (`tsc` reported "Expected 0 arguments, but got 1" in `src/ingestion/upsert.ts`, which has
nothing to do with upsert logic itself). Both drivers implement the same select/insert/update/
delete surface the app actually uses, so `db` is now explicitly typed as `PostgresJsDatabase` via
a cast rather than exposing the raw union — sacrifices a bit of type precision for a single
consistent shape callers can rely on. `scripts/migrate.ts` needed the analogous fix since
`drizzle-orm/pglite/migrator` and `drizzle-orm/postgres-js/migrator` are genuinely different
functions requiring their own concrete type: it now branches on `DATABASE_URL` the same way
`client.ts` does and casts to the matching migrator's expected type.

**Remaining steps for an actual deploy (founder actions, not code):**
1. Provision managed Postgres (Neon or Supabase per Section 4) and get the connection string.
2. Run `migrate.ts` → `seed.ts` → `ingest.ts --all` once against that real database (with
   `DATABASE_URL` set in the shell — same scripts, no code changes needed).
3. Push this repo to the existing GitHub remote, connect it to a new Vercel project, and set
   `DATABASE_URL` as a Vercel environment variable.
4. Vercel deploys from there. Re-ingestion on a schedule (Vercel Cron, per Section 4) is still a
   later step, not needed for a first deploy.

Added the `postgres` npm package (`postgres-js` driver) as a new dependency for this.

## 15. Session log: 2026-08-04 (continued again) — ticket deep-linking, a real data-source
find, and a second PGlite corruption incident

**Ticket deep-linking is built and live**, per Section 3's already-in-scope "deep link out to
each school's official ticket/schedule page" item. Each game card now shows an orange **"Buy
Tickets"** button when a real ticket URL was found, and/or a **"Game Info"** button linking to
the school's own game-detail page as a universal fallback (ESPN-app-style — always *something*
actionable on the card, not just when a ticket link happens to exist).

**Key research finding, worth having looked before assuming a new adapter was needed: SIDEARM's
`DESCRIPTION` field on each ICS `VEVENT` already contains structured "Label: value" lines** -
confirmed by fetching real live feeds (`uvmathletics.com` sport_id=5, `athletics.amherst.edu`
sport_id=2) and inspecting raw output, not by reading docs (none exist publicly, same as the
original calendar.ashx discovery in Section 9). Real example:
```
DESCRIPTION:University of Vermont Men's Ice Hockey vs Brock\nTV: ESPN+\nRadio: WVMT\n
Streaming Video: https://www.espn.com/watch/\n
Streaming Audio: https://thevarsitynetwork.com/feed/source/oas-378\n
Tickets: https://uvmathletics.evenue.net/list/MHK\n
URL:https://uvmathletics.com/calendar.aspx?game_id=6898&sport_id=5
```
`node-ical` exposes both `description` and `url` as plain top-level fields on the parsed VEVENT
(no manual ICS text-parsing needed) - confirmed via a throwaway script fetching UVM's real feed.
**This line is only present on the home school's own feed entry for a game** - away entries from
the same feed never have a `Tickets:` line, same pattern as the venue-name asymmetry from
Section 5/9. So ticket/source URLs are only trusted and stored from the pass where
`matchup.isHome` is true, mirroring the existing venue-authority logic exactly.

**This finding reverses something I told the user last turn:** I'd said streaming deep-linking
"needs new research... bigger lift than it looks" since the iCal feed seemed ticket/venue-only.
That was wrong - `TV:`, `Streaming Video:`, and `Streaming Audio:` lines are sitting in the exact
same `DESCRIPTION` field as the ticket line, already being fetched for every event. Streaming
deep-linking (not built this session - out of the scope the user actually asked for) is a small
follow-up on top of this same parser, not a new adapter. Good next-session candidate.

**Implementation:** `src/ingestion/sidearm/parse.ts` now captures `description`/`url` from
node-ical; `normalize.ts` adds `parseTicketUrl()` (regex on the `Tickets:` line);
`ingestSchool.ts` only includes `ticketUrl`/`sourceUrl` in the upsert payload on the home pass
(via conditional object spread, so an away pass's empty object genuinely omits those keys from
the SQL `SET` clause rather than nulling them out - same partial-update pattern already used in
`upsertVenue`). New `events.source_url` column added via migration
`drizzle/0003_tired_bullseye.sql` (purely additive, no data loss needed this time, unlike
Section 13's fix). **Real coverage after ingesting all 25 schools:** 247 of 9,151 events have a
real ticket URL (thin but real - matches Section 2's "most D3 games are free" expectation,
concentrated in hockey/marquee sports at schools with an actual ticketing vendor); 5,259 of 9,151
have the `sourceUrl` fallback (the rest are events where the home school isn't in our 25-school
batch, so `matchup.isHome` was never true for that dedupe key in our data - same known limitation
as the "TBD" opponent gap from Section 7, not a new one).

**A second PGlite corruption incident happened this session, self-inflicted despite the
documented rule already existing.** While `ingest.ts --all` was still running in the background
(re-running to backfill the new `ticketUrl`/`sourceUrl` columns), I started the dev server on top
of it to prepare for browser verification - the exact concurrent-`.pglite`-access mistake Section
10 already documented and warned against. Caught and stopped within seconds, but `scripts/
inspect.ts` still hit the same `RuntimeError: Aborted()` signature from Section 10's original
incident afterward, confirming the corruption happened on disk despite the brief window. **Fixed
via the same recovery playbook as before:** `rm -rf .pglite`, rebuild clean (migrate → seed →
ingest --all), verified via `inspect.ts` before touching the dev server again. Final state after
the clean rebuild matched the known-good counts exactly (25 schools, 628 teams, 9,151 events,
zero ingestion errors).

**Process note for future sessions, since the written rule alone didn't prevent a repeat:** treat
"an ingest/migrate/seed script is running" as a hard gate on starting the dev server, not just
something to remember - explicitly check `ps aux` (or wait for the script's own completion
signal) immediately before every `preview_start`/dev-server-start call for this repo, not only
when a script was *just* launched. The failure mode here wasn't forgetting the rule existed, it
was not re-checking process state at the specific moment of the follow-up action.

## 16. Session log: 2026-08-04 (continued again) — real user-reported bug: missing ticket URL,
root-caused to a gap in the SIDEARM data source itself

User reported a specific game card missing "Buy Tickets" (UVM Women's Soccer, "TBD at University
of Vermont", Virtue Field, game_id=6804) and supplied the real correct ticket URL:
`https://uvmathletics.evenue.net/event/WSC26/01`.

**Root cause: the ICS `DESCRIPTION` field's `Tickets:` line (Section 15's data source) simply
isn't populated for this game, confirmed by fetching the live raw feed directly** - the
DESCRIPTION only had `TV:`/`Streaming Video:` lines, no `Tickets:` line at all, even though a
real per-game ticket page exists. Not a parser bug - the source data itself has this gap. Same
conclusion for the sport-level `associated_sport.tickets` field (also empty).

**A better, additional data source was found: the schedule page's own HTML (the exact same page
`fetchSportMeta()` already fetches to extract `associated_sport`) server-renders real per-game
ticket links for schools on the Paciolan/evenue vendor**, as `<a class="paciolan_link" ...
href="…/services/tickets.ashx/go?game_id=N&season_code=…&item_code=…&RDAT=sgl&RSRC=SIDEARM">`.
The `game_id` in that href matches the same numeric id already present in the ICS feed's own
`URL:` field (used for `sourceUrl`) - a direct, reliable join key requiring no extra fetch, since
this HTML page was already being downloaded. Followed the redirect manually to confirm it lands
on exactly the URL the user reported (`.../services/tickets.ashx/go?...` → 302 →
`https://uvmathletics.evenue.net/event/WSC26/01`).

**Checked whether this pattern generalizes across vendors before treating it as a real fix
(not just a UVM-specific patch): Bowdoin and Amherst's schedule page HTML has no equivalent
per-game ticket widget** - they don't appear to be on Paciolan, and their ICS `Tickets:` values
(when present) point to news articles about ticket sales, not real purchase pages. So this is a
same-vendor-only source, same category as PrestoSports-vs-SIDEARM in Section 9: real coverage,
not universal, and that's expected rather than a bug to chase further right now. GoFan/Hometown
Ticketing-specific widget detection would be separate work for whenever it's worth it.

**Fix implemented:** `discover.ts`'s `fetchSportMeta()` now also returns
`ticketUrlsByGameId: Map<string, string>` extracted from the same schedule-page HTML it already
fetches (`extractPaciolanTicketLinks()`). `ingestSchool.ts` now prefers this per-game match (via
the game's own `game_id`, parsed from the already-captured `sourceUrl`) over the ICS
`DESCRIPTION` line's `Tickets:` text - per-game is more precise than the DESCRIPTION line ever
was (that line was often a generic season-list page, e.g. UVM hockey's
`.../evenue.net/list/MHK`), and this also catches real ticketed games the DESCRIPTION field
misses entirely, like the one reported here. Falls back to the DESCRIPTION-based
`parseTicketUrl()` when no schedule-page match exists, preserving existing coverage for schools
where that's the only source. Verified via a standalone script hitting the live UVM feed before
touching the database, then via a full re-ingest: **`ticket_url` coverage went from 247 to 264 of
9,151 events** after this fix (modest increase - only UVM matched the Paciolan widget in the
current 25-school batch, consistent with the vendor-specific nature of this source). Confirmed
in the browser: the exact reported game card now shows "Buy Tickets" linking to the correct
redirect URL.

## 17. Session log: 2026-08-04 (continued again) — streaming deep-linking built (the Section 15
follow-up)

Built the streaming deep-linking flagged as a quick follow-up in Section 15 - `TV:`,
`Streaming Video:`, `Radio:`, and `Streaming Audio:` lines from the same ICS `DESCRIPTION` field
already used for tickets. Game cards now show an indigo **"Watch on {network}"** button (falls
back to plain "Watch" if no network label) and an outlined **"Listen on {network}"** button when
present, alongside the existing Buy Tickets/Game Info buttons.

**New columns:** `events.tv_network`, `streaming_video_url`, `radio_network`,
`streaming_audio_url` (migration `drizzle/0004_sticky_scream.sql`, purely additive). New
`parseStreamingInfo()` in `normalize.ts`, wired into `ingestSchool.ts` the same way as tickets -
gated to the home pass (`matchup.isHome`) for deterministic upserts, same as `ticketUrl`/
`sourceUrl`. Unlike tickets (only the home school sells its own tickets), both sides of a matchup
can have their own legitimately valid streaming info in their own feed entry, so this is a
slightly lossy simplification for road games whose home school isn't in our 25-school batch -
same category of known limitation as the "TBD" opponent gap, not a new one, and not worth a more
complex COALESCE-based merge unless it turns out to matter in practice.

**Verified against a real user-supplied example before running the full pipeline:** confirmed
Middlebury football's real feed has `Streaming Video: https://www.nsnsports.net/colleges/middlebury/`
via a live fetch, then confirmed `parseStreamingInfo()` extracts it correctly via a standalone
script - same "verify against real data before touching the DB" discipline as the ticket fix.

**Real coverage after full re-ingest (25 schools, verified clean via `inspect.ts` - 628 teams,
9,151 events, one transient `fetch failed` consistent with earlier network blips, not a code
issue): 3,773 of 9,151 events have `streaming_video_url`, 65 have `streaming_audio_url`.** Video
coverage is much higher than tickets (thin, 264 events) since streaming/TV info is something
schools' own athletic departments broadcast widely (ESPN+, NSN Sports, conference networks)
regardless of division, unlike ticket sales which are mostly a D1/hockey thing. Confirmed in the
browser: a UVM hockey card shows all four buttons at once (Buy Tickets, Watch on ESPN+, Listen on
WVMT, Game Info), each linking to the correct real URL.

## 18. Session log: 2026-08-05 — Business Plan v2.5 & Personas integration (this session)

Read `GDNE_Business_Plan_v2_5.docx` and `GDNE_Personas.docx` (both uploaded, not previously in
this repo) and layered their content into this file as **Section 0**, without modifying the
existing technical record in Sections 1–17. No code was touched this session — this was a
documentation/context-integration pass only.

**What was added:** the four-surface product model, the five-agent operating model mapped
against what's actually built (only the Schedule & Results Agent's SIDEARM half exists, and it's
human-triggered, not autonomous), a gate-by-gate (G0–G5) status check against the plan's own
readiness framework, a condensed 11-persona reference table, and an explicit schema-gap callout:
**the current schema has no fan/registration/consent entity and no individual-athlete entity**,
both of which are structurally required before the school portal, sponsor dashboard, or NIL
marketplace surfaces can be built. Also flagged the precision gap between "25 schools ingested"
(this repo's actual state) and "34 schools signed" (the plan's Year 1 activation bar) so future
status updates don't conflate the two.

**Not done this session:** no schema changes, no new entities, no decision on the consent-ledger
or athlete-entity open questions raised in Section 0.7 — those are flagged for a future session
to actually resolve, not resolved here.

## 19. Session log: 2026-08-05 (continued) — feasibility review, recorded as Section 0.8

Founder asked for a plain feasibility read on Section 0: is the full plan realistic, does the
current build match the intention, is it too complex, what's the recommended path. That
discussion is now captured in **Section 0.8** so it isn't lost to chat history. Headline points:
discovery (Surface 1) is de-risked and working; the plan's central asset (the fan graph) doesn't
exist in any form yet, not even passively, since there's no registration/consent layer; NIL is
the hardest surface by a wide margin (compliance + payments + trust, not just software); the
plan's own Class A/B/C assumption discipline already flags the revenue-critical assumptions as
unproven, which is honest but means the Year 5 figures aren't load-bearing yet; and the
PrestoSports-dead finding from Section 9 should be reconciled back into the business plan
document itself rather than left as a standing discrepancy between the two sources.

**Recommendation logged for a future session to pick up (not started):** before any sponsor
dashboard or NIL work, build a minimal follow/alert mechanism on the discovery product to
actually start the fan graph and test the "will fans register with a third party" assumption
with real behavior. Requires new schema (users/follows/consent) — not an extension of the
existing events/teams/schools/venues tables.

**Not done this session:** no code, no schema changes — this was a planning/prioritization
conversation, recorded for continuity.

## 20. Session log: 2026-08-05 (continued) — fan follow/alert mechanism built (Section 0.8's
recommendation)

Built the "follow your school, get alerts" MVP Section 0.8 recommended as the next step before
any sponsor/NIL work — the first real piece of the fan graph the business plan's whole thesis
depends on. Two design forks were resolved with the founder up front: **follow granularity is
school-level only** (not per-team), and **auth is stateless double opt-in** (no passwords, no
login sessions — email + school picker → confirm-by-click → done, manage link in every email).

**New schema (migration `drizzle/0005_nasty_zarda.sql`, purely additive):** `fans` (email,
`manage_token`, `confirmed_at`, `unsubscribed_at`), `fan_follows` (fan × school, unique pair),
`consent_events` (append-only ledger - action + a `school_ids` snapshot per row, so each row is
self-contained evidence even if `fan_follows` changes later - this directly satisfies Section
0.4/0.5's "consent ledger operational" G0 gate language), `fan_alert_log` (fan × event, dedup
guard for the alert script).

**Routes are plain Route Handlers, not Server Actions** (`src/app/follow`, `/confirm`, `/manage`
pages + `src/app/api/{follow,confirm,unsubscribe}/route.ts`) - this codebase had zero of either
before today, and Route Handlers sidestep a real Server-Actions deploy gotcha (Origin-header
validation that can 403 behind Vercel preview URLs). **Both `/confirm` and `/unsubscribe` are
GET-shows-a-page/POST-mutates**, not GET-mutates-directly - corporate email link-scanners
(Outlook/Defender Safe Links prefetch links in delivered mail) would otherwise silently
"confirm" or unsubscribe fans without a real click, which would have undermined the entire
point of double opt-in as consent evidence.

**Resubscribe is explicit, not implicit:** submitting `/follow` again for an unsubscribed email
does *not* silently reactivate them (`findOrCreateFan` never touches `unsubscribedAt`) - only a
fresh click on a confirm link does (`confirmFan` sets `confirmedAt` and clears `unsubscribedAt`
together). Verified this exact sequence live: register → confirm → unsubscribe → re-submit
`/follow` (confirmed still unsubscribed) → click fresh confirm link → reactivated.

**A real, non-obvious PGlite bug found and fixed while testing this:** the very first attempt
at `/confirm` failed with "Link not found" even though the exact right token was in the URL and
genuinely present on disk. Root-caused (not guessed at) via a temporary diagnostic log: Next.js
dev mode (Turbopack) compiles each route's module graph separately and re-evaluated
`src/db/client.ts` once per distinct route touched (`/api/follow` vs `/confirm`), creating
**multiple separate PGlite engine instances all pointed at the same `.pglite/` directory within
one dev-server process** - a variant of the exact cross-process concurrency hazard Section 10
already documented, just manifesting across route-module instances within a single process
instead of across two OS processes. Confirmed by reproducing (fresh restart → single route hit:
worked; multi-route flow within one server run: failed) before fixing. **Fix: cache the db
client on `globalThis`**, the standard Next.js dev-mode singleton pattern (same category of fix
commonly needed for Prisma-in-Next.js) - re-tested the full register → confirm → manage →
unsubscribe → resubscribe flow within one server session afterward and it worked correctly
throughout. This fix is real protection against a bug that would otherwise have been intermittent
and confusing in any future multi-route feature, not just this one.

**Alert digest script (`scripts/send-alerts.ts`):** human-triggered like `ingest.ts`, not cron'd
(nothing in this repo is autonomous yet, per Section 0.3). Reuses `getRangeWindow("week")` and a
new `getUpcomingEventsForSchoolIds()` in `queries.ts` (same `homeSchools`/`awaySchools` alias +
`or()` pattern as `getFilteredEvents`, so a fan following two schools that play each other only
sees the game once). Excludes cancelled games and out-of-region events, matching the rest of the
product's scoping. Dedup via `fan_alert_log` verified directly: same query run twice against a
fixed date found 7 real events the first time, 0 the second time after logging them as sent -
this matters a lot here since re-sending the same game on every re-run would actively damage the
"will fans register with a third party" trust test this whole feature exists to run.

**Email sending is dry-run only right now, same category as the Neon/Vercel account gap from
Section 14:** `src/email/send.ts` sends via Resend when `RESEND_API_KEY` is set, otherwise logs
to console - mirrors `client.ts`'s `DATABASE_URL` pattern exactly. Actually sending real email
needs the founder's own Resend account + verified sending domain + a real mailing address for
the CAN-SPAM footer (currently a placeholder). None of that blocks testing the rest of the flow,
which is fully working locally today.

**Explicit v1 scope decisions, not silent gaps:** unsubscribe is global-only (no per-school
unfollow UI, even though the data model supports it); no CAPTCHA/rate-limiting on the public
`/api/follow` endpoint (acceptable for MVP validation traffic); `getUpcomingEventsForSchoolIds`
inherits `getRangeWindow`'s pre-existing server-local-time behavior, which will need fixing
alongside the rest of the app once this deploys to Vercel's UTC environment (not a new bug
introduced here).

**Verified end-to-end in the browser:** full register → confirm → manage → unsubscribe →
resubscribe cycle, homepage's new "Follow your school →" link, `tsc --noEmit` clean throughout.
Test fan rows (`testfan@example.com`, `testfan2@example.com`, `dedup-test@example.com`) created
during verification were deleted afterward via cascade delete on `fans`, not left in the DB.

## 21. Session log: 2026-08-05 (continued) — user-reported bug: "Blue and White Women's Soccer"
isn't a sport, root-caused to a general stale-feed discovery gap

User reported a bogus entry in the Sport filter dropdown. Root-caused (not guessed) by fetching
Assumption's real site: `assumptiongreyhounds.com`'s nav links a `/sports/blue-white-womens-soccer/schedule`
page (sport_id=44) alongside the real `/sports/womens-soccer/schedule` (sport_id=18) - SIDEARM
sites can list defunct/renamed alternate-squad program pages in the same nav as real varsity
sports, and `discoverSportSlugs()` had no way to distinguish them; both match the same URL
pattern. Confirmed via the raw feeds: sport_id=44's entire calendar is dated **2024**, nothing
since, while sport_id=18 (the real program) runs into 2027.

**General fix, not a name-pattern blocklist:** added `isFeedStale()` in `normalize.ts` - a sport's
feed is skipped entirely (no team or event rows created) if its most recent event is more than
300 days old, evaluated fresh against "now" on every ingest run (self-correcting: if a school
later republishes dates, the next run picks it back up automatically). Deliberately not a
"blue/white/color-name" pattern match, which would be fragile and school-specific - this is a
current-reality check that generalizes to any dead nav-listed page regardless of naming.
Considered and rejected treating `SPORTS_SEED` as a strict inclusion allowlist instead - it's an
intentionally incomplete reference table (used only for season-derivation, per Section 5) and
several already-correctly-ingested real sports (Crew, Rugby, Water Polo, Gymnastics, Bowling,
Fencing) aren't in it; using it as a gate would have silently broken real coverage.

**Verified no real coverage was lost before treating this as safe:** Bryant's "Women's Cross
Country" page also got flagged stale (empty feed) - checked directly whether this was a false
positive, since women's cross country is definitely a real sport. It wasn't: Bryant's actual
cross-country data lives under a separate combined "Cross Country" page (10 events) plus a
"Men's Cross Country" page (7 events), both still ingesting normally: `womens-cross-country` is
itself an abandoned duplicate with zero events, not the real source of that sport's data.

**The fix caught more than the one reported case** when re-run across all 25 schools: Assumption's
"eSports" page (dead since 2023, 9 orphaned events already in the DB from a prior run), and at
Southern Connecticut State a long list of **club-sport** pages (Men's/Women's Club Soccer,
Rugby, Volleyball, Ultimate Frisbee, Club Golf) that were never in scope at all per Section 1's
explicit "varsity only" rule - all had empty feeds so no cleanup was needed there, but the
discovery mechanism was blindly attempting to fetch dozens of non-varsity nav links it should
never have tried in the first place.

**Cleanup of already-ingested bad data** (re-ingestion only inserts/updates, it doesn't retroactively
delete rows for a sport it now skips): deleted 8 "blue and white women's soccer" events + 2 team
rows, and 9 "esports" events + 2 team rows (confirmed via query that all 9 esports rows anywhere
in the DB were this same stale Assumption data, not a legitimately active esports program at
another school). Final state after full re-ingest + cleanup, verified via `inspect.ts`: 25
schools, 624 teams, 9,163 events, no corruption. Confirmed in the browser: both bogus entries
gone from the Sport filter dropdown.

**Not fully explored this session:** whether any other already-ingested schools have similar
already-orphaned stale-sport rows beyond the two found here - the full `--all` re-ingest log was
checked for every stale-skip case with nonzero `fetched` count (the only way old bad rows could
already exist), and only these two had any, so this should be a complete cleanup for the current
25-school batch specifically. Re-check this when the next batch of schools is added.
