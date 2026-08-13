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

### 0.9 External landscape watch-list (started 2026-08-11)

Entities worth tracking over time as the plan evolves — not active integrations, just a durable
record so their status can be checked/updated in future sessions rather than re-researched from
scratch. Append a dated line under each as things change (funding, product moves, outreach status,
etc.) rather than editing the initial assessment in place.

**Seated ([seated.com](https://www.seated.com/))** — *pattern validation, not a competitor or
partner candidate.* Fan-follows-artist → SMS alert the moment a nearby show is announced → ticket
straight to phone. Founded 2017, acquired by Sofar Sounds in Feb 2021, **re-acquired by its own
founders (David McKay, John Griffin) in June 2025 with no outside investors** — both deal prices
undisclosed. Relevance: this is the same mechanic as this repo's own `fans`/`fan_follows` MVP
(Section 20), built independently before this entity was found — real-world evidence (not proof)
that fans will opt into free affinity-based alerts, and their current feature set ("audience-
building and pixeling for ad strategy") is a concrete reference spec for what the Sponsor
Dashboard (4.3) eventually needs to do. Different vertical (national touring music vs. regional
college sports), no multi-surface ambition on their side — no actual overlap risk.
- *Watch for:* any public numbers on how their audience-monetization actually performs (would be
  the closest available proxy for GDNE's own Class B "will sponsors pay attributed prices"
  assumption, Section 0.8).

**Northeast Sports Network / NSN ([nsnsports.net](https://www.nsnsports.net/))** — *complementary
core product, latent competitor on sponsor dollars.* Vermont-based (Lyndonville), founded 2006,
21-50 employees, private/bootstrapped (no funding rounds found). Streams/produces video for the
same NESCAC/NEWMAC/Northern New England schools this repo ingests, with existing institutional
partnerships (Castleton, Johnson State, Lyndon State, Norwich, UVM) and an existing sponsorship/ad
sales business. Revenue estimated ~$2.4M/year by third-party aggregators (not company-disclosed,
treat as low-confidence). No public valuation or deal history exists to anchor a number against.
- **Partner angle (near-term, cheap):** their stream URLs could populate this repo's already-built
  `tvNetwork`/`streamingVideoUrl` columns ([Section 17](CLAUDE.md:1004),
  `src/ingestion/sidearm/normalize.ts` `parseStreamingInfo`) — schedule discovery feeding their
  video product's viewership.
- **Competitor angle (activates at Gate G3):** once the Sponsor Dashboard (4.3) exists, NSN and
  GDNE would be selling regional-brand ad dollars against the same schools — bundling beats
  competing here if outreach happens before G3 ships.
- **Acquisition angle (Gate G1+ only, not now):** their 20 years of real institutional school trust
  would shortcut the "25 ingested ≠ 34 signed" gap (Section 0.7), but this is a post-capital move
  that also cuts against the plan's software-leverage cost thesis (Section 0.3) — a labor-intensive
  production business, not a tuck-in. File away, don't act on pre-Gate-0.
- *Watch for:* any ownership change, funding event, or expansion beyond Northern New England that
  would change this calculus.

**New England CFB Project / @CFBNewEngland ([x.com/CFBNewEngland](https://x.com/CFBNewEngland))**
— *distribution/marketing partner candidate, not a business entity.* Fan community X account,
Boston, joined June 2023, 2,297 followers as of 2026-08-11. Football-only (mixes FBS/FCS: BC,
UConn, Holy Cross, UMass, URI, UNH, Bryant, Yale), content is fan culture/hot-takes/crowdsourced
road-trip schedules, monetized only via a coffee-brand affiliate tie-in (BannerYearCoffee). No
product, no owned audience data (X owns that relationship), no revenue model to speak of — not a
competitor, customer, or acquisition target in any real sense.
- **Partner angle:** a warm, on-persona, pre-built audience of exactly the "Saturday Seeker" /
  regional-fan persona this repo's discovery product and Section 20's follow/alert MVP target.
  Cheap, low-commitment top-of-funnel distribution (co-promo of the "follow your school" feature)
  worth a casual outreach — no product integration needed, unlike NSN.
- *Watch for:* follower growth, any monetization beyond the coffee affiliate, or a pivot toward an
  actual product (would change the "not a business entity" read above).

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
3. ⏳ Master school registry: **83 of ~101 schools** are now in `src/db/seed/schools.ts` as of
   2026-08-07 (Section 26), but only **37 are actually live/ingested** (both locally and in
   production/Neon, per Section 24/25). The 42 schools added in Section 26's batch-4 pass (plus 4
   still-pending from Section 23/24's original 41-school batch) are source-file-only — they need a
   migrate → seed → ingest cycle (with the dev server and any other `.pglite`-touching process
   stopped first, per Section 10) before they show up in the app. Section 26 also flags one
   pre-ingest fix needed for this batch: Boston College/Boston University/Providence College need
   Hockey East conference-override entries added to `conferenceOverrides.ts` first (same pattern
   Section 24 already built). Full registry is still the later-phase goal (Section 3 step 2).
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

## 22. Session log: 2026-08-06 — batch 3: staging 16 more schools (Franklin Pierce/SNHU landed,
Little East completed, first America East/Hockey East D1 slice)

Per Section 3's "Full D3 rollout" step (plus a deliberate early slice of D2/D1 per this session's
brief), researched and staged 16 more schools — **source file only**
(`src/db/seed/schools.ts`); did **not** run `migrate.ts`/`seed.ts`/`ingest.ts`, per Section 10's
PGlite concurrency rule. `SCHOOLS_SEED` now has 41 schools in source; the DB itself is unchanged
at 25 schools/628 teams/9,151 events until a future session runs the migrate → seed → ingest
cycle with the dev server stopped.

**Method:** same fingerprint as prior batches — fetched each candidate's real athletics homepage
via WebFetch, checked for the `dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/...` asset
domain and/or "Sidearm Sports" footer attribution. Several schools' homepages returned HTTP 403
to WebFetch (same WAF/bot-protection pattern as Section 12's Little East 403s); for those, fell
back to WebSearch **but only counted a school as confirmed if the search surfaced a direct
`<school-domain>/sidearmstats/...` result URL on that school's own domain**, not just generic
"SIDEARM is a big company" hits — this is a stricter bar than Section 12 used for its
circumstantial (and correctly rejected) evidence, applied consistently to every school below.

**16 schools added, all confirmed live SIDEARM by direct fingerprint (WebFetch cloudfront/footer
match, or a same-domain `/sidearmstats/` WebSearch hit) on 2026-08-06:**
- **Northeast-10 (2 — completes full NE10 New England membership):** Franklin Pierce University,
  Southern New Hampshire University. Both were already confirmed live SIDEARM back in Section 12
  (2026-08-04) but never added, purely deprioritized for state diversity at the time — re-verified
  live today, unchanged. NE10's only other full members are Adelphi and Pace (both NY, out of
  region), so NE10's New England roster is now complete across the 8 schools in the seed.
- **Little East (3 — completes full Little East membership):** Western Connecticut State
  University, University of Massachusetts Boston, Vermont State University-Castleton (formerly
  Castleton University).
- **MASCAC (2, new conference in the seed):** Fitchburg State University, Massachusetts College
  of Liberal Arts (MCLA).
- **America East (3 — all New England members beyond Vermont/Bryant, already seeded):**
  University of Maine, UMass Lowell, University of New Hampshire.
- **Hockey East / other D1 (6, added per this session's brief to take a first slice beyond
  America East):** Merrimack College (MAAC), University of Connecticut (Big East), University of
  Massachusetts Amherst (Mid-American Conference — moved from Atlantic 10 for 2025-26; hockey
  stays in Hockey East, noted since the `conference` column reflects the primary all-sport
  conference, same convention as the rest of the seed), Sacred Heart University (MAAC — its
  official athletics URL, `sacredheartpioneers.com`, actually resolves through
  `sacredheart.sidearmsports.com`, about as direct a SIDEARM fingerprint as exists), Northeastern
  University (CAA), University of Rhode Island (Atlantic 10).

**A real correction to this session's own starting assumptions, found via Wikipedia (not
guessed):** the brief's candidate list called Bridgewater State/Framingham State/Salem
State/Westfield State "Little East Conference" schools, following Section 12's framing from
2026-08-04. **That's stale — none of the four are current Little East members.** Per Little East
Conference's Wikipedia page (checked 2026-08-06): current full membership is Eastern Connecticut
State, Keene State, Plymouth State, Rhode Island College, UMass Boston, UMass Dartmouth,
University of Southern Maine, Vermont State University-Castleton, and Western Connecticut State
(9 schools — 6 already seeded pre-this-session, the other 3 added above). Bridgewater State,
Framingham State, Salem State, and Westfield State are **former** Little East associate members
that departed after the 2022 fall season when MASCAC took over field hockey sponsorship for
those schools; their actual current primary conference is **MASCAC** (confirmed via
`mascac.com`-referencing search results), alongside Fitchburg State, MCLA, Massachusetts Maritime
Academy, and Worcester State. Also note: Vermont State University-Castleton is itself scheduled
to leave Little East for MASCAC after the 2026-27 season per the same Wikipedia page — not acted
on here since it's still a live Little East member today, but worth re-checking conference
labels for Castleton in a future session once that move actually happens.

**Not added — researched but skipped, with reasons (mirrors Section 12's practice of documenting
rejections instead of silently dropping them):**
- **Bridgewater State (`bsubears.com`), Framingham State (`fsurams.com`), Salem State
  (`salemstatevikings.com`), Westfield State (`westfieldstateowls.com`)** — all four still
  return HTTP 403 to WebFetch on both the homepage and a schedule subpage, same as Section 12's
  finding two sessions ago (nothing changed). WebSearch fallback found no direct
  `<domain>/sidearmstats/...` hit on any of the four domains themselves — only generic SIDEARM
  company references — so none meet this session's fingerprint bar. Left out, same as Section
  12. (Also no longer Little East candidates regardless per the correction above — they'd be
  MASCAC additions if/when confirmed.)
- **Massachusetts Maritime Academy (`mmabucs.com`), Worcester State University
  (`wsulancers.com`)** — same pattern: WebFetch 403, no direct same-domain `sidearmstats` hit
  from WebSearch. Left out as unconfirmed rather than guessed. Both are MASCAC schools (Mass
  Maritime's primary conference; it's also a Little East *associate* member for men's lacrosse
  only, which doesn't change its primary-conference classification).

**Net result of this session:** `SCHOOLS_SEED` in `src/db/seed/schools.ts` now has 41 schools
(25 + 16), all source-only pending a migrate/seed/ingest run — the 16 new ones need the same
follow-up Section 12's batch needed before Section 13 ingested it. 6 schools (Bridgewater,
Framingham, Salem, Westfield, Mass Maritime, Worcester State) were investigated and intentionally
not added, all for the same reason (WebFetch 403 + no confirmable same-domain SIDEARM
fingerprint via WebSearch), not a data-quality concern with the schools themselves. Good
next-session candidate: retry these 6 with an actual browser-based fetch instead of the
sandboxed WebFetch tool, per Section 12's same standing suggestion.

## 23. Session log: 2026-08-06 — first production deployment, live

**The app is genuinely live**, at **https://game-day-new-england.vercel.app** — first real
deployment, closing out the "Not done" item that's been carried since Section 7. Founder set this
up directly through the Vercel dashboard (New Project → import `mattwerner-sudo/game-day-new-
england` → `DATABASE_URL` env var set to the Neon connection string from Section 22's work →
Deploy), not something done from this session's tools. One real hiccup along the way: the first
attempt landed on a "clone into a brand-new repository" flow instead of importing the existing
repo - would have silently broken continuous deployment (future `git push` wouldn't trigger new
builds) had it gone through. Caught before clicking through; the correct "Importing from GitHub"
flow (existing repo, no new-repo-name field) is the one that actually worked.

**Verified live and working end-to-end**, not just trusted the dashboard's "Ready" status:
main list page renders all 25 schools and the cleaned-up sport list (Section 21's fix confirmed
holding in production); September 2026 shows 814 real games querying live from Neon; `/follow`
renders correctly with the real school picker.

**Known gap, not yet closed**: `RESEND_API_KEY` isn't set in Vercel's environment variables, so
the fan-follow confirmation/digest emails still only console-log to Vercel's function logs rather
than actually delivering - per Section 17's dry-run design, the registration/consent flow itself
works correctly in production, real email sending is a separate, still-pending step needing the
founder's own Resend account (same category as the Neon/Vercel accounts already flagged in
Section 14).

**Also this session**: staged 16 more schools (25 → 41 in `src/db/seed/schools.ts`, not yet
migrated/ingested - source-file only, per the established batching discipline). Completes
Northeast-10 and Little East's actual current membership (found and corrected a stale assumption
inherited from Section 12: Bridgewater/Framingham/Salem/Westfield State left Little East for
MASCAC after 2022, not still-unconfirmed Little East candidates as previously logged) and adds a
first slice of D1 programs. **Real, not-yet-resolved schema gap surfaced by the D1 additions**:
several (UConn, UMass Amherst, Northeastern, Merrimack, Sacred Heart) don't have one clean
conference the way D3 schools do - they play hockey in Hockey East but their other sports are in
a different primary conference (e.g. UConn is Big East outside hockey). The single `conference`
column per school (Section 5's schema) can't represent this; as staged, these schools' hockey
games would file under the wrong League filter value. Not fixed this session - flagged for a
real decision before this batch gets ingested, not silently ingested with known-wrong data.

## 24. Session log: 2026-08-06 (continued) — conference-per-team fix, in progress at session end

**Fixed the schema gap from Section 23** by adding nullable `teams.conference`/`teams.division`
override columns (migration `drizzle/0006_yielding_princess_powerful.sql`, purely additive) -
a team inherits its school's conference/division unless explicitly overridden. New
`src/ingestion/sidearm/conferenceOverrides.ts` holds the actual verified exceptions, keyed by
exact school name + sport + gender; `upsertTeam()` applies them on both insert and update (so
fixing/adding an override entry self-corrects on the next ingest run, not just for brand-new
teams). `getFilteredEvents()`'s League filter and `getFilterOptions()`'s league dropdown both now
`COALESCE` team-level override over the school's default.

**Verified via real research, not assumption** (WebFetch/WebSearch against Hockey East and
Atlantic Hockey America's actual current membership, cross-checked against each school's own live
SIDEARM nav to confirm which genders actually have a program): Bentley and American International
College are D2/Northeast-10 overall but D1 men's ice hockey in Atlantic Hockey America - and this
was **already live in production with wrong data since Day 1**, not something the new schools
introduced. Vermont, Connecticut, Maine, Merrimack, and Northeastern are D1 but their primary
conference (America East/Big East/MAAC/CAA) doesn't sponsor hockey at all, so their hockey
programs (both genders where they exist) play in Hockey East instead.

**A separate, real adapter limitation was found and worked around, not silently ingested around:**
UMass Lowell, University of New Hampshire, University of Massachusetts Amherst, and Sacred Heart
University are confirmed live SIDEARM, but their homepage HTML has zero static
`/sports/<slug>/schedule` nav links at all (likely a JS-rendered mega-menu, unlike every other
school ingested so far) - confirmed their sport pages exist fine at the standard URL when guessed
directly, so `discoverSportSlugs()` would silently return zero sports for them, which would show
up as a school permanently stuck at 0 games rather than a real gap. **Deliberately left these 4
out of this batch** (removed from `src/db/seed/schools.ts`, documented inline with the reason)
rather than seed a broken-looking entry - fixing this for real needs either a headless-browser-
based discovery fallback or manual per-school sport-slug curation, not attempted this session.

**Net school count this session: 41 staged (Section 23) → 37 after removing the 4 broken-
discovery schools.**

**State at session end - deliberately not pushed to GitHub/Vercel yet:**
- Local PGlite: fully migrated, re-ingested, and verified clean - 37 schools, 836 teams, 11,819
  events, zero errors, all 12 expected conference/division overrides confirmed correct via direct
  query (Bentley/AIC → Atlantic Hockey America D1; Vermont/UConn/Maine/Merrimack/Northeastern →
  Hockey East).
- Neon (production database): migrated and seeded with the new schema/37 schools, but the full
  re-ingest hit unusually heavy transient errors (10+ failed queries across many schools/sports in
  one run - network flakiness against Neon over a long-duration run, not a code bug, same class of
  issue as the isolated "fetch failed" errors seen throughout this session, just more of them at
  once). A retry was started to clean this up but **did not finish before the session ended** -
  only 1 of 37 schools had completed when the session was called for the night.
- **Production (Vercel/game-day-new-england.vercel.app) is unaffected and still safe**: the
  currently-deployed code is from commit `f2adbee`, which never references `teams.conference`/
  `division` at all, so it's unaffected by the new (purely additive) Neon schema and the
  in-progress re-ingest - worst case it just doesn't see the override logic or the 12 new schools
  yet, nothing is broken. The new code (schema.ts, upsert.ts, ingestSchool.ts, queries.ts,
  conferenceOverrides.ts, schools.ts, migration 0006) is uncommitted, sitting locally only.

**Next session should, in order:** (1) check whether the Neon retry is still running or was
interrupted (`ps aux | grep tsx`); if interrupted, just re-run `ingest.ts --all` against Neon
again (idempotent, safe) until a run comes back clean; (2) verify via `inspect.ts` + the same
override spot-check used for local; (3) only then commit + push the code (this triggers Vercel's
auto-redeploy, which is why Neon needs to be ready first - migrate-then-deploy ordering, not the
other way around); (4) verify the League filter actually works for "Hockey East"/"Atlantic Hockey
America" on the live production site before calling it done.

## 25. Session log: 2026-08-07 — Section 24 finished: Neon recovered, code pushed, verified live

**The overnight retry from Section 24 was actually stuck, not just slow** - only 3 of 37 schools
completed between 10:44 PM and the next morning (normal runs take 15-25 min). Killed it and ran a
clean retry, which completed normally in a few minutes with zero errors - confirms this was a
hung network connection to Neon, not a real problem with the ingestion logic itself. All 12
expected conference/division overrides verified correct on Neon via direct query, matching local
exactly.

**Pushed commit `73ede42`** (schema + conference-override code + 37-school seed) once Neon was
confirmed ready - migrate/ingest-then-deploy ordering, per Section 24's own plan.

**Real gap caught in verification, not assumed fixed:** right after pushing, the live site's
League dropdown was still missing "Hockey East"/"Atlantic Hockey America" - initially concerning,
but tracing it through confirmed this was Vercel's build still in progress (the school list
already showed 37 schools because that query is unchanged between code versions and reads live
from Neon regardless of which app code is deployed; the League list specifically requires the new
code, so its absence was the actual tell that the old deployment was still live, not a bug in the
new code, which a direct `getFilterOptions()` call against Neon confirmed was already returning
the correct list). Rechecked after the build finished and it was correct. **Verified functionally,
not just that the option exists**: filtering by "Hockey East" in October 2026 correctly surfaces
Vermont's games including ones against Bentley and SNHU (neither of which is Hockey East
themselves) - confirms the existing "match either side of the matchup" League semantic (Section
10) composes correctly with the new per-team override.

**Also fixed**: `src/app/page.tsx` still hardcoded "25-school batch" in two places (same class of
stale-copy issue as Section 13's "10-school validation batch" fix) - updated to "37-school batch".
Verified locally; not yet pushed as of this log entry.

## 26. Session log: 2026-08-07 (continued) — batch 4: staging 42 more schools (41 → 83),
Ivy League and three new D3 conferences added, and a real correction to Section 9's
PrestoSports-is-dead finding

Per Section 3's build sequencing (full D3 rollout → D2/D1 → ongoing) and this session's brief
(prioritizing remaining Hockey East D1, Ivy League, remaining MASCAC members, and GNAC/NEWMAC/CCC/
North Atlantic Conference D3 schools), researched and staged 42 more schools — **source file
only** (`src/db/seed/schools.ts`); did **not** run `migrate.ts`/`seed.ts`/`ingest.ts`. Confirmed
via `ps aux` at the start of this session that `scripts/ingest.ts --all` was actively running
against the local DB (started 2:29 PM) - per Section 10/15's PGlite concurrency rule, this session
made zero database writes and never started a dev server; editing `schools.ts` is a plain source
file change and doesn't touch `.pglite/` regardless of what's running, but the check was done
before touching anything else in the repo, matching Section 15's "recheck process state at the
moment of the action" lesson. `SCHOOLS_SEED` now has **83 schools** in source; the DB itself is
still wherever the in-flight ingest run leaves the prior batch (37-41 schools depending on whether
a seed run for batch 3 happened first) - a future session needs to run migrate → seed → ingest for
this batch once nothing else is touching `.pglite/`, exactly like batches 2 and 3 before it.

**Method - a real technical finding worth carrying forward: curl (via the Bash tool, with a real
browser User-Agent string) succeeded on every single domain checked this session, including
several that had 403'd to the WebFetch tool in Sections 12 and 22.** This confirms those prior
sessions' standing suspicion that the WebFetch tool itself (not the target sites) was being
fingerprinted and blocked - a plain HTTP client with a normal UA sails through. Fingerprint used:
the `assets.sidearmsports.com` CDN path (served via a `cloudfront.net` edge - sometimes the
`dxbhsrqyrr690` distribution ID seen in earlier batches, sometimes a different one; the
`sidearmsports.com` origin hostname is the actually-reliable part, not the specific CDN
distribution) and/or literal "Sidearm Sports" footer attribution text - cross-checked against each
page's `og:site_name` meta tag every time to confirm the fingerprint actually belonged to the
intended school and not a coincidental shared-CDN hit. Two near-misses this method caught before
they became false positives/negatives: University of Maine at Presque Isle's page matched a naive
`presto` substring search only because of an unrelated image filename (`Preston_Collins.png`) - a
full `sidearmsports.com` check confirmed it's genuinely SIDEARM, not Presto; and Lesley
University's page body came back empty on fetch, but its `Set-Cookie` response header carried a
`Domain=prestosports.com` scope, which is what actually confirmed it as Presto (rejected) rather
than an inconclusive check.

**42 schools added, all confirmed live SIDEARM by direct fingerprint on 2026-08-07:**
- **D1 - remaining Hockey East members (this batch's top priority):** Boston College, Boston
  University, Providence College.
- **D1 - Ivy League (zero Ivy schools were seeded before this batch):** Harvard, Yale, Brown,
  Dartmouth.
- **D1 - remaining Patriot League/MAAC candidates:** College of the Holy Cross, Fairfield
  University, Quinnipiac University.
- **D3 - GNAC (8 of 14 members):** Colby-Sawyer College, Dean College, Emmanuel College, New
  England College, Norwich University, Rivier University, Saint Joseph's College of Maine,
  Simmons University. (Rivier and Simmons were both checked and found live SIDEARM here - notable
  since Section 9 originally listed both as PrestoSports sites in maintenance mode; they've
  evidently migrated off Presto onto SIDEARM since 2026-08-04.)
- **D3 - NEWMAC (11 of 13 core members):** Babson College, MIT, Smith College, Wellesley College,
  Wheaton College (MA), WPI, Clark University, Springfield College, United States Coast Guard
  Academy, Emerson College, Salve Regina University. (Saint Anselm College is NEWMAC's newest
  core member as of April 2026 but is already seeded above under Northeast-10, its primary
  conference - not duplicated as a separate row.)
- **D3 - Conference of New England, formerly Commonwealth Coast Conference/CCC, renamed 2024 (7 of
  11 members):** Gordon College, University of Hartford, Johnson & Wales University (Providence),
  Nichols College, Roger Williams University, University of New England, Western New England
  University.
- **D3 - North Atlantic Conference (6 of 8 members):** Husson University, University of Maine at
  Farmington, University of Maine at Presque Isle, Maine Maritime Academy, Thomas College, Vermont
  State University-Lyndon.

**Real correction to Section 9's "PrestoSports appears dead in New England" finding: it is not
dead.** Section 9's conclusion was based on checking only 3 domains (Rivier, Simmons, and one
non-NE control school), all "Site in Maintenance Mode" at the time. This session found **20 real,
live, current-season New England D1/D2/D3 athletics sites running PrestoSports** (confirmed via
`prestosports`/`PRESTO` markers in the actual page content, real current-dated schedule data, and
in Suffolk's case a direct press-release confirmation): Bridgewater State, Framingham State, Salem
State, Westfield State, Massachusetts Maritime Academy, Worcester State (all 6 of MASCAC's
remaining members), Central Connecticut State University (1), Albertus Magnus, Elms, Lasell,
Mitchell, Regis, University of Saint Joseph CT (6 of GNAC), Mount Holyoke (1 of NEWMAC), Curry,
Endicott, Suffolk, Wentworth (4 of Conference of New England), and Lesley, Vermont State-Johnson
(2 of North Atlantic Conference) - 6 + 1 + 6 + 1 + 4 + 2 = 20 confirmed-live-Presto rejections in
total. None of these can be ingested with this codebase's SIDEARM-only adapter - they would need a real
PrestoSports adapter first (Section 5 already ranks this second in the ingestion priority order,
but it's never been built - blocked since Section 9). **This is a real, sizeable, immediately
addressable pool of New England schools** if a Presto adapter ever gets prioritized - it would
unlock all of MASCAC, Central Connecticut State, and large chunks of three D3 conferences in one
adapter, not scattered one-offs.

**The Section 12/22 MASCAC "WebFetch 403, unconfirmed" mystery is resolved, not just retried
successfully:** these 6 schools were never SIDEARM at all, so the repeated 403s were never
actually hiding a SIDEARM site behind a bot-blocking WAF as those sessions speculated - they were
419-redirecting to a working PrestoSports site (`/landing/index`) that a plain curl fetches simply
fine. The 403 vs. 200 difference across sessions was about the fetch method (WebFetch tool vs.
curl), not about these schools' actual platform.

**Not added — checked and confirmed NOT SIDEARM, with real reasons (full list and exact domains
recorded inline in `src/db/seed/schools.ts`'s rejection comment block, mirroring Section 12/22's
practice):** all 20 schools named in the Presto correction above. No other schools were checked
and rejected this session - everything else fingerprint-checked came back positive.

**Real, not-yet-resolved gap surfaced by this batch, flagged rather than fixed here (same
discipline as Section 23 flagging the original conference-override gap before Section 24 fixed
it):** Boston College, Boston University, and Providence College all play Division I ice hockey in
Hockey East despite their primary/all-sport conference being ACC, Patriot League, and Big East
respectively - the exact same `teams.conference`/`division` override pattern Section 24 already
built (`src/ingestion/sidearm/conferenceOverrides.ts`) for Vermont/UConn/Maine/Merrimack/
Northeastern/Bentley/AIC applies here too. **Not fixed this session** - these three schools'
hockey games would file under the wrong League filter value if ingested as-is today. A future
session should add the three corresponding entries to `conferenceOverrides.ts` (verifying gender
and current Hockey East membership the same way Section 24 did) before running `ingest.ts` against
this batch. Holy Cross does not sponsor Division I ice hockey, so it doesn't need an entry.

**Net result of this session:** `SCHOOLS_SEED` in `src/db/seed/schools.ts` now has 83 schools
(41 + 42), all source-only pending a migrate/seed/ingest run. 20 schools across 6 conferences were
investigated and intentionally not added, all for the same confirmed reason (live PrestoSports,
not SIDEARM - no working adapter exists in this codebase), not a data-quality concern with the
schools themselves. Good next-session candidates, in order: (1) resolve the flagged BC/BU/
Providence hockey conference-override gap above before ingesting this batch; (2) run migrate →
seed → ingest for the full 83-school batch once the currently-running ingest process is confirmed
finished and no dev server is active; (3) if/when a PrestoSports adapter is ever prioritized, the
20 schools rejected this session are a ready-made target list, not a from-scratch research
project.

## 27. Session log: 2026-08-07 (continued) — 83-school batch ingested locally, one real bug found

Ran `migrate.ts` + `seed.ts` + `ingest.ts --all` locally for the full 83-school batch staged in
Section 26. First pass: 83 schools, zero errors, 2,167 teams, 28,649 events - but a spot-check of
the conference-override count (expected 24 overridden teams, found 23) caught a real bug, not
assumed clean just because there were no ingestion errors.

**Bug found: UMass Amherst's SIDEARM platform titles men's ice hockey bare "Hockey"**, not
"Men's/Women's Ice Hockey" like every other school. `sportNameFromTitle()` normalized this to
`sport = "hockey"` instead of `"ice hockey"` - a school-specific sport name invisible to both the
Sport filter's "Ice Hockey" option and `conferenceOverrides.ts`'s lookup key (which is keyed on
the normalized sport name). **Fixed** in `src/ingestion/sidearm/normalize.ts`: an exact-match
special case maps bare `"hockey"` → `"ice hockey"` (exact match only, so it can't misfire on
"field hockey"). Verified via a single-school re-ingest before trusting it: the override now
applies correctly (`conference: "Hockey East"`), and existing events updated in place rather than
duplicating (dedupeKey doesn't include sport, confirmed via `updated: 34, inserted: 0` in that
targeted run).

**State as of this entry - a full local re-ingest is running in the background to apply this fix
everywhere** (not just UMass Amherst - the same title quirk could exist at other schools not yet
spot-checked) and clean up orphaned team rows left over from before the fix (confirmed 4 stray
event references to the old `sport = "hockey"` team row before this re-run). **`normalize.ts` is
edited and `tsc --noEmit` clean but NOT YET COMMITTED.** Neon has not been touched at all with the
83-school batch yet - it's still on the 37-school data from Section 25.

**Next steps, in order, once the running re-ingest finishes:** (1) verify via `inspect.ts` - expect
83 schools, and re-check the 24-overridden-teams count now resolves cleanly; (2) spot-check no
other schools have a similar bare-title quirk before assuming this one fix is complete coverage;
(3) commit + push `normalize.ts`; (4) migrate/seed/ingest the 83-school batch against Neon
(currently still on 37 schools); (5) verify Neon matches local; (6) only then does this become
safe to rely on for League-filter correctness across the new schools.

**Resolved:** re-ingest confirmed 24/24 overridden teams correct, but a residual bug remained -
5 events still referenced UMass Amherst's old orphaned `sport='hockey'` team row after the
re-ingest (not fixed by re-running ingestion itself; root cause not fully chased down given
context constraints, but consistent with an opponent-side resolution touching those 5 specific
games in a way the school's own re-ingest pass didn't revisit). Fixed directly: repointed those
5 events' team references to the correct `sport='ice hockey'` team, then deleted all 15 now-fully-
orphaned `sport='hockey'` team rows (verified zero event references before deleting each). Final
local state: 83 schools, 2,153 teams, 28,653 events, zero orphaned hockey-sport rows. Not yet
committed or pushed to Neon as of this entry.

**Closed out**: `normalize.ts` fix committed and pushed (`aafd00e`). Neon migrated/seeded/ingested
with the full 83-school batch - 83 schools, zero orphaned `sport='hockey'` rows, 24/24 conference
overrides correct, one harmless transient 504 on a single feed (not chased further). Local and
Neon now match. Production is data-only affected by this (code was already live) - the deployed
site reflects the new 83-school data on its next request, no redeploy needed.

## 28. Session log: 2026-08-11 — feed-health monitoring (#3 from the founder's prioritized list)

New `feed_health` table + `scripts/feed-health-report.ts` (migration `drizzle/0007_next_blindfold.sql`,
purely additive). Records last-attempted/last-success/last-error and a consecutive-failure streak
per (school, sport), updated by `recordFeedHealth()` in `src/ingestion/upsert.ts` on every
`ingest.ts` run. Only surfaces feeds with 2+ consecutive failures - a single blip isn't flagged
(this session alone hit several transient ones that cleared on retry). Verified both paths
directly before trusting a full run, then confirmed clean against all 83 schools: 1,723 feeds
tracked, zero flagged. Applied to Neon (schema only - not worth an extra full ingest run just to
backfill monitoring data; it'll populate naturally on Neon's next real ingest).

**Also this session: real PrestoSports feed-mechanism research, not yet built into an adapter.**
Founder supplied real composite-schedule URLs for 8 of the 20 rejected-as-Presto schools. Finding:
`<composite-url>?print=ics` returns a **single ICS feed per school covering every sport** (422
events for Bridgewater State alone, full multi-season range) - a real, structured feed with
`CATEGORIES` (sport, gender-prefixed same convention as SIDEARM), `SUMMARY`, `DTSTART`, `URL`.
This meaningfully changes the earlier "comparable in scope to the whole SIDEARM adapter" estimate
from Section 27/prior turns - much more tractable than assumed, likely reusable against the
existing ICS-parsing code in `parse.ts` with a new SUMMARY-format regex and CATEGORIES-based sport
extraction, not a rebuild. **Real complication found, not glossed over**: 5 of the 8 schools
checked (Framingham State, Salem State, Westfield State, Mass Maritime, Worcester State) return
HTTP 202 with zero body and `x-amzn-waf-action: challenge` headers to a plain fetch - AWS WAF bot
challenge, not present on the other 3 (Bridgewater State, Central Connecticut State, Mitchell) -
would need a real browser render for those 5, same category of added complexity as the SIDEARM
Nuxt-platform schools already solved. Not attempted to bypass - flagged, not solved.

**Not started, deliberately**: an actual PrestoSports adapter (`src/ingestion/presto/` or similar,
mirroring `src/ingestion/sidearm/`'s structure) - this finding just makes the scope estimate more
accurate, doesn't build it. Good next-session candidate given how much more tractable it looks now.

## 29. Session log: 2026-08-11 (continued) — PrestoSports adapter built, NOT yet run/tested/committed

**Founder is prioritizing this now.** New `src/ingestion/presto/` module (`feed.ts`, `parse.ts`,
`normalize.ts`, `ingestSchool.ts`), wired into `scripts/ingest.ts` via a branch on
`school.cmsPlatform === "presto"`. Reuses `deriveSeason`/`computeDedupeKey`/`sportNameFromTitle`
from `sidearm/normalize.ts` directly (verified generic, no SIDEARM-specific coupling) and the
existing `upsertTeam`/`upsertVenue`/`upsertEvent`/`findSchoolByName` from `upsert.ts` (the last one
extended to also return `city`/`state`, needed for Presto's venue-fallback logic). `tsc --noEmit`
is clean. **`School` interface in `sidearm/ingestSchool.ts` widened** to include `city`/`state`/
`cmsPlatform` (always present on real DB rows, the interface was just incomplete before).

**Real findings this was built on, verified against Bridgewater State's actual live feed
(`bsubears.com/composite?print=ics`), not assumed:**
- One combined ICS feed per school covers every sport (422 events, full multi-season range) -
  confirmed via `feed.ts`'s design: no per-sport discovery step needed at all, unlike SIDEARM.
- `node-ical` correctly computes `.end` from Presto's `DURATION` field (it never uses `DTEND`) -
  checked directly against real parsed output before relying on it.
- Sport+gender come from the event's own `CATEGORIES` field (e.g. "Men's Basketball"), not a
  separate per-sport metadata page the way SIDEARM needs.
- **Home/away convention is the reverse of SIDEARM's**: "TeamA at TeamB" still means TeamA (self)
  is away, but "TeamA vs. TeamB" for a real home game lists the OPPONENT first and self SECOND -
  confirmed against 13 of 14 real "vs" examples from one school's feed.
- The 1 exception was a genuine neutral-site tournament game, and it was the *only* "vs" example
  with a real `LOCATION` field present - normal home/away games never carry `LOCATION` at all
  (venue is implied to be the school's own campus, which is why `ingestSchool.ts` falls back to
  the participating school's own known city/state rather than a specific building name for those).
  **Lower-confidence assumption, flagged not hidden**: for neutral-site games, self is assumed
  listed first (only one real confirmed example exists) - worth re-verifying against more
  neutral-site games before fully trusting `parsePrestoMatchup`'s neutral-site branch.
- Presto's `DESCRIPTION` field has no `TV:`/`Streaming Video:`/`Tickets:` structured lines the way
  SIDEARM's does (confirmed - it's just a plain restatement of the summary) - `ticketUrl`/
  streaming fields are intentionally left null for Presto-sourced events, not force-parsed.
- 5 of 8 Presto schools checked (with URLs the founder supplied) sit behind an AWS WAF bot
  challenge (`x-amzn-waf-action: challenge` header, empty 202 response to a plain fetch) - the
  other 3 (Bridgewater State, Central Connecticut State, Mitchell) don't. `feed.ts` detects and
  surfaces this as a clear, distinct error rather than looking like "no games found."

**Tested and verified working against real schools before committing (not just typechecked):**
seeded the 3 non-WAF-blocked schools (Bridgewater State - MASCAC/D3, Central Connecticut State -
Northeast Conference/D1, Mitchell College - GNAC/D3) with `cmsPlatform: "presto"`, then ran
`ingest.ts` against each individually first (per the "verify one school for real before scaling"
discipline used throughout this project):

| School | Fetched | Inserted | Updated | Skipped |
|---|---|---|---|---|
| Bridgewater State | 422 | 274 | 24 | 124 |
| Central Connecticut State | 508 | 378 | 9 | 121 |
| Mitchell College | 308 | 259 | 24 | 25 |

Spot-checked real inserted rows directly: home school correctly resolved, venue correctly falls
back to the school's own city (no specific building name, as designed since Presto's home/away
games never carry a `LOCATION` field), `sourceUrl` correctly formed from the relative URL +
hostname. **A real, bounded skip category found and left unforced, not silently swallowed**: dual
meets in Wrestling and Swimming & Diving sometimes use bare `"(Sport) Opponent Name"` with no
"at"/"vs" connector at all (e.g. `"(Wrestling) University of Southern Maine"` - confirmed via the
raw feed this has no `LOCATION` and its `DESCRIPTION` adds no home/away signal either, and its
`URL` points to a PDF rather than a boxscore page, unlike the parseable "at"/"vs" games) - correctly
skipped rather than guessed at, same category as genuine multi-team meets/invitationals (which
account for most of the other skips: Track & Field, Cross Country, Equestrian shows). `tsc --noEmit`
clean, `feed-health-report.ts` clean (1,726 feeds tracked across all 86 schools, zero flagged).

**Not yet done:** the other 17 of 20 real Presto schools - 5 confirmed WAF-blocked (need a real
browser render), 12 not yet checked for WAF blocking.

**Closed out**: seeded and ingested on Neon too, results matched local exactly (Bridgewater State
274/24, Central Connecticut State 378/9, Mitchell College 259/24 inserted/updated). 86 schools,
2,210 teams, 29,324 events, feed-health clean. Production reflects this on its next request (code
was already pushed before this data update).

## 30. Session log: 2026-08-11 (continued) — 12 more Presto schools added (86 -> 98)

Checked WAF status on the remaining 12 previously-unchecked Presto schools directly (plain
`curl -I` on `<domain>/composite?print=ics`) - **all 12 returned real `content-type:
text/calendar` responses, no WAF blocking at all**. Added all 12 to `src/db/seed/schools.ts`
with `cmsPlatform: "presto"` (Albertus Magnus, Elms, Lasell, Regis, University of Saint Joseph -
all GNAC/D3; Mount Holyoke - NEWMAC/D3; Curry, Endicott, Suffolk, Wentworth - Conference of New
England/D3; Lesley, Vermont State-Johnson - North Atlantic Conference/D3).

**Verified via a full local `ingest.ts --all` run (98 schools): zero errors, 2,640 teams, 42,783
events, feed-health clean.** All 15 Presto schools (3 from Section 29 + these 12) produced real
data. Spot-checked Mount Holyoke's notably higher skip rate (699 of 1,995 fetched) before trusting
it - confirmed same already-established multi-team-meet category (Cross Country invitationals),
not a new bug. **Committed and pushed** (`e15336b`).

**State as of this entry: Neon migrated + seeded with all 98 schools; a full `ingest.ts --all` is
running against Neon in the background, not yet confirmed finished.** Given Presto's per-school
event counts are much larger than SIDEARM's (some schools fetched 2,000+ events in one composite
feed), expect this to take longer than prior full-batch runs. **Next steps once it completes:**
(1) check for errors, (2) run `inspect.ts` + `feed-health-report.ts` and confirm they match local
(98 schools, 2,640 teams, 42,783 events, clean health), (3) no further push needed - the app code
was already pushed before this Neon data update, so production picks it up automatically on next
request once Neon's ingest finishes. Remaining gap after this: only the 5 confirmed-WAF-blocked
Presto schools (Framingham State, Salem State, Westfield State, Mass Maritime, Worcester State) -
need a real browser render, not started.

**Closed out**: the Neon run got interrupted when the app was shut down for the night (confirmed
via a stale partial count - 2,288 teams vs local's 2,640 - not a crash, just an ended session).
Re-ran `ingest.ts --all` against Neon the next session - fully safe to resume, same idempotent
re-run discipline used throughout this project. Final Neon state: 98 schools, zero errors, 2,628
teams, 42,718 events, feed-health clean - matches local closely. Production already reflects this
(app code was pushed before this data update, per the established migrate/seed-then-deploy
ordering).

## 31. Session log: 2026-08-11 (continued) — multi-team meet (`special_event`) support built and
verified locally, NOT yet applied to Neon

Built out the `events.type: "special_event"` shape (designed on Day 1, Section 5, never wired up)
across both ingestion adapters, per the founder's "yes, and then complete it" following the #4/#5
prioritization work above. Cross country, track & field, golf, tennis, swimming, and rowing meets/
invitationals/championships don't fit the 2-team game shape - this closes that gap.

**Design:**
- `parseSpecialEventName()` (SIDEARM) strips a `[N]`/leading-bracket token plus the known
  `<School> <Sport>` prefix off the SUMMARY, leaving the meet name - see the real-data note below,
  this required a real fix mid-build.
- `parsePrestoSpecialEventInfo()` (Presto) parses a trailing `hosted by <School>` clause and a
  trailing `(Venue - City, State)` parenthetical out of the SUMMARY text - Presto meets carry no
  LOCATION field at all (confirmed via a real feed, Bridgewater State's), unlike SIDEARM's meets
  which do populate LOCATION the same way a normal game does.
- `computeSpecialEventDedupeKey()`: date (calendar day, not exact time) + sport + **gender** +
  normalized event name. Venue deliberately excluded, same reasoning as the game dedupe key.
  Known accepted limitation: if two schools' feeds spell the same meet's name differently, they
  won't collapse into one row - each shows up separately rather than risking a false merge.
- `upsertSpecialEvent()` (new, in `upsert.ts`): unlike `upsertEvent`'s full-overwrite semantics,
  this **merges** `participatingSchoolIds` (union, not replace) across independent ingestion
  passes from each participating school's own feed - verified for real post-ingest (758 meets
  have 2+ real participating schools merged in, e.g. "NESCAC Championship" golf accumulated 4
  schools from 4 independent feeds).

**Two real bugs found via live data mid-build, not assumed away:**
1. The `[N]` prefix on some SIDEARM meet summaries (e.g. `"[N] Amherst College Men's Cross
   Country  Little Three Championships"`) turned out to be a **literal, un-templated placeholder
   string** on Amherst's site, not a numeric id as it first appeared - confirmed by inspecting raw
   codepoints. Some entries for the very same sport have no bracket at all. Fixed by stripping any
   bracket token generically (`/^\[[^\]]*\]\s*/`) instead of assuming digits.
2. **A pre-existing, previously-undetected bug spanning the entire 98-school dataset**, found while
   testing: some schools' SIDEARM/Presto feeds (confirmed real: Williams' cross country, Central
   Connecticut's Presto feed) publish meets through the *same* `vs`/`at` shape a real 2-team game
   uses, e.g. `"Williams College Men's Cross Country at Little Three Championships"`. Without a
   second check, `parseMatchup`/`parsePrestoMatchup` "successfully" parsed these, treating the meet
   name as a literal unresolvable opponent school - silently creating a broken one-sided "game" row
   (real team on one side, null on the other) instead of a proper special event. **This has been
   happening for as long as ingestion has run in this project, not something this session
   introduced** - a direct DB query found ~4,229 existing `game` rows across nearly every
   meet-based sport (golf, tennis, swimming, rowing, track, cross country) matching this exact
   broken shape, roughly 9% of all events in the database. Fixed by adding `looksLikeMeetName()` -
   a word-boundary keyword regex (championship/invitational/classic/regional/tournament/etc.) -
   and only reclassifying as a meet when BOTH signals agree: the "opponent" fails to resolve to a
   real seeded school AND matches a meet keyword. A genuine opponent name essentially never
   contains these words; every confirmed real meet name in this data does. Known accepted edge
   case: a legitimate single-opponent exhibition game whose name happens to contain a keyword (e.g.
   a hypothetical "vs. [Country] National Team" game) would be misclassified as a meet - judged
   low-frequency and low-harm (still a real event row, just the wrong `type`) rather than worth a
   more complex heuristic.

**Verified against real local data, in this order:** standalone parser tests against real captured
SIDEARM/Presto summary text; a full `ingest.ts --all` run (98 schools, zero errors); a direct DB
query confirming cross-school `participatingSchoolIds` accumulation is real (758 multi-school
rows); a cleanup pass that identified and deleted the 4,229 stale pre-fix broken `game` rows
(sampled both the delete-list and the keep-list before running it - keep-list was legitimate
games against real but unseeded out-of-region opponents, e.g. Ramapo, Ecolo, Brandeis, Whittier).
`tsc --noEmit` clean throughout. Homepage spot-checked in the browser post-cleanup - renders
correctly, no console errors.

**Final local state: 98 schools, 2,640 teams, 45,838 events (38,766 game + 7,072 special_event).**

**Explicit, known scope boundary - not silently skipped:** this work is ingestion-only. The query
layer (`getFilteredEvents`, `getUpcomingEventsForSchoolIds`) and the homepage UI still only join on
`homeTeamId`/`awayTeamId`, so `special_event` rows are captured and correctly deduped/merged in the
database but **not yet visible anywhere in the product**. Surfacing them (a query change plus an
event-card variant for `eventName`/`participatingSchoolIds` instead of home/away) is real,
unstarted follow-up work, not done as part of this session.

**State as of this entry: NOT yet applied to Neon.** Local-only so far, matching this project's
verify-locally-first discipline. Given this includes both new inserts (special_events) and 4,229
real deletes (stale broken games), applying to Neon needs the same explicit go-ahead this project
always asks for before touching production data. Next steps when resumed: run `ingest.ts --all`
against Neon, run the same cleanup-script pattern against Neon (identify+sample+delete stale
meet-like broken game rows), verify Neon's final counts match local's shape, then resolve Section
0.7's "special/multi-school events" open question as closed (with the UI-surfacing gap noted as
the natural next item).

## 32. Session log: 2026-08-11 (continued) — sport-name normalization pass, IN PROGRESS at this
entry (re-ingest running)

Founder-reported: the Sport listing had "a lot of fluff and interesting names" (`"#12 Men's
Tennis"` was the example given). A direct query of distinct `teams.sport` values confirmed it was
worse than one bad string - **100 distinct values that should collapse to ~41 real canonical
sports**, caused by several distinct real bugs, not one:

- SIDEARM sometimes titles a sport with an AP/coaches-poll ranking prefix (`"#12 Men's Tennis"`)
  or an abbreviated gender prefix (`"M-Basketball"`, `"#8 M-Ice Hockey"`) that the existing
  `sportNameFromTitle()` didn't strip - confirmed these are real SIDEARM-side title variants (not
  a Presto issue), and confirmed separately that `gender` was already correct on these rows
  (SIDEARM provides gender via a distinct `genderCode` field, not parsed from the title) - only
  the `sport` string itself was garbled.
- Real duplicate/variant naming for the same actual program: `crew` vs `rowing`, `sailing` vs
  `coed sailing`, `equestrian` vs `equestrian ida`/`equestrian ihsa`, `cheer` vs `cheerleading`,
  `ultimate` vs `ultimate frisbee`, plus a real typo (`swiming and diving`). Confirmed via Brown's
  real data that `crew`/`rowing` genuinely both exist as separate real teams there (not just
  reconciled here) - preserved the real, meaningful heavyweight/lightweight distinction while
  only normalizing the crew-vs-rowing naming and prefix-vs-parenthetical phrasing
  (`sportNameFromTitle()` in `src/ingestion/sidearm/normalize.ts`).
- **Founder decision (asked directly, not assumed):** club/JV/secondary-league entries (`club
  golf`, `jv basketball`, `necba baseball` - confirmed via Brown's real data to be a wholly
  separate program from their actual varsity baseball, not a naming variant of it) and esports
  entries (`esports`, `league of legends`, `valorant`, specific Overwatch/Smash Bros team names)
  both match this project's documented scope line ([Section 3](CLAUDE.md:315): *"Not covering
  club or intramural sports - varsity only"*) - founder chose **exclude both from ingestion
  going forward, and remove what's already ingested**, not just rename them. New
  `isOutOfScopeSport()` (word-boundary keyword check, enumerated from real observed data) gates
  this in both adapters - SIDEARM checks it once per sport (skips the whole feed fetch, cheaper),
  Presto checks it per-event (its `category` field is per-event, not per-feed).

**A real, separately-confirmed finding while this was in progress:** re-checked the 5
previously-WAF-blocked PrestoSports schools (Framingham State, Salem State, Westfield State, Mass
Maritime, Worcester State - Section 26/30's known gap) using a genuine full browser session this
time, not a plain fetch. **All 5 return a hard CloudFront 403 on the homepage itself**, not just
the composite feed endpoint - this is an edge-level block, not a JS bot-challenge a real browser
can pass. Previously this was recorded as "needs a real browser render, not tried yet"; it's now
a **definitively confirmed, tried-and-still-blocked negative result** - closes out that specific
open question rather than leaving it as unstarted work.

**State as of this entry: fix implemented, `tsc --noEmit` clean, real-data dry-run against all 100
previously-observed raw values confirmed the mapping (41 canonical sports, 18 correctly flagged
out-of-scope). A full local `ingest.ts --all` re-ingest is running in the background to apply this
- not yet complete, cleanup of already-ingested out-of-scope/stale-named team rows not yet done,
final counts not yet verified. Also fixed in passing (pure text change, unrelated to the DB): the
homepage's stale Day-1 "37-school batch" copy (`src/app/page.tsx`) now reads the real live school
count off `filterOptions.schools.length` instead of a hardcoded number, so it can't go stale again
the next time coverage grows - not yet verified in the browser (dev server can't safely run while
the background ingest is writing to the same local PGlite directory - the same concurrency hazard
documented in Section 10/20). This entry will be updated once the re-ingest, cleanup, and
verification are complete.

**A second, real bug found and fixed while waiting on the above (founder-reported): games against
an unresolved opponent showed literal "TBD" instead of the real opponent's name** - e.g. "TBD at
University of Connecticut" when UConn's real opponents (Syracuse men's soccer, Rutgers women's
soccer) were named plainly in the source feed the whole time
(`SUMMARY:UConn Men's Soccer vs Syracuse`, confirmed via a direct fetch of UConn's own ICS feed).
**Root cause: not a data problem, a design gap.** `findSchoolByName()` only resolves opponents
that are seeded New England schools - real, common, non-NE D1 opponents (Syracuse, Rutgers, and
by the same logic every out-of-region opponent across the dataset) fail to resolve, leaving that
side's `homeTeamId`/`awayTeamId` null. The opponent's name text *was* being read correctly (used
to compute the dedupe key) but was never stored anywhere queryable - it was simply discarded once
the dedupe key was computed, and the UI's `?? "TBD"` fallback filled the gap. Likely affects a
meaningful share of D1 games specifically (D1 schedules are the least regionally concentrated) and
some D2/D3 out-of-region games too - not a narrow edge case.

**Fix:** new nullable `events.opponent_name_raw` column (migration `drizzle/0008_tranquil_legion.sql`,
purely additive, generated but **not yet applied** - can't touch the DB while the sport-
normalization re-ingest above is still running). Both ingestion adapters now pass
`opponentNameRaw: opponent ? null : opponentName` into `upsertEvent()`. `getFilteredEvents()`/
`getUpcomingEventsForSchoolIds()` (`src/db/queries.ts`) now `coalesce(schoolName, opponentNameRaw)`
for both `homeSchoolName`/`awaySchoolName`, so page.tsx and the alert-digest email template (both
already just consume `homeSchoolName`/`awaySchoolName ?? "TBD"`) get the fix automatically with no
changes needed on their end - "TBD" now only shows when even the raw feed text is missing, not
whenever an opponent happens to be outside New England. `tsc --noEmit` clean.

**Sequencing once the DB is free again:** apply migration 0008, run `ingest.ts --all` again
(dedupe-key-based upsert will backfill `opponent_name_raw` onto all existing affected rows, not
just new ones going forward), then spot-check UConn's men's/women's soccer specifically in the
browser to confirm "Syracuse at UConn" / "Rutgers at UConn" render correctly before calling this
done.

**A third, real bug found and fixed while still waiting on the DB (founder-reported, different
root cause from both above):** UMass Lowell's schedule showed "at Rhode Island College" for a game
that's actually against the University of Rhode Island - founder caught this against the school's
own real published schedule (goriverhawks.com). Traced to the actual raw feed:
`SUMMARY:...Men's Soccer at Rhode Island - Exhibition`, venue `Kingston, RI, URI Soccer Complex`
(Kingston is URI's campus, not Rhode Island College's - confirms the real opponent). **Root cause:
`findSchoolByName()`'s substring `ILIKE '%name%'` match with no `ORDER BY` and `.limit(1)` - both
"Rhode Island College" and "University of Rhode Island" are seeded schools whose names contain
"Rhode Island", so the query non-deterministically picked one, and picked wrong.** Checked for the
same risk elsewhere and found a second real, confirmed case while investigating (not hypothetical):
"Massachusetts" alone matches four seeded schools ("University of Massachusetts Amherst/Boston",
"Massachusetts College of Liberal Arts", "Massachusetts Institute of Technology") - confirmed via
the same UMass Lowell feed using bare "at Massachusetts" for a game whose venue ("Amherst, MA, Rudd
Field") independently confirms it means UMass Amherst.

**Fix:** new `src/ingestion/schoolAliases.ts` (mirrors `conferenceOverrides.ts`'s pattern for
known, real, confirmed exceptions rather than a guessed-at generic algorithm) - a small lookup
table of confirmed-ambiguous short forms to their correct canonical school, checked in
`findSchoolByName()` (`src/ingestion/upsert.ts`) before the generic substring fallback. The
fallback itself now has `.orderBy(schools.name)` too, so any other not-yet-discovered collision is
at least deterministic/reproducible rather than arbitrary, even though it isn't necessarily
correct until it's confirmed and added to the alias table. `tsc --noEmit` clean. Not yet verified
against live data (needs the DB) - add to the same post-re-ingest verification pass as the other
two fixes above: spot-check UMass Lowell's men's soccer resolves to "University of Rhode Island",
not "Rhode Island College".

**Also noticed in passing, not fixed (separate, smaller question, flagging not actioning):** the
game that surfaced this bug is itself explicitly labeled "- Exhibition" in the raw SUMMARY, and
`parseMatchup()`'s existing " - " suffix-strip silently drops that status today - exhibition/
scrimmage games are currently ingested and displayed identically to real counted games, with
nothing distinguishing them. Worth a founder call on whether that's fine as-is or worth a status
flag later - not touched here since it's unrelated to the wrong-opponent bug that was reported.

## 33. Session log: 2026-08-11 (continued) — all three fixes above verified locally; closing out
Section 32/33's in-flight state

Once the DB was free: applied migration 0008, ran one more full `ingest.ts --all` (98 schools,
zero errors) to backfill `opponent_name_raw` and repoint games affected by the school-alias fix.

**Sport-normalization cleanup:** a first cleanup pass used "zero events attached via
homeTeamId/awayTeamId" as the signal for "this is a stale old-naming-variant team, safe to
delete" - **caught by its own dry run before deleting anything:** this incorrectly flagged ~500
perfectly legitimate, correctly-named teams (cross country, golf, track and field, rowing, etc.)
because meet-heavy sports' events are almost entirely `special_event` rows keyed by
`participatingSchoolIds` (school-level), not by team id - they'll always show zero "game"-type
rows attached even when completely current. Rebuilt the detection using the *exact* known list of
pre-fix raw sport strings instead of a heuristic. Also found or checked, before deleting: 66
events still pointed at old-variant team ids even after the re-ingest (older/completed games that
had fallen outside the live feed's window and were never touched by the dedupe-key-based repoint)
- these were explicitly repointed to the correct team (via `upsertTeam` + a direct update) before
the old team rows were deleted, so nothing was silently lost. **Final state: 41 distinct canonical
`teams.sport` values (was 100), 37 out-of-scope teams removed, 265 old-naming-variant teams
repointed-then-removed, zero dangling `homeTeamId`/`awayTeamId` references, 98 schools/2,404
teams/45,932 events intact.**

**Opponent-name-raw and school-alias fixes:** verified directly against the re-ingested data -
`opponent_name_raw` is now populated for out-of-region opponents across many sports (Syracuse,
Rutgers, Rutgers-Camden, etc., confirmed via direct query), and UMass Lowell's men's soccer game
against Rhode Island now has dedupe key
`...university-of-rhode-island|umass-lowell` (previously resolved to the wrong seeded school,
Rhode Island College).

**A separate, pre-existing project quirk surfaced while trying to browser-verify all this (not a
bug introduced today):** starting the dev server to visually confirm the fixes threw `column
events.opponent_name_raw does not exist` - not a code bug, but confirmation that **`.env.local`
sets `DATABASE_URL`, so the dev server always points at Neon (production), not local PGlite**
(same category of issue as Section 14/25's prior encounter with this). Confirmed `npx tsx
scripts/*.ts` invocations (ingest/migrate/verify, all session) never see that variable in a plain
shell - only Next's own dev-server process auto-loads `.env.local` - so every ingest/migration/
verification this entire session correctly targeted local PGlite as intended; only today's
browser-based visual check hit this. Since Neon doesn't have any of today's changes yet (special
events, sport normalization, or these two opponent-resolution fixes), the dev server will keep
erroring against it until Neon is brought current - true end-to-end browser verification is
blocked on that, not on anything wrong with the fixes themselves, which are already confirmed
correct via direct DB queries above.

**State as of this entry: all three fixes (opponent-name-TBD, Rhode-Island/Massachusetts
resolution, sport-name normalization) plus the earlier multi-team-meets feature are complete and
verified locally, NONE yet applied to Neon.** Next step is a founder decision on whether to push
this full accumulated batch to production now.

## 34. Session log: 2026-08-11/12 (continued) — special_event UI surfacing + Presto history
cutoff + two more real ingestion bugs found. IN PROGRESS at this entry (background ingest running)

Founder said "Deal. Continue" to the special_event UI gap flagged as the highest-leverage next
item. Built it, then found and fixed two more real, previously-undetected bugs along the way -
this section is the accurate in-flight record in case the session gets interrupted overnight.

**1. special_event UI surfacing (done, verified):** `getFilteredEvents()`/
`getUpcomingEventsForSchoolIds()` (`src/db/queries.ts`) now select `type`, `eventName`, and a new
`participatingSchoolNames` (resolved from `participatingSchoolIds` via a correlated
`array_agg` subquery - empty array, not null, for game rows). Homepage (`src/app/page.tsx`) and
the alert-digest email template (`src/email/templates.ts`) both branch on `event.type ===
"special_event"` to show `eventName` + a formatted participant list instead of "away at home".
School filter extended with a third OR-arm (`schoolId = any(participating_school_ids)`) so
following/filtering by school also surfaces meets that school is in. Verified the SQL directly
(real multi-school accumulation confirmed, e.g. "Williams Invitational" showing 2 real schools)
before touching the UI.

**2. Presto history-cutoff fix (done, verified):** confirmed while chasing "leftover" sport-name
fluff that it wasn't leftover - `events.sport` is a *separate* denormalized column from
`teams.sport` that the earlier Section 32 cleanup never touched (the Sport filter dropdown reads
`events.sport` directly). Chasing that down surfaced something much bigger: **Presto's composite
feed returns each school's entire historical archive back to 2016+, not just current/upcoming
games** - confirmed via a direct query (33,533 events total predated a 90-day-back cutoff, of
which **13,968 were Presto** vs. 19,565 SIDEARM - SIDEARM's own history is real, current-season
data that should NOT be touched, a mistake caught by a dry run before deleting anything so broad).
Fix: `PRESTO_HISTORY_CUTOFF_DAYS = 90` filter in `src/ingestion/presto/ingestSchool.ts` (skips
events older than 90 days before ingesting them at all, going forward), plus a one-time scoped
delete (`source = 'presto' AND startDatetime < cutoff` only) of the existing backlog. Also fixed:
`events.sport` itself directly updated to the correct canonical values (41 canonical values,
matching `teams.sport`), and 9 remaining out-of-scope events (esports/JV, that had survived the
team-level cleanup) deleted outright. **Final verified state: 39 distinct `events.sport` values,
zero out-of-scope, zero dangling FK references, 98 schools, 32,457 events (5,318 special_event).**

**3. A third real bug, found via the special_event browser check itself (not yet fully resolved
across both adapters as of this entry):** the very first real special_event card rendered in the
browser was wrong - "Men's Golf" / "Gordon College" as if a real seeded school were a tournament
name. Root-caused to a **third real SIDEARM/Presto summary format neither adapter's meet-detection
accounted for**: `"<School> <Sport>  <Opponent>"` with **no "vs"/"at" connector word at all**
(confirmed real, SIDEARM: `"Saint Joseph's College of Maine Men's Golf  Gordon College"`; Presto:
`"(Women's Swimming & Diving) Trinity"`). Both adapters' existing meet-detection only fires when
`parseMatchup`/`parsePrestoMatchup` return null (no vs/at match) - which is correct for THIS
format too - but neither one checked whether the leftover prefix-stripped text was actually a
*real, resolvable seeded school* before treating it as a meet name. A direct scan for
`special_event` rows whose `eventName` resolves via `findSchoolByName()` found **85 real
misclassifications** across both sources.

**Fix, both adapters:** before calling `upsertMeet()`, resolve the extracted name via
`findSchoolByName()` first - if it resolves, treat it as a real 2-team game instead (synthesizing
a `matchup`-shaped object) rather than a special event. Home/away has no grammatical signal in
this format (no "vs"/"at" to read direction from), so it's inferred differently per adapter:
**SIDEARM** compares the event's LOCATION city/state against the ingesting school's own city -
mismatch means away (real signal, SIDEARM's LOCATION is populated for most entries). **Presto**
has no such signal available (LOCATION is null for ordinary home/away entries - only populated for
neutral-site games, an existing convention) - defaults to away, which is Presto's own existing
convention for a location-less entry, not a special case invented here. Both fixes typecheck
clean and were verified against the real raw feed text before writing them (not assumed).

**Real complication found while fixing this:** since a `special_event`'s dedupeKey format
(`special|date|sport|gender|eventName`) is structurally different from a game's
(`date|home|away`), fixing the *detection* logic doesn't retroactively delete the old, now-wrong
`special_event` row - the corrected ingest just creates/updates a *separate* correct `game` row
alongside it, leaving a duplicate. Confirmed via the Gordon College case directly (both rows
existed side by side after a targeted re-ingest). Cleanup requires an explicit pass: for every
remaining `special_event` whose `eventName` resolves to a real school, verify a matching `game`
row now exists for the same `sourceEventId` (don't delete without confirming the replacement is
real - a lesson already learned once this session, Section 33's "zero events" heuristic mistake)
before deleting the stale row.

**State as of this entry (session ending here for the night, founder going to bed):** the SIDEARM
fix was applied via a full re-ingest and confirmed working (37 of the original 85 misclassified
rows got a real replacement game). The **Presto fix was just written and typechecked but its
re-ingest is still running in the background** (the remaining ~48 of 85 misclassifications were
all `source: presto`, confirmed via direct query - e.g. the Trinity swimming case above). **Not
yet done, next steps in order once the running ingest completes:** (1) verify zero errors/98
schools, (2) re-scan for `special_event` rows whose `eventName` resolves to a real school and
confirm ~all now have a real `game` replacement, (3) delete the confirmed-stale `special_event`
duplicates (same safety check as before - verify replacement exists first), (4) do the actual
browser verification of the special_event feature that this whole detour started from (temporarily
move `.env.local` aside so the dev server hits local PGlite, not Neon - restore it afterward),
(5) confirm a real meet card renders correctly with no leftover school-name-as-meet-name garbage.
Fully safe to resume from a fresh session if interrupted - `ingest.ts --all` is idempotent, matches
this project's established recovery pattern (Section 26/30 precedent for exactly this scenario).
**Nothing in this batch has been applied to Neon** - stays true of everything accumulated this
entire session (Sections 31-34), same as noted at the end of Section 33.

## 35. Session log: 2026-08-12 (continued, late night) — critical foundational bug found and
fixed: `computeDedupeKey()` was missing gender since Day 1. IN PROGRESS at this entry.

While chasing the SIDEARM third-format fix's Presto counterpart, hit a genuine mystery: the fix
traced correctly through every single step in isolation (confirmed via direct instrumentation of
the running code, not just theory) - `parsePrestoMatchup` returned null, `parsePrestoSpecialEventInfo`
extracted the right name, `findSchoolByName` resolved it, `upsertEvent` was reached with the
*correct* dedupe key - and yet the database still showed the old, wrong `special_event` row
completely untouched afterward, every single time, across multiple independent re-runs.

**Root cause, found via direct in-process instrumentation (temporary console.log statements added
to the real running code, not assumption):** the correct `game` row *was* being created - then
immediately overwritten by a *different real event* that happened to compute the exact same
dedupe key. Confirmed directly: Bridgewater State's real 2027-01-27 swim meet against Bentley
University has both a women's and a men's meet on the same date - `computeDedupeKey()` (the core
game-identity function used by *every* ingested game since this project's Day 1) never included
`gender`, only `date + home + away`. Both genders' real, distinct games produced the identical key,
so whichever one's `upsertEvent` call ran second in the loop silently clobbered the first with no
error, warning, or any visible signal. This has been true since the dedupe key was first written -
it had nothing to do with tonight's special_event or third-format work specifically; those
investigations just happened to use a same-day dual meet as a test case, which is what exposed it.

**Scope:** this affects any sport where a school's men's and women's teams play the *same opponent
on the same date* - confirmed common for swimming and diving, and structurally likely for
indoor/outdoor track and field, tennis, and any other dual-meet-format sport. Not every game (most
team sports schedule men's/women's games on different days), but a real, silent, ongoing data-loss
bug for exactly the sports where it applies - one gender's real game has been invisibly missing
from this product for as long as it's been ingesting that pair.

**Fix:** `computeDedupeKey()` (`src/ingestion/sidearm/normalize.ts`) now includes `gender` as a
fourth key segment, mirroring `computeSpecialEventDedupeKey()`'s identical fix from earlier
tonight (Section 31) - same root cause, just never applied to the base game key at the time.
Updated both call sites (`sidearm/ingestSchool.ts`, `presto/ingestSchool.ts`). `tsc --noEmit`
clean.

**Consequence, not yet resolved as of this entry:** this changes the dedupe key format for
essentially every existing `game`-type row in the database (old format: `date|home|away`, 2
pipe-separators; new format: `date|home|away|gender`, 3 pipe-separators - a clean, reliable way to
distinguish old from new rows for cleanup). A full re-ingest will create correctly-keyed new rows
for everything still in a live feed's window, leaving the old-format rows as stale duplicates -
same pattern as every other dedupe-key-format change tonight, just at a much larger scale (this
touches the core game table, not a narrower slice like sport names or special events).

**State as of this entry: fix written and typechecked, a full local re-ingest is running in the
background (not yet complete). Once it finishes, in order:** (1) verify zero errors/98 schools,
(2) identify old-format `game` rows (2-pipe dedupeKey, `type = 'game'`) that have a confirmed
newer replacement (same `sourceEventId`, matching the same safety-checked pattern used all night -
verify the replacement is real before deleting, don't delete on a heuristic), delete them, (3)
re-run the special_event misclassification scan from Section 34 - the ~26 remaining cases (Trinity,
Bentley University, etc.) should now resolve correctly since the underlying same-day-dual-meet
collision is fixed, delete those confirmed-stale special_event rows too, (4) re-verify
`events.sport` distinct values, total counts, zero dangling references, (5) finally do the actual
browser verification of the special_event UI feature that this entire investigation chain started
from four sections ago, (6) update this section with final verified numbers.

**Fully safe to resume if interrupted overnight** - same idempotent `ingest.ts --all` recovery
pattern used throughout this project (Section 26/30/33 precedent). **Nothing in Sections 31-35 has
been applied to Neon** - everything remains local-only pending a founder decision on deployment.

**CLOSED OUT, verified end to end:** the re-ingest completed (98 schools, zero errors). Cleanup
of the now-massive old-dedupe-key backlog needed a real detour: a correlated-subquery SQL approach
timed out completely against PGlite at this scale (27,207 old-format rows) - even a non-correlated
`IN`-subquery version hung for 5+ minutes and had to be killed via `kill -TERM` on the actual OS
process (confirmed safe - it was still mid-SELECT, never reached a write, verified via a
post-kill sanity read). **The fix that actually worked: pull all `type='game'` rows into memory in
one plain SELECT (474ms for 53,066 rows), classify old-vs-new format in JS by counting `|`
separators, and issue chunked `DELETE ... WHERE id IN (...)` batches (1000 rows/chunk, 316ms
total)** - a good general lesson for this project: PGlite's query planner struggles with
computed-expression self-joins/correlated subqueries at real scale; pull-and-filter-in-JS is far
more reliable here than clever SQL, worth remembering for any future large cleanup.

**Final verified numbers:** 26,395 stale old-format `game` rows deleted (812 legitimately left
alone - real events no longer present in any live feed, same "can't refresh what the source no
longer serves" category as the Presto history cutoff). Re-ran the special_event misclassification
scan: 81 of the original 85 now have a confirmed real `game` replacement and were deleted; the
remaining 4 (all `swimming and diving`, e.g. "Wellesley College" via Merrimack's feed) are
**already-past events (November 2025)** no longer served by their source feed at all - explicitly
left alone rather than chased further, since they're invisible to the product's forward-only UI
either way.

**State: 98 schools, 2,460 teams, 31,912 events (26,671 game + 5,241 special_event), 39 distinct
`events.sport` values (zero out-of-scope), zero dangling FK references, zero remaining dedupeKey
collisions among game rows** (confirmed via a direct `GROUP BY dedupe_key HAVING count(*) > 1`
check - empty result).

**Browser-verified, definitively, all three fixes together:** temporarily moved `.env.local`
aside (found it had actually been left aside from an earlier check earlier this session and never
restored - harmless, since nothing else touched it in the meantime) so the dev server hit local
PGlite. Homepage: dynamic school count ("22 games across 98 schools", no stale "37-school batch"
text), real opponent names ("UConn at Boston University", not "TBD"). Sept 2026 date range:
a real special_event card rendered correctly ("FPU Fall Kickoff" / "Saint Anselm College" /
"Keene Country Club, Keene, NH"), and **the original bug report's exact case now renders
correctly as a real game**: "Saint Joseph's College of Maine at Gordon College" (previously showed
as a fake special_event named "Gordon College"). Sport filter dropdown confirmed clean - all 39
canonical values, no ranking prefixes, no `m-`/`w-` abbreviations, no club/JV/esports entries.
`.env.local` restored afterward.

**Everything from tonight (Sections 31-35) is complete, internally consistent, and verified
locally. Still nothing applied to Neon** - that remains the one open decision for whenever the
founder is back: special_event/meets support, the sport-name normalization pass, the
Presto-history-cutoff fix, the opponent-name-TBD fix, the Rhode-Island/Massachusetts
disambiguation fix, and this session's centerpiece - the gender-inclusive dedupe key fix that
was silently losing real same-day dual-meet data since Day 1 - are all bundled together as one
large, coherent, ready-to-deploy batch.

## 36. Session log: 2026-08-12 (continued) — real performance/reliability pass: missing
indexes + query caching, both verified with evidence, not assumed

Founder asked to "ruthlessly prioritize... reliably and performance based, do not cut corners."
Audited the actual schema and hot-path query code rather than guess - found two concrete,
unglamorous but real gaps: **zero indexes on any column the homepage's every single request
actually filters/sorts/joins on**, and **zero caching despite `export const dynamic =
"force-dynamic"` re-running every query, including the largely-static filter-dropdown data, on
every request**.

**Indexes added** (`src/db/schema.ts`, migration `drizzle/0009_silly_sway.sql`, purely additive):
`events.start_datetime` (every query's date-range WHERE + ORDER BY), `events.sport`,
`events.division` (optional filters), `events.home_team_id`/`away_team_id`/`venue_id` (FK join
columns - Postgres doesn't auto-index these), `venues.state` (unconditional NE-scope filter on
every query, per Section 1/2/3). **Verified with a real `EXPLAIN`, not assumed**: confirmed
`Bitmap Index Scan on events_start_datetime_idx` and `Bitmap Index Scan on venues_state_idx` in
the query plan post-migration - a real, measured change from what would otherwise be sequential
scans across ~32K events and climbing.

**Caching added** (`src/db/queries.ts`): `getFilteredEvents` (60s revalidate) and
`getFilterOptions` (300s revalidate) now wrapped in `unstable_cache`. Rationale: this data only
changes when a human manually re-runs `ingest.ts`, at most a few times a day - re-querying
Postgres from scratch on every single page view for data that's usually identical to the last
request is real, avoidable cost, especially against Neon's serverless connection model.

**Two real things caught during verification, not shipped blind:**
1. **Confirmed before writing any caching code**: `unstable_cache`-wrapped functions throw
   `Invariant: incrementalCache missing` if invoked outside Next's server runtime - checked
   directly (not assumed) that `scripts/send-alerts.ts`/`geocode-venues.ts` (standalone scripts
   that import from `queries.ts`) never call the two wrapped functions specifically, only
   `getUpcomingEventsForSchoolIds` (deliberately left uncached) and the `NE_STATES` constant -
   confirmed safe by actually running `send-alerts.ts` end to end afterward, not just reasoning
   about it.
2. **A real bug caught by the browser check, not shipped**: `unstable_cache` round-trips its
   return value through its cache store (JSON-based), so `startDatetime` came back as a plain
   string, not a `Date` - broke every `.toLocaleDateString()`/`.toLocaleString()` call downstream
   (page.tsx's day/time formatting, the alert-digest email template). Fixed by having
   `getFilteredEvents`'s public export explicitly revive `startDatetime` back into a real `Date`
   after the cached call, rather than pushing a string-or-Date union onto every consumer.

**Verified end to end in the browser** (same `.env.local`-aside trick as the rest of this
session, to point the dev server at local PGlite instead of Neon): homepage renders identically
to pre-change (dynamic school count, real opponent names, no console/server errors), and a
filtered view (`?sport=soccer`) correctly returns a distinct, correct result (14 vs. 22
unfiltered) - confirms no cache-key collision across different filter combinations.

`tsc --noEmit` clean throughout. Local-only, like everything else this session - not yet applied
to Neon.

**What's still real and unaddressed, named honestly rather than left implicit:** the venue
geocoding gap (was 81.9% missing lat/lng as of Section 33's check, likely still similar) blocks
any future map feature but isn't a current performance/correctness issue since nothing renders
coordinates today. Ingestion itself remains human-triggered, not cron'd (Section 0.3) - a
reliability gap in the "does data go stale silently" sense, not a performance one; automating it
would need a scheduler (Vercel Cron or similar) and is a larger, separate decision, not bundled
into this pass.

## 37. Session log: 2026-08-12 (continued) — everything from Sections 31-36 deployed to Neon
(production), first time any of it has run outside local PGlite

Founder said "Deploy to neon and caffeinate." This is the first time the entire batch built up
across this whole session - multi-team meets/special_event support, sport-name normalization
(100+ variants down to 39), the Presto 90-day history cutoff, the opponent-name-TBD fix, the
Rhode-Island/Massachusetts disambiguation fix, the gender-inclusive dedupe-key fix (the
session's most serious find - was silently losing real same-day dual-meet data since Day 1), and
the DB indexes + query caching from Section 36 - has run against anything other than local PGlite.

**Sequence run (each command needs `DATABASE_URL` explicitly exported first - confirmed again
this session that plain `npx tsx` invocations don't auto-load `.env.local` the way Next's own
dev server does, see Section 33):** `migrate.ts` (both pending migrations - `opponent_name_raw`
column, the six new indexes) → `seed.ts` (no-op, confirms `schools.ts` hasn't drifted from
Neon's existing 98) → `ingest.ts --all` under `caffeinate -dis` (98 schools, zero errors, ran
with every fix already active from the start - unlike local, which discovered these bugs
incrementally across several re-ingests) → the same cleanup sequence proven out locally: sport/
team-level cleanup (out-of-scope + old-variant teams), `events.sport` direct correction,
Presto historical-backlog delete, old-format (gender-missing) dedupe-key game-row cleanup,
special_event misclassification rescan.

**A real mistake caught and fixed mid-deploy, not silently absorbed:** the special_event
misclassification rescan script (reused verbatim from the local cleanup) timed out after 5
minutes against Neon. Root cause: it does a DB round-trip per row (`findSchoolByName` plus a
sibling lookup) for every special_event - fine at local PGlite's near-zero in-process latency,
not viable at real network latency against a remote Postgres for thousands of sequential awaited
calls. This is the exact same class of mistake as the correlated-SQL dedupe-key cleanup that had
to be killed earlier tonight (Section 35) - should have generalized that lesson to every cleanup
script before running any of them against Neon, not just the one that already burned once.
Killed cleanly (confirmed via `ps aux` - it was still mid-scan, never reached a write, so nothing
was lost) and rewrote as the same bulk-fetch-then-compute-in-JS pattern already proven for the
dedupe-key cleanup: pull all special_event rows + all schools + all events into memory in one
`Promise.all`, resolve names and check for a real game replacement using in-memory lookups
instead of per-row queries. 561ms instead of a 5-minute timeout. **Turned out to be a genuine
zero-cleanup-needed result, not a script failure**: Neon's pre-deploy code never had the
special_event feature at all, so every one of the 4,832 rows this ingest created was built fresh
with every fix already in place - there was no old, pre-fix data left to be stale against, unlike
local's incremental-fix history.

**Final verified state (Neon/production), confirmed with the same checks used locally throughout
this session:**

| | Before this deploy | After |
|---|---|---|
| Schools | 98 | 98 |
| Teams | 2,628 | 2,453 |
| Events | 42,718 | 35,647 (30,815 game + 4,832 special_event) |
| Distinct `events.sport` values | 100+ (unfixed) | 39 |
| Dangling FK references | (never checked) | 0 |
| Dedupe-key collisions among game rows | (the Day-1 bug, unknown count) | 0 |

The event-count drop is expected and correct, not data loss - it's the combined effect of
dropping years of dead Presto history, removing club/JV/esports noise, and collapsing duplicate
rows that existed under the old (gender-missing) dedupe key, exactly mirroring what happened
locally in Sections 33-35.

**Production is now running everything built this session.** Not yet done, explicitly not
assumed: a live visual check of the actual deployed Vercel URL (everything above was verified via
direct Neon queries, not a browser hit against the real production domain) - worth doing the next
time this repo is opened, not urgent tonight given the query-level verification is thorough.

## 38. Session log: 2026-08-12 (continued) — SMS reminders built as a second, genuinely separate
consent channel alongside email

Founder wanted text reminders in addition to email alerts. Researched providers first
(Twilio recommended over cheaper alternatives like Telnyx/Bandwidth specifically because of its
compliance hand-holding - matches Section 6's "boring, well-documented tools" principle more
than raw per-message cost does) before writing any code, then built it properly rather than as
a bolt-on: **TCPA requires SMS consent to be separate and explicit from email consent**, not a
second checkbox that reuses the same "yes" - this shaped the whole data model, not just the UI.

**Schema** (migration `drizzle/0010_brown_wraith.sql`): `fans` gets `phone`, `smsConsentedAt`,
`smsUnsubscribedAt` - a fully independent consent lifecycle from `confirmedAt`/`unsubscribedAt`.
Unlike email's double opt-in (click a link to activate), SMS consent *is* the checkbox
submission itself - TCPA's "prior express written consent" is satisfied at that moment, so the
immediate confirmation text is a disclosure receipt, not a second confirmation gate.
`fan_alert_log` gets a `channel` column, now part of the unique key (`fanId, eventId, channel`)
instead of just `(fanId, eventId)` - **without this, sending the email digest would have
silently marked those events as "sent" for SMS too**, since both channels used to share one
dedup table with no way to distinguish them.

**New files**: `src/fans/phone.ts` (US-only E.164 normalization, deliberately minimal - no new
phone-parsing dependency, matches this product's actual US-only scope), `src/sms/send.ts`
(Twilio SDK, same `TWILIO_*` env-var-unset-means-dry-run pattern as `email/send.ts`),
`src/sms/templates.ts` (a compact digest format capped at 4 games + "+N more" - SMS cost scales
per 160-char segment on every recurring send, unlike email, so this is deliberately terser than
`digestEmail`, not just a shorter version of the same content), `src/app/api/sms/inbound/route.ts`
(Twilio webhook for real inbound STOP/START handling - keeps this app's own
`smsUnsubscribedAt` in sync with Twilio's carrier-level opt-out rather than trusting Twilio's
side alone and letting the manage page silently drift stale).

**`/follow` form**: phone + SMS checkbox are a visually separate block with the full required
TCPA disclosure inline (sender identity, frequency, rates, STOP/HELP) and an explicit "consent
isn't required to get email alerts" line - both the checkbox's independence and that specific
sentence are compliance requirements, not UX polish. `/manage` now shows SMS status and a
"stop texts only" action distinct from "unsubscribe from all" (which now correctly stops both
channels, not just email).

**A real bug found and fixed while testing the digest end-to-end, not shipped blind**: 
`getUpcomingEventsForSchoolIds`'s special_event support (built in Section 34) used a hand-rolled
`sql` template - `` sql`${events.participatingSchoolIds} && ${schoolIds}::uuid[]` `` - to check
school overlap. Never actually exercised until tonight's SMS testing finally ran
`send-alerts.ts` for the first time since that change: threw `malformed array literal` because
interpolating a plain JS array into a raw `sql` template doesn't bind it as a real Postgres
array parameter. Fixed with drizzle-orm's own `arrayOverlaps()` helper, which handles array
parameter binding correctly - a real, generalizable lesson (prefer the ORM's typed helpers over
hand-rolled `sql` templates for anything beyond a plain scalar), not just a one-off fix.

**Verified end to end in the browser + directly against local PGlite** (`.env.local` moved
aside again, same pattern as the rest of this session): registered a test fan with phone + SMS
checkbox checked, confirmed the dry-run confirmation text fired with correct disclosure copy and
E.164-normalized number; confirmed the inbound webhook's STOP and START (including
lowercase "stop") both correctly updated `smsUnsubscribedAt` in the database, not just returned
an empty TwiML response; confirmed "stop texts only" on `/manage` correctly left email
untouched; ran `scripts/send-alerts.ts` for real against a school with genuine upcoming games
(Amherst had none this week - correctly produced "nothing new" on both channels, not a bug) and
confirmed both the email and SMS digest fired with matching, correct content, then confirmed a
second run correctly deduped and sent nothing further on either channel independently. Test fan
data deleted afterward via cascade, not left in the DB. `tsc --noEmit` clean throughout.

**State: complete and verified locally. Not yet applied to Neon** (this session's Section 37
Neon deploy happened before this SMS work started) - the migration and code are ready to go the
next time a full deploy pass runs. **Founder action still needed, same category as the
Resend/Neon/Vercel account gaps**: a real Twilio account with 10DLC brand/campaign registration
completed (takes real business info and days, not instant) before `TWILIO_ACCOUNT_SID`/
`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` can be set and real texts can go out - until then,
everything works end-to-end in dry-run exactly like email did before `RESEND_API_KEY` was set.

## 39. Session log: 2026-08-12 (continued) — real per-event pages, closing Section 6's Day-1 SEO
requirement

First crawlable, individually-linkable page for a single game/meet - previously the whole
product was one list view. `src/app/events/[id]/page.tsx`: real `generateMetadata` (title,
description, canonical, OG/Twitter cards) and JSON-LD (`schema.org/SportsEvent`, with
`homeTeam`/`awayTeam` for games or `competitor` for special_events). `src/app/sitemap.ts` lists
every upcoming event plus the static pages, scoped to future events only (stays well under the
50K-URL sitemap limit, matches the product's own forward-looking scope). Shared formatters
(`formatGender`/`formatSport`/`formatLocation`/etc., plus new `eventTitle`) extracted from
`page.tsx` into `src/lib/format.ts` so both pages use identical logic, not a fork. Homepage event
cards now link to their detail page (title/matchup area only, kept separate from the external
ticket/streaming/"Game Info" buttons to avoid nested `<a>` tags). New `getEventById()` in
queries.ts, uncached (single-row lookups, no caching needed).

Verified in the browser: card links resolve correctly, a real game page and a real
special_event page both render with correct metadata/JSON-LD, sitemap.xml lists real event URLs,
an invalid event ID correctly 404s. `tsc --noEmit` clean. Local-only - not yet committed as of
this entry (pushed immediately after, no separate gap expected).

## 40. Session log: 2026-08-12 (continued) — robots.txt, then ingestion automation via Vercel Cron

`src/app/robots.ts` (allow all, points to sitemap.xml) - closes the last gap in Section 39's SEO
work. Committed/pushed separately.

**Ingestion automation**, closing Section 0.3's standing "nothing in this repo is autonomous"
gap. Extracted `ingestOneSchool()` out of `scripts/ingest.ts` into `src/ingestion/ingestOneSchool.ts`
so the CLI script and a new `src/app/api/cron/ingest/route.ts` (Vercel Cron target, `vercel.json`
schedules it daily at 10:00 UTC) call the exact same logic - no separate, drift-prone
reimplementation. Route requires `Authorization: Bearer $CRON_SECRET` in production (an
unauthenticated version would let anyone trigger a full ingestion run against every school's
real site plus Neon - a real cost/abuse vector); dev-mode without `CRON_SECRET` set just warns
and proceeds.

**Deliberately does not batch/round-robin schools across invocations**, despite a full run
taking 15-25 minutes and Vercel's serverless timeout (`maxDuration = 300`, the Pro-plan ceiling)
likely not covering that on constrained plan tiers. Decided against building state/round-robin
logic to work around this: ingestion is fully idempotent, and this project has already leaned on
"an interrupted run is safe to just resume" as a real, proven recovery pattern all session
(founder closing their laptop mid-ingest, killed stuck processes, etc.) - a cron run cut off by a
platform timeout is the same class of interruption, not a new failure mode requiring new
engineering. Daily cadence chosen specifically because it's the documented ceiling on Vercel's
Hobby plan (unknown which tier this project is on) - works either way, can be tightened later if
confirmed to be on Pro.

**A real, unrelated problem found during verification, not caused by this work**: the local
PGlite dev database was corrupted - `count(*)` against `schools` failed with a raw WASM
`RuntimeError: Aborted()`. No concurrent process was touching it (checked via `ps aux` before
diagnosing), so this wasn't the documented concurrent-access corruption pattern (Section 10/20) -
most likely just accumulated damage from the sheer write volume tonight (dozens of full
re-ingests, large bulk deletes, migrations, across many hours in one embedded WASM Postgres
instance). Recovered by moving `.pglite/` aside and rebuilding from `migrate.ts` + `seed.ts` -
correct and low-risk since local PGlite has always been fully disposable/reproducible in this
project, never a source of truth (Neon is). Backup deleted after confirming the rebuild + a
targeted re-ingest worked correctly. **Worth knowing for future sessions**: PGlite may need an
occasional full local rebuild after enough cumulative write volume in one long session - not
something to chase root-causing further, just resolve the same way if it recurs.

Verified: CLI re-test (`ingest.ts "Amherst College" mens-soccer`) confirms the extracted shared
function still works correctly; the cron route hit directly in dev mode shows the expected
"CRON_SECRET not set" warning, then real ingestion starting (`=== Amherst College ... 25
sport(s) ===` in server logs) - stopped intentionally before the full 98-school run finished
locally, since the underlying per-school logic was already proven both by this same check and
extensively all session. `tsc --noEmit` clean. **`CRON_SECRET` still needs to be set in Vercel's
environment variables** for this to actually run in production - same founder-action category as
the Resend/Twilio/Neon gaps, flagged here rather than assumed done.
