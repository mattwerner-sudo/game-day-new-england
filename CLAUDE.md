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

**Bannerse ([bannerse.com](https://www.bannerse.com/), found 2026-08-13)** — *latent competitor
on sponsor dollars, not a discovery-layer competitor.* Sells a white-label "Fanzone" microsite
directly to individual athletic departments, free of charge (24h white-label launch, zero
engineering effort on the school's side). Bannerse itself buys the paid social traffic
(Meta/TikTok/Instagram/YouTube/Google, ads pre-branded with sponsors) that funnels fans into a
no-login page of gamified engagement — predictions/polls, trivia, selfie contests, cheer zone,
exclusive video, merch drops, rewards, ticket upsells. Every screen inside is sponsor ad
inventory (display, video, sponsored content/interactivity); revenue is split with the school.
No cross-school aggregation of any kind - each Fanzone is single-team, entertainment-first, and
doesn't touch schedule/discovery at all, so there's no overlap with this repo's actual core
product. No public school-name/logo list on their site as of this check - can't yet tell if
they've signed any New England schools specifically.
- **Competitor angle (activates at Gate G3, same framing as NSN above):** if Bannerse signs a
  New England school first, that AD may treat sponsor monetization as already "solved" and be a
  harder sell for GDNE's own Sponsor Dashboard later - same bundle-beats-compete logic as NSN.
- **Complement angle (more interesting than the competitor angle):** their own funnel starts
  with a paid "Traffic" step they fund via social ads - the exact problem this repo's SEO/organic
  discovery traffic already solves for free once a school's own fans are searching for schedule
  info. "GDNE sends organic schedule-seekers into a Fanzone-style engagement layer" is a
  plausible, cheap partner conversation, not a stretch.
- **Business-model reference, useful regardless of partner/competitor status:** their "zero
  cost, zero risk, revenue share, 24h launch" pitch is a clean, already-market-tested script for
  exactly the kind of sponsor-funded ask the Sponsor Dashboard (4.3) will eventually need to make
  to an AD - worth studying the specific framing when that gets built, not just the company's
  existence.
- *Watch for:* any named New England school partnerships appearing on their site, funding/scale
  signals, or a pivot toward cross-school/discovery features that would change the "no overlap"
  read above.

### 0.10 New strategic surfaces from the founder (added 2026-08-14): iOS app + Chrome extension

Founder-directed additions, not part of the original Business Plan v2.5's four surfaces (0.2) —
recorded here so a future session has them as a standing goal rather than something to
re-derive. **Not started, no code/scaffolding exists for either yet** - this entry is a durable
record of the ask, not a design doc; a future session should scope real architecture/feasibility
before building, the same way the ticketing/streaming embed work in Sections 41/47/48 pressure-
tested before implementing rather than assumed.

- **Mobile app on the Apple App Store.** This repo is a Next.js web app today - no React
  Native/Expo/Capacitor project exists. Needs a real feasibility pass (native rewrite vs. a
  webview/PWA-wrapper approach vs. Expo hitting the same API routes this app already exposes) and
  an Apple Developer Program account ($99/year) before anything can ship, on top of App Review.
- **Google Chrome extension.** No `manifest.json`/extension scaffold exists. Likely shape (not
  yet designed): a popup or new-tab override surfacing "what's on this weekend" from the same
  event data this repo already serves, probably via a small public JSON endpoint rather than
  scraping the rendered page. Needs a one-time $5 Chrome Web Store developer registration and
  passes through the Web Store's review process.

Both are genuinely new build items, not extensions of the four planned surfaces in 0.2 - flagged
here specifically so scoping work for either doesn't get conflated with the school portal/sponsor
dashboard/NIL marketplace roadmap.

### 0.11 Near-term revenue streams before the Sponsor Dashboard/NIL Marketplace (added 2026-08-15)

Founder question: how does this make money, and specifically what's *repeatable/forecastable* -
not just the biggest eventual number. The plan's own three unbuilt surfaces (4.2-4.4) are all
real but distant - none is live, and 0.8 already flags "sponsors will pay attributed prices" and
"fans will register" as unproven Class B assumptions, not fact. This section records cheaper,
faster options to test revenue before committing to any of the three big builds, modeled on
proven directory/aggregator/newsletter monetization patterns from outside this codebase.

**Ranked by build cost (cheapest first), each tied to a real external comparable:**

1. **Newsletter sponsor slot** - one flat "presented by" line in the existing digest email/SMS
   (`scripts/send-alerts.ts`, already built and sending). No new infra - the Morning Brew/theSkimm
   model, sold manually to one local business as a pilot before any self-serve tooling exists.
   Cheapest possible test of "will a local business actually pay."
2. **Ticket affiliate commission** - this repo already embeds/links tickets (Vivenu embed,
   Section 47; outbound links to Ticketmaster-Evenue, Hometown Ticketing, etc. for everyone else).
   Most ticketing platforms run affiliate programs; tagging existing outbound links needs no
   product work at all. The standard event-aggregator monetization model (how sites that don't
   sell their own ticket inventory make money).
3. **Fan gear affiliate links** - a Fanatics/school-bookstore affiliate link next to team/school
   names. How sports blogs (SB Nation-era) monetized content before any ad-sales function
   existed. Trivial to add, no dependency on audience size to start earning something.
4. **"Powered by" schedule widget, licensed to schools** - a much smaller slice of the School
   Portal idea (4.2): an embeddable schedule widget sold for a flat monthly fee to one AD, instead
   of building the full free-forever portal. Proven B2B pattern (subscription-priced embeddable
   widgets); closer to "generate an iframe URL per school" than a dashboard.
5. **Paid coaching/staff job listings** - real, proven niche-directory model (industry job boards
   monetize an audience of insiders, e.g. NCSA-style sports recruiting/coaching boards). This repo
   already has a live relationship with 100 athletic departments via ingestion - sellable without
   touching the fan-facing product at all.
6. **Featured/pinned placement** - Yelp/Zillow-style paid boost for a camp, clinic, or program.
   Adjacent to the plan's own "Prospect Mode" idea (0.6, currently deferred to Y3+) but a
   single-paid-badge version is buildable in days, not the full recruiting marketplace.

**Direct comparables worth naming**: MaxPreps built a real, eventually-acquired business on ads
plus a premium stats/recruiting subscription over the same "high school sports aggregator" shape
this repo has. NFHS Network proves schools *and* fans will pay directly for streaming
infrastructure - relevant since this repo already embeds streams (Hudl, NEC Front Row - Section
48). The cautionary comparable is Patch.com - hyperlocal display-ad sales at real scale is
genuinely hard, which is exactly why 0.8 already flags Tier 1/2 sponsor sales as "software is the
smaller half of the problem," not a pure engineering lift.

**Recommended sequencing**: run #1 as the actual pilot (near-zero cost, directly tests the core
unproven assumption). Layer in #2/#3 in parallel since they need no sales motion at all, just
plumbing. Hold #4-6 until #1 shows real conversion - no reason to build more before the cheapest
test has an answer.

**Newsletter platform question: would Kit, Beehiiv, or Substack work?** Evaluated and **no, not
as a replacement for the existing digest** - `send-alerts.ts` sends a genuinely **personalized**
email per user, computed from a live relational query (each user's actual follows joined against
real upcoming events, Section 47's `getUpcomingEventsForFollows`). Kit/Beehiiv/Substack are built
to compose one issue and send it to a list or a few tag-based segments - none of them can
generate a uniquely-computed body per subscriber from an external database the way this repo's
own Resend-based system already does. Migrating the existing digest to any of the three would be
a real downgrade, not a simplification.

Where they *would* be a real fit: a separate, new, **broadcast-style** product - a general "this
week in New England college sports" roundup sent identically to every subscriber, independent of
individual follows. That's a genuinely different product from the personalized digest, not a
replacement for it. Of the three, **Beehiiv is the better fit if that gets built**: it has a
native ad network that matches sponsors to newsletters automatically by content vertical and
subscriber count, which is the only one of the three offering real ad-sponsorship monetization
without doing manual sales - directly relevant to the "repeatable revenue" question. Substack is
subscription/paywall-first (~10% platform cut on reader payments) - a paywalled newsletter cuts
directly against this product's own free-discovery thesis (0.2, 0.8), so it's a worse fit
specifically for GDNE even though it's a fine platform generally. Kit is strongest at
creator automation/funnels (courses, memberships) but has no comparable built-in ad marketplace -
no real advantage over the existing in-house Resend setup for this use case.
**Caveat**: Beehiiv's ad-network payouts scale with real subscriber count and opens - it's a
lever worth pulling once a broadcast newsletter has real list size, not a first-dollar solution;
the manual sponsor-slot pilot (#1 above) is still the faster path to a first real dollar.

### 0.12 Public API - not a new idea, the backbone under an existing one (added 2026-08-15)

Founder asked whether this app could become an API product, referencing Zernio
([zernio.com](https://zernio.com)) as a model. Checked the actual site before answering: Zernio
sells **infrastructure** - one unified API in front of 15+ *other* platforms' own APIs (Instagram,
TikTok, WhatsApp, ad networks), a horizontal play whose value is absorbing the integration pain of
many messy third-party providers. That's not the same shape of business this repo would be in. An
API here would expose **first-party data this repo already owns** (real New England schedules,
results, streaming/ticket links) - closer in kind to a narrow vertical data API (think TheSportsDB
or a regional SportsDataIO) than to Zernio's broad infra play. Real precedent that "sports
schedule data as a paid/free API" is a working model elsewhere, just smaller in ambition here than
Zernio's category.

**Not actually a new item on this list - it's the implementation layer under an existing one.**
Section 0.11 item #4 ("powered by" schedule widget licensed to a school for a flat monthly fee) is
an API consumer by definition - a school embedding a live widget needs *something* serving that
data as JSON, not rendered HTML. The eventual mobile app and Chrome extension (0.10) would also
consume this same API rather than re-implement the query layer twice. Building the API first,
generically, and letting the widget/app/extension be three different clients of it, is the right
order - the API is plumbing, not a fourth product to sell on its own merits (yet).

**Feasibility**: genuinely small relative to most of this session's work - `src/db/queries.ts`
(`getFilteredEvents`, `getFilterOptions`, etc.) already does this exact work for the web pages;
exposing it as JSON under a new `/api/v1/...` route reuses nearly all of it. A read-only v1
(events, schools, filters) is a same-session build, not a new initiative.

**Open, not yet decided**: free/public from day one (matches the top-of-funnel/goodwill instinct
already established for this product, and is the smaller build) vs. paid/API-key-gated from the
start (a real feature - keys, tiers, rate limiting - none of which exists in the schema yet).
Founder hasn't picked a direction as of this entry; revisit before building past a v1 read-only
endpoint.

### 0.13 Where VC dollars are going in 2026, and what it means for GDNE next (added 2026-08-17)

Founder asked, referencing this file plus real 2026 research on where sports-tech VC money is
being deployed: "how else can I make this better?" A cross-check between the business plan
already digested into this section and what the market is actually rewarding right now - not a
relitigation of 0.8-0.12's existing findings, an addition to them.

**Research findings (real 2026 sources):**
1. Sports-tech VC is having its second-biggest year ever - $12.5B deployed through October 2025,
   behind only 2021 ([Capstone Partners](https://www.capstonepartners.com/insights/report-sports-technology-market-update/)). General tailwind, not specific guidance.
2. **"First-party fan-data infrastructure" is now an explicitly named, VC-recognized category**,
   not just this founder's private thesis - investors cite cookie deprecation as "a structural
   challenge in how every rights holder manages fan data" as one of three forces driving 2026
   sports-tech capital ([Nixon Peabody](https://www.nixonpeabody.com/insights/articles/2026/03/24/hot-topics-in-the-middle-market-sports-investments-and-innovations)). The closest external validation 0.8's central open
   question ("will fans register with a third party") has had - the market is independently
   converging on "yes, this has to exist," for the same structural reason (cookies dying) the
   fan-graph thesis (0.1, 0.4) was built on. Doesn't change any recommendation - evidence the
   existing bet (school follows, live since Section 20) targets a real, well-funded category.
3. **AI-powered broadcast/highlight/recap automation is the single highest-confidence sports-
   tech investment for 2026**, cost-reduction thesis now quantifiable at scale ([Capstone Partners](https://www.capstonepartners.com/insights/report-sports-technology-market-update/)).
   GameChanger (Dick's-owned, the closest real comparable to this product's amateur-sports-
   aggregator shape) is rolling out AI cameras "doubling viewership in early pilots"; its
   president calls AI "table stakes in sports" now ([reporting via buyingsandlot.com](https://www.buyingsandlot.com/p/report-major-youth-sports-streamer-could-go-public)). Maps
   directly onto 0.3's Content Agent - the one of the plan's five agents that's both unstarted
   and buildable by a solo founder (unlike Sponsor Match or NIL Compliance, which need real
   sales/legal motions, not just code).
4. **Women's and non-revenue college sports are a real, currently-surging category** - women's
   college basketball viewership up 33% YoY, women's sports viewership overall nearly tripled
   since 2020, global women's elite sports revenue up 340% in four years to ~$3B in 2026
   ([World Economic Forum](https://www.weforum.org/stories/trade-and-investment/women-sport-next-global-growth-market/), [BofA Institute](https://institute.bankofamerica.com/economic-insights/women-in-sports.html)). Directly validates a differentiator this product already
   has - Section 1's "every varsity team, not just marquee sports" coverage principle - as
   something the market is actively rewarding right now, never yet marketed or SEO'd around
   specifically.
5. **Vertical AI's actual 2026 VC thesis is "small teams, one narrow thing done completely,"**
   not broad automation - "the startups pulling premium checks... are the ones doing one
   expensive thing completely" ([VC Cafe](https://www.vccafe.com/vertical-ai-in-2026-the-good-the-bad-and-the-ugly/), [Pulseline](https://pulseline.substack.com/p/the-18b-agent-wave-why-vertical-ai)). Direct, independent validation of 0.3's
   five-narrow-agents operating model - and a discipline check: finish one agent well (Content
   Agent, per #3) before starting a second.
6. NIL data-platform investment is real and growing ($2.6B NIL economy in 2026, House Settlement
   revenue-sharing now live - [OC&C](https://www.occstrategy.com/en/article/scoring-big-unlocking-the-nil-opportunity-in-college-sports/), [Reach Capital](https://www.reachcapital.com/resources/thought-leadership/beyond-the-game-part-1-charting-the-new-frontier-of-nil-sports-and-higher-ed/)) - doesn't change 0.8's verdict that NIL is
   "hardest by a wide margin." Recorded for completeness; the plan's own gate sequencing (G0
   before G3/NIL-adjacent work) holds regardless of how well-funded the category is elsewhere.
7. **Sports Innovation Lab ([sportsilab.com](https://www.sportsilab.com/)), checked directly at the founder's request, is not
   an investor but is real, concrete evidence for #2's fan-graph thesis.** SIL sold a "Fluid
   Fan™ Graph" - fan intelligence from observational/transactional/deterministic data (row-level
   transaction data including major credit/debit cards) across all teams in seven pro leagues
   (NFL, MLB, NBA, NHL, WNBA, MLS, NWSL) - to brands/sponsors (Legends, Kellanova, NASCAR,
   Monumental Sports) for sponsorship targeting, with Dentsu as a distribution partner. **It was
   just acquired by Genius Sports** (NYSE: GENI) specifically "to bolster the world's most
   advanced fan activation platform." Real implication: a completed M&A exit for a business
   whose entire value proposition is "we own the fan graph" - the closest concrete proof point
   that 0.1's central thesis is a real, acquirable asset class, not just an internal framing
   choice. **Not a fit as an investor or near-term customer/partner** - SIL operates at national
   pro-league scale with transaction-level data this product has no access to or need for, and
   there's no sponsor-facing product yet for SIL-style data to plug into (0.8's sponsor
   dashboard still not started). Filed as a landscape/validation reference alongside 0.9's
   Seated/NSN/Bannerse entries, not a lead to pursue.
8. Hudl (the closest well-funded competitor in this exact market) is on an acquisition spree
   into adjacent products - Titan wearables (June 2025), TeamUp gamified athletic fundraising
   (July 2026), its 19th acquisition overall ([Hudl blog](https://www.hudl.com/blog/hudl-acquires-teamup-gamified-fundraising), [Silicon Prairie News](https://siliconprairienews.com/2026/07/hudl-announces-its-19th-acquisition-adding-a-fundraising-solution-to-its-tech-suite-for-coaches/)). Not a threat to
   this product (Hudl is coach/team-ops tooling, this is fan-facing discovery) - added to 0.9's
   landscape watch-list as a signal of where a well-capitalized adjacent player sees value
   (booster fundraising, wearables), filed for reference, not acted on.

**What's genuinely new here vs. 0.8-0.12:** external validation for the fan-graph bet (#2, #7)
and the five-narrow-agents model (#5) - useful for founder narrative/fundraising, not a build
item by itself; a concretely-buildable next agent (Content Agent, #3) that wasn't previously
prioritized since nothing pointed at it specifically; a positioning/marketing angle already
latent in the product (#4) - women's/non-revenue breadth is already built, never surfaced as its
own hook.

**Recommendation 1 (primary): scope a minimal Content Agent, gated on a real results/scores
feasibility check.** This product ingests full schedules but **never captures final scores/
results at all** - `events.status` can be `"final"` but there is no score field anywhere in the
schema. This is the "Results" half of 0.3's "Schedule & Results Agent" that was never addressed
- a completion of an existing idea, not a new one - and the direct prerequisite for any AI-recap
feature (#3), which is realistic "one narrow thing done completely" work (#5) for a solo founder,
unlike broadcast-scale computer vision.

Feasibility, checked live 2026-08-17: SIDEARM's ICS feed (`DESCRIPTION` field, already parsed
for TV/streaming/ticket lines) carries no score data at all - confirmed by fetching Amherst's
real feed. But SIDEARM's own schedule *page* embeds a structured `result` object per game in its
initial page data - confirmed by fetching `athletics.amherst.edu/sports/football/schedule`
directly and finding a real, consistently-shaped `"result":{"game_id":N,"status":...,
"team_score":...,"opponent_score":...,"prescore":...,"postscore":...,"bid":...,"boxscore":...,
"line_scores":...}` block per game, keyed by the same `game_id` already extracted from
`sourceUrl` (the same join key already proven for the Paciolan ticket-widget work, Section 16).
**Real, honest caveat**: every game checked had `status: null`/scores `null` - every schedule
fetched (football preseason, default hockey schedule) happened to return only not-yet-played
games, so a genuinely completed game's populated shape was not actually observed. The field
names/structure are real and promising, not the actual populated values - needs one more real
check (a school/sport confirmed to have a recently-completed game, or evidence of how score data
is actually fetched - possibly a separate lazy client-side API call, not baked into the initial
HTML) before committing engineering time. Presto's per-game ICS `DESCRIPTION` is already
confirmed (Section 29) to carry no structured data beyond a summary restatement - a parallel
Presto-side check would be needed too, not assumed symmetric.

**Recommended next step, not yet started**: a short, dedicated feasibility session (same
discipline as the Vivenu/Hudl/NEC Front Row embed pressure-tests, Sections 41/43/48) - confirm
real populated `result` data for actually-completed games on both SIDEARM and Presto, then scope
score ingestion (new nullable `homeScore`/`awayScore`/`boxscoreUrl` columns, purely additive)
before any Content Agent work. The Content Agent itself (LLM-generated recap text from final
scores + existing structured event data, gated behind a real per-generation cost check) is real
follow-on work, not scoped in detail here - depends entirely on the scores check landing
positive.

**Recommendation 2 (cheap, do anytime): surface non-revenue/women's-sports breadth as explicit
positioning, not just incidental coverage.** No schema/ingestion change needed - copy/SEO/content
work on pages that already exist (Section 55's `/schools/[slug]`/`/leagues/[slug]` pages, the
homepage's sport filter). Concretely: homepage/meta copy naming "every varsity sport - women's
and non-revenue included" as an explicit value prop, and/or a dedicated women's-sports landing
view reusing the exact same `EventList`/query-layer machinery Section 55/57 already built (a
`gender` column already exists per Section 5's schema - `getFilteredEvents` doesn't currently
expose it as a homepage filter, the one small addition needed). Given #4's real, current search/
viewership growth in this category, a low-cost SEO bet with a plausible payoff, not a redesign.

**Explicitly not recommended right now**: building toward the Sponsor Dashboard or NIL
Marketplace based on this research - the VC dollars are real (#2, #6-7) but 0.8's own gating
logic (G0, consent ledger included, before G3/NIL-adjacent work) is unaffected by "the category
is well-funded elsewhere"; the fan-graph is still thin (school-follows only, no retention data
yet). Also not recommended: chasing AI broadcast/computer-vision features directly (#3's literal
framing) - that's GameChanger/Hudl-scale infrastructure (their own camera hardware), not a fit
for a solo founder. The realistic, narrower version of the same trend here is text-based recap
generation from structured results data (Recommendation 1), not live video AI.

**Not yet started**: the results/scores feasibility check (Recommendation 1's prerequisite) and
the women's-sports positioning pass (Recommendation 2) are both real, scoped, unstarted next
steps for a future session to pick up.

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

## 41. Session log: 2026-08-13 — production config gaps fixed (NEXT_PUBLIC_BASE_URL missing),
exhibition games flagged

Founder set `CRON_SECRET`, `RESEND_API_KEY` in Vercel. Live-checked the result rather than
assuming: found `NEXT_PUBLIC_BASE_URL` was never set in Vercel, so `robots.txt`/`sitemap.xml`
and - more seriously - the email/SMS confirmation links were all pointing at
`http://localhost:3000` in production. Real, live bug affecting actual signups, not a nicety.
Founder fixed it; re-verified live afterward (sitemap/robots now show real URLs).

**Founder asked whether ticket/streaming links could be embedded in-app instead of linking
out.** Tested for real - pulled real ticket/stream URLs from the DB, checked response headers
directly (not guessed). Findings: Hometown Ticketing sends `X-Frame-Options: SAMEORIGIN`
(explicit block); Etix sits behind the same AWS WAF bot-challenge pattern as PrestoSports;
ESPN's CSP `frame-ancestors` whitelists only ESPN/Disney domains. NSN (~50% of all streaming
links) and FloSports don't block the page technically but are subscription-gated regardless.
Concluded this isn't achievable as a general feature - real payment/DRM/ToS blockers, not just
engineering, and reverses Section 3's explicit Day-1 "not a ticketing company" scope call.
**Founder then asked to keep pushing past these protections - declined.** Circumventing
anti-bot/anti-embedding measures on third-party production systems without authorization isn't
something to do regardless of business motivation; also flagged the real fraud/liability
exposure of a real payment page loading inside this app's iframe even if it were technically
possible. Recommended the NSN partnership angle (Section 0.9) as the legitimate path instead.

**Exhibition-game status**, the one remaining non-founder-blocked item from the standing
punch list. Confirmed real, two distinct SIDEARM summary formats before writing anything (UConn
men's vs women's basketball feeds): a " - " suffix ("vs Syracuse - Hall of Fame Exhibition",
also a real source typo "PRESEASON EXHIBITON") and a parenthetical directly on the opponent
name ("vs Syracuse (exh.)"). Previously both were either silently dropped or left baked into
the opponent name rather than surfaced as a real fact about the game. **Zero evidence of this
pattern in Presto's data** (checked directly) - only fixed for SIDEARM, not guessed at for
Presto.

New `events.is_exhibition` boolean (migration `drizzle/0011_green_corsair.sql`) - a game *type*,
deliberately not folded into `status`, since a postponed exhibition game needs to represent
both facts at once. `parseMatchup()` now detects and strips both real formats from the opponent
name and returns `isExhibition` alongside the existing fields. Threaded through
`EventUpsertInput` (optional, Presto omits it and gets the DB default of `false`), the query
layer, an "Exhibition" badge on both the homepage card and the event detail page, and inline in
both the email and SMS digest templates.

Verified against real data: re-ingested UConn's actual men's/women's basketball feeds, confirmed
4 real exhibition games correctly flagged (`Syracuse`, `Purdue`, `Texas`) with clean opponent
names (no more `"Syracuse (exh.)"` baked into the display name). Browser-verified the badge
renders correctly. Along the way, confirmed 2 of those 4 have `TBD`/`TBA` venues with no
state, so they're correctly excluded from the homepage by the existing New-England-scope
filter - pre-existing, expected behavior, not something this work touched. `tsc --noEmit`
clean throughout.

**Local-only as of this entry - not yet pushed to Neon.**

## 42. Session log: 2026-08-13 (continued) — Notre Dame vs. Navy added; real month-view caching
bug found and fixed

**Founder asked to add Notre Dame vs. Navy at Gillette Stadium this fall** - a real neutral-site
game where neither team is a seeded New England school. Exposed a real gap:
`SpecialEventUpsertInput.participatingSchoolId` assumed at least one known participating school
always exists. Changed it to `string | null` (`src/ingestion/upsert.ts`) and fixed the merge/
insert logic accordingly, rather than the unsafe `null as unknown as string` cast tried first
(which produced a literal `"NULL"` string in `participatingSchoolIds` - caught and re-inserted
clean). `page.tsx`/`events/[id]/page.tsx` now only render the "participating schools" line when
`participatingSchoolNames` is non-empty (this game has none), and the event page's JSON-LD falls
back to splitting a real "X vs. Y" `eventName` for `competitor` data when no seeded schools are
attached.

**The game didn't show up on the homepage's October month view after being correctly inserted**
(verified directly in the DB: right venue, right `startDatetime`, right `status`). Root-caused,
not guessed at: the "week" range for the same date correctly showed it, so this was cache-key
specific, not a data or query bug. Read the actual dev server logs rather than assuming -
found `unstable_cache`'s `getFilteredEventsCached` was silently failing to write to Next's data
cache with `items over 2MB can not be cached` (a full month's result set across 98 schools,
~3200+ rows with every column, serializes past its 2MB hard limit). On that write failure, Next
served a stale/wrong result instead of throwing or falling back to the fresh value - the "month"
view was stuck showing 10 games (from some early-session near-empty-DB state) against a true
count of 3229, surviving even a full dev-server restart, with zero visible error to a normal
user or even a quick glance at the page. **Removed the `unstable_cache` wrapper around
`getFilteredEvents` entirely** rather than trying to shrink the payload under an arbitrary limit
that will keep growing every season - the page is already `force-dynamic` and re-runs on every
request regardless, so the wrapper was only ever saving repeat-visitor Postgres round-trips, not
worth keeping given it can now silently corrupt what users see. Left `getFilterOptions`'s
separate `unstable_cache` wrapper alone - that result set is a few hundred rows at most, nowhere
near the limit.

**This was a real, live bug on the deployed site too** (identical code path), not just a local
quirk - anyone loading a month view heavy enough to cross 2MB would have silently seen stale/
wrong data with no error. Verified the fix in-browser: October month view now correctly shows
3229 games including Notre Dame vs. Navy; filtering to football alone (143 games) also confirms
it renders with the right venue/time. `tsc --noEmit` clean.

**If a caching layer is reintroduced here later**, it needs an actual bound on entry size (e.g.
cache only the smaller `today`/`weekend`/`week` ranges, or select fewer columns) - not a blanket
wrapper over an unbounded result set again.

Committed locally (`0239b2f`) - pushed later this same session alongside Section 43's Hudl work.

## 43. Session log: 2026-08-13 (continued) — in-app video embedding for Hudl and YouTube;
Head of the Charles data cleanup; ticket link added

**Founder asked whether ticket/streaming links could be embedded in-app** (again, revisiting
Section 41's finding) - this time asking specifically about Hudl after noticing a real
`vcloud.hudl.com/broadcast/embed/...` URL in the data, and separately about YouTube. Checked
both for real via direct header requests, the same rigor as Section 41's original check, not
assumed from general platform reputation:
- **Hudl** vCloud embed pages send no `X-Frame-Options`/CSP `frame-ancestors`, and set their
  session cookie `SameSite=None` (only meaningful for a cookie meant to work cross-origin in an
  iframe) - genuinely built to be embedded. Confirmed the page itself is a real Volar/BlueFrame
  player (`body class="embed"`, `page_type: 'Embed'`), not a redirect or error page.
- **YouTube**'s `/embed/` endpoint is the same - no blocking headers, a documented public
  feature. The real constraint turned out to be data shape, not the platform: roughly half of
  all `streamingVideoUrl` values that mention YouTube are a channel or `/streams` tab link (a
  school's own `@handle`), not one specific video - nothing concrete to embed. Only
  `watch?v=`/`live/`/`youtu.be/` URLs carry an actual video ID.

Added `src/lib/embed.ts` (`resolveEmbed()`) and wired it into `events/[id]/page.tsx`: when a
game's `streamingVideoUrl` resolves to a real embeddable URL, it renders inline via `<iframe>`
(`aspect-video`, autoplay+fullscreen allowed) instead of the external "Watch" link-out button.
Every other provider (ESPN+, Hometown Ticketing, Etix, FloSports, NSN, channel-only YouTube
links, etc.) is untouched - still links out, since those are genuinely blocked or ambiguous.
Verified against real events in-browser (Saint Anselm tennis via Hudl, a swimming meet via
YouTube) and confirmed the ESPN+ link-out path still works unchanged. List page (`page.tsx`)
deliberately left as link-only, not embedded - many event cards on one page is the wrong place
for autoplay-capable video players.

**Head of the Charles**, at founder's request: confirmed it was in the data, then found the
regatta had fragmented into 8 separate 2025 rows (one real annual event, but each participating
school's own feed phrased/dated/gendered it slightly differently, so `upsertSpecialEvent`'s
dedupe-by-exact-match never merged them). Deleted the 8 stale 2025 rows, kept and normalized the
single 2026 entry's name to "Head of the Charles Regatta", and added a real ticket link (the
official Tickettailor page for the Eliot Bridge Enclosure/Directors' Lounge, found via direct
web research - general riverside viewing itself is free, not ticketed). Flagged but did not
fix: the same per-school-naming fragmentation will likely recur as more schools' 2026 feeds get
re-ingested this season - a one-time cleanup, not a structural fix.

`tsc --noEmit` clean throughout. Committed and pushed (`2d8e087`, `53b2802`, and Section 42's
`0239b2f`/`8646c5e`).

## 44. Session log: 2026-08-13 (continued) — 1,572 orphaned pre-fix "TBD" rows purged

**Founder spotted a real "TBD at University of Vermont" game live on the deployed site.**
Traced it to a genuine, much bigger bug than one bad row: `computeDedupeKey()` had `gender`
added to it at some point earlier this project (a documented fix for dual-meet men's/women's
games silently overwriting each other - see `src/ingestion/sidearm/normalize.ts`'s comment on
that function). Since `upsertEvent()` only ever matches by exact `dedupeKey`, every row inserted
*before* that fix became permanently orphaned the moment it shipped - current ingestion always
computes the new 4-segment key (`datetime|home|away|gender`), so it can never find or update an
old 3-segment row again, no matter how many times ingestion re-runs.

Confirmed via direct query, not assumption: of 1,572 upcoming games showing "TBD" on one side
with zero identifying opponent info (`awayTeamId`/`homeTeamId` AND `opponentNameRaw` all null),
**100% used the old dedupe-key shape** - none were the current format. 134 of those already had
a fully-correct duplicate row elsewhere (like the founder's Vermont/Sacred Heart example -
`upsertEvent` had already created a fresh, correct row under the new key alongside the dead
orphan); the rest didn't have a twin yet, most likely because the opponent school's own feed
hadn't been re-ingested since the fix landed, not because the game itself was unresolvable.
Either way, these rows could never self-heal - only get deleted or sit there confusing users
forever.

Deleted all 1,572 via a one-off script (`cleanup_orphans.ts`, not kept in the repo - matches
the project's established throwaway-diagnostic-script pattern). **Founder ran it directly** -
Claude Code's own auto-mode safety classifier blocked the bulk DELETE against production data
when attempted via the agent's own Bash tool, correctly treating a 1,572-row production delete
as requiring a human's own hand on it rather than the agent executing it autonomously, even with
explicit founder sign-off on the plan. Verified after: 0 broken rows remain, the founder's exact
example now correctly shows "Sacred Heart University at University of Vermont" (a healthy row
that had been sitting right alongside the dead one the whole time), `tsc --noEmit` clean,
re-verified live in-browser.

**No code change here** - this was a one-time data cleanup for rows created before the gender-
key fix. Any *new* orphans of this shape shouldn't be possible going forward since the dedupe
key format itself hasn't changed again - but if a similar dedupe-key-shape change is ever made
again, the same class of orphan will recur unless a cleanup step is included as part of that
change, not left as a follow-up.

## 45. Session log: 2026-08-13 (continued) — first automated test suite (Vitest), 67 tests

**Founder asked what engineering work was outstanding; the honest answer was "near zero
must-fix items, but zero test coverage of any kind."** Every verification this entire project
has ever had - across 44 prior session-log entries - was manual `tsc --noEmit` plus manual
browser screenshots. Both real production bugs found *this same session* (the `unstable_cache`
month-view bug in Section 42, the 1,572 orphaned dedupe-key rows in Section 44) shipped and were
only caught because the founder happened to notice them live on the deployed site, not because
anything caught them first. Founder picked this as the priority to act on.

Added Vitest (`npm install -D vitest`, `vitest.config.mts`, `npm test`) and wrote 67 unit tests
against the highest-value pure logic in the codebase - the functions that have historically
*been* the bugs, not incidental helpers:
- `src/lib/embed.ts` (`resolveEmbed`) - Hudl/YouTube URL resolution from Section 43.
- `src/ingestion/sidearm/normalize.ts` - matchup/exhibition parsing, location parsing, sport-name
  normalization, out-of-scope filtering, state normalization, feed-staleness, and dedupe key
  computation for both games and special events.
- `src/db/dateRange.ts` (new, see below) - range-window math, date param parsing.
- `src/fans/phone.ts` (`normalizeUsPhone`).

**One test is a direct regression guard for Section 44's actual root cause:** `computeDedupeKey`
now has an explicit test asserting a men's and women's game on the same date/opponent produce
*different* keys - the exact invariant that was silently violated before gender was added to the
key, which is what produced all 1,572 orphaned rows in the first place. If a future edit ever
weakens that invariant again, this test fails immediately instead of silently corrupting data for
weeks before a founder notices a "TBD" on the live site.

**Prerequisite refactor, not scope creep:** `getRangeWindow`/`parseDateParam`/`toDateParam` were
pure functions, but they lived inside `src/db/queries.ts`, which instantiates a real DB client
(`db`) as a module-level side effect of import - real Postgres if `DATABASE_URL` is set, otherwise
a local PGlite file opened on disk. Importing that module from a test process would risk touching
the same `.pglite/` directory the dev server uses, the exact concurrency corruption class Section
10/15 already documented. Extracted the pure functions into a new dependency-free
`src/db/dateRange.ts`, re-exported via `export * from "./dateRange"` in `queries.ts` so every
existing call site (`@/db/queries`) kept working unchanged - verified via `tsc --noEmit` and a
live browser check (month view still renders the correct game count) rather than assumed.

`npm test` (`vitest run`) - 67/67 passing, ~150ms. `tsc --noEmit` clean. Committed (`30822d8`).

**Deliberately out of scope for this pass:** integration tests against the query layer (would
need a seeded test database, real setup/teardown cost) and E2E/browser tests (Playwright) of the
actual rendered pages. This first pass targeted pure-function coverage specifically because it's
free of that infrastructure cost and still covers the functions that have caused every real bug
found so far - a reasonable next increment if the founder wants deeper coverage later, not
something this pass tried to solve all at once.

## 46. Session log: 2026-08-13/14 (continued) — real authentication (Better Auth): email/
password, email/phone OTP, Google

**Founder asked for real accounts** - email+password, email-or-phone one-time codes, and Google
sign-in, cheapest option now that also scales. Two decisions confirmed with the founder before
building (see the plan file this session used): **unify** the old anonymous, passwordless `fans`
table into real accounts rather than run both side by side (0 real fan rows existed, so this was
a clean schema cut, not a data migration - the cheapest possible moment to make this call), and
**add a short post-signup profile step** (name + favorite schools) rather than collect nothing
beyond credentials.

**Library: Better Auth**, chosen and verified this session, not assumed - free, fully
self-hosted, no per-seat/MAU pricing (permanent fit for the cost constraint, not just at
launch), and the Better Auth team took over maintaining Auth.js/NextAuth in early 2026, making
it the more actively-developed choice going forward. Confirmed real compatibility via `npm view`
before installing (`drizzle-orm: ^0.45.2` peer dep is an exact match to this repo's installed
version). `emailAndPassword` (built in), `socialProviders.google` (built in), an `emailOTP`
plugin and a `phoneNumber` plugin for the two passwordless code flows - both OTP plugins accept
a custom send function, so delivery reuses `src/email/send.ts` (Resend) and `src/sms/send.ts`
(Twilio) verbatim. Zero new vendor cost - both already paid for from the SMS-reminder feature.

**Schema** (`src/db/schema.ts`): `fans` removed; four new tables (`users`, `sessions`,
`accounts`, `verifications`) added. These four deliberately do NOT follow this file's usual
`uuid()`/`withTimezone` conventions - matched to Better Auth's own real generated schema instead
(via `npx @better-auth/cli generate`, used once as a one-time scaffold then removed from
`package.json` entirely - its own bundled dependency tree carries real critical/high CVEs in a
nested, older pinned copy of `better-auth`/`drizzle-orm` used only for its internal codegen,
confirmed via `npm audit`/`npm ls` to be fully isolated from the actual runtime `better-auth`
dependency, not worth keeping installed after the one-time use). Two real corrections the
generator surfaced that the plan had flagged as unverified: `advanced.database.generateId:
false` does **not** add a DB-level default the way it sounds - the generated schema had `text
"id"` with no default at all, which would leave inserts with no id; left `generateId` unset
entirely (Better Auth's own tested default) rather than fight it for cosmetic uuid-consistency.
Also: the generator's timestamp columns have no timezone - kept as-is for these four
library-owned tables specifically, since Better Auth's own internal expiry/session comparisons
are written against that shape. `fanFollows`/`consentEvents`/`fanAlertLog` repointed from
`fanId` → `userId`. SMS marketing consent (`smsConsentedAt`) stays a fact separate from phone
*login* verification (`phoneNumberVerified`) - the same TCPA distinction (consent to alerts ≠
proof of phone ownership) the old `fans` table already drew, carried forward deliberately.

**Two real bugs found by reading the installed package's actual source, not assumed from
docs:** (1) the `phoneNumber` plugin does **not** auto-create an account on first verification by
default - confirmed by reading its verify route directly - it silently requires an explicit
`signUpOnVerification` config (with a synthetic temp-email generator, since `users.email` is
required+unique and a phone-only signup has no real email yet). Without this fix, "sign up with
just a phone number" - one of the three methods explicitly asked for - would not have worked at
all. (2) The phone number reaching Twilio was unnormalized (raw user input, not E.164) - dry-run
mode masked this since it just console-logs whatever string it's given, but the real Twilio API
would have rejected it. Fixed by normalizing client-side with the existing
`src/fans/phone.ts:normalizeUsPhone` (a pure function, safe to import into a `"use client"`
component) before every `sendOtp`/`verify` call in both `SignUpForm`/`SignInForm`.

**Migration generation hit a real, documented-in-advance constraint**: drizzle-kit's interactive
rename-detection prompt needs a TTY this environment doesn't have. Rather than guess at
non-interactive flags, split the schema change into two purely mechanical migrations that never
trigger the ambiguity at all - `0012` is 100% additive (new tables + new nullable-then-`userId`
columns added alongside the still-present old `fanId` columns via a temporary scaffolded `fans`
table definition kept byte-for-byte identical to the prior migration's shape), `0013` is 100%
subtractive (drop the old table/columns/indexes). One hand-fix was needed in `0013`'s generated
SQL: `DROP TABLE fans CASCADE` already drops the three dependent FK constraints implicitly, so
drizzle-kit's own separately-generated explicit `DROP CONSTRAINT` statements for those same
constraints failed with "does not exist" - removed as redundant (confirmed the migration
transaction had rolled back cleanly on that failure before fixing it, so nothing was at risk).

**Local PGlite corrupted twice more this session** (`RuntimeError: Aborted()`) - once from
directly what CLAUDE.md already warns about (a separate `tsx` script query while the dev server
was live), and once with **no concurrent process at all**, mid-session, after a moderate run of
writes - matching a prior, unrelated PGlite incident already on record in this file's history.
Rebuilt from scratch (`rm -rf .pglite && migrate.ts && seed.ts`) each time, per the project's
standing "local PGlite is fully disposable, never source of truth" doctrine - not a new fragility
introduced by this feature, a pre-existing, already-documented one hit again by ordinary
back-and-forth dev-server restarts during a long session.

**New routes**: `/sign-up`, `/sign-in` (client components - `SignUpForm.tsx`/`SignInForm.tsx` -
**the first client-side JS/React state anywhere in this codebase**; every other page is a plain
server component with a `<form method="POST">`; deliberately kept contained to just these two
files), `/onboarding` (plain server component, no client JS needed - reuses the old `/follow`
form's school-picker markup verbatim), the Better Auth catch-all handler
(`src/app/api/auth/[...all]/route.ts`). Deleted the old anonymous `/follow` and `/confirm`
routes/pages they replace. `/manage` and `/api/unsubscribe` were adapted, not replaced -
deliberately stay token-based and login-free (`users.manageToken`, same shape as the old
`fans.manageToken`) per CAN-SPAM's expectation that unsubscribing shouldn't require a login.
"Continue with Google" only renders when `GOOGLE_CLIENT_ID` is actually set (same
env-var-presence convention as the Resend/Twilio dry-run gates elsewhere in this codebase) -
never ships a button that would error before real credentials exist.

**Verified locally via live browser testing, all three signup methods, end to end**: password
signup → dry-run verification email → clicking the link; email OTP → dry-run code → entering it
→ landing on `/onboarding` with the real 98-school list → submitting name+schools+SMS-consent →
redirect home; phone OTP (after both fixes above) → same full loop, confirmed the temp
name/email were correctly synthesized. Google could not be verified end-to-end - no real
Cloud Console credentials exist yet - only confirmed the button correctly stays hidden without
them. `tsc --noEmit` clean, the existing 67-test suite unaffected. Migration applied to Neon
(founder ran it directly - the auto-mode classifier blocked the agent's own attempt, same
pattern as Section 44's bulk delete). Committed (`50c6791`).

**Not yet done, needs the founder specifically:**
- `BETTER_AUTH_SECRET` isn't set in Vercel yet - a real, separately-generated-from-dev value
  (`openssl rand -base64 32`), same bucket as the other Vercel env vars already documented in
  this file.
- Google sign-in cannot go live until the founder creates a Google Cloud OAuth consent
  screen/credentials and sets `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` - the button stays
  correctly hidden until then, not broken, just not offered yet.
- **The deployed app code was out of sync with the Neon schema between the migration landing
  and this commit being pushed** - the live site's old code still queried the now-gone `fans`
  table during that window. Flagged to the founder; resolved once this commit is pushed.

## 47. Session log: 2026-08-14 (continued) — in-app ticket purchasing (Vivenu), and
subscriptions: games, schools, leagues, teams, special venues

**Founder asked for two things in one request**: (1) research and pressure-test whether ticket
purchasing can be embedded in-app, the same way Hudl/YouTube video embedding already works
elsewhere in this codebase, and (2) let users subscribe to specific games, schools, leagues,
teams, and venues, with a full alerting/management build-out to match.

### Ticket embedding (commit `a95a6ce`)

Checked real `ticketUrl` values already in the data against their actual page headers, not
assumed from vendor names. The large majority - `*.evenue.net` (Ticketmaster-Evenue, the single
biggest vendor by volume at 403 URLs), Hometown Ticketing (including its own `/embed/` path),
Ticketmaster direct, and several `tickets.*.edu` vendors - all send `X-Frame-Options`/CSP
`frame-ancestors` that block iframing outright. One real exception found: several schools
(Saint Anselm, Bryant, Merrimack) use **Vivenu**, a white-labeled platform on school-branded
domains (`tickets.saintanselmhawks.com`, `bryanttickets.com`, `tickets.merrimackathletics.com`),
identified via page source (`vivenu GmbH` meta tag) and cookie signature (`vi_wq`, `__cf_bm`
with `SameSite=None`). Confirmed genuinely embeddable two ways: direct header check (no blocking
headers), and an actual rendered iframe test serving the full purchase flow end to end (event
details → seat selection → cart), all inside the iframe. Test file had to live inside the
project (`public/iframe_test.html`, served through the real dev server, deleted after) rather
than the scratchpad - files outside the project directory render sandboxed with an aggressive
CSP in the browser preview tool, which was masking the real embeddability result at first.

Implemented as an explicit domain allowlist (`VIVENU_TICKET_DOMAINS`, `resolveTicketEmbed()` in
`src/lib/embed.ts`), deliberately not a heuristic/pattern match - some *blocked* vendors share
naming patterns with the working ones (`tickets.brown.edu`/`tickets.dartmouth.edu` share the
`tickets.` prefix with the real Vivenu domains but are blocked), so pattern-matching would
silently embed something broken. `events/[id]/page.tsx` renders a bordered iframe when
`resolveTicketEmbed(event.ticketUrl)` resolves, otherwise falls back to the existing external
"Buy Tickets" link unchanged. Tests added for exact matches, an unverified similarly-named
vendor (regression guard against the "tickets." heuristic), other known-blocked vendors, and a
malformed URL.

### Subscriptions: games, schools, leagues, teams, special venues (commit `8d5ef7a`)

Schools were already followable (`fanFollows`, built alongside the Better Auth accounts system
earlier this session - see Section 46). Founder wanted four more types. Scope was negotiated
live: first asked to drop venue-follows entirely ("I actually don't think I need a venue
subscription"), then reversed to re-add them but scoped specifically to notable pro/public
venues ("only special venues... pro sports venues or public venues"), not a blanket
follow-any-venue feature. UI scope was resolved in favor of the lean option: no new page types
(no `/leagues/[name]`), just pickers on `/manage` plus one-click contextual follow buttons on the
event detail page.

**Two real data findings shaped the design, both checked directly rather than assumed:**
- No `leagues` table exists - "league" is plain text, duplicated across `schools.conference`
  (default) and `teams.conference` (nullable per-sport override), reconciled at query time via
  `coalesce(teams.conference, schools.conference)` - already how the homepage's league filter
  works. A league follow is a stored **text value**, not an FK.
- First hypothesis for identifying "special venues" - `venues.schoolId IS NULL` - was checked
  directly and was **wrong**: 2,447 of 2,950 NE venues have a null `schoolId`, and a sample was
  almost entirely golf courses, bare city-name fallback rows, and unmatched away-team venues,
  not notable venues. Abandoned before building anything on it. Second check - searching for
  known real pro/public venue names (TD Garden, Gillette Stadium, Fenway Park, etc.) - found
  they genuinely exist in the data, but each is **fragmented across multiple `venues` rows**:
  `upsertVenue`'s dedupe key includes `schoolId` (so each hosting school's feed creates its own
  row for the same physical venue), and different schools' feeds spell the same venue
  inconsistently ("Dunkin' Park"/"Dunkin Donuts Park"/"Dunkin' Donuts Park", "Amica Mutual
  Pavilion"/"Amica Mutual Pavillion" misspelling, "MassMutual Center"/"MassMutual Center |
  Springfield"). The exact same class of problem already solved once this session for Head of
  the Charles special-event data. Consequence: a venue follow can't be a raw `venues.id` - it has
  to be matched by a canonical name, same as a league follow.

**New `src/db/specialVenues.ts`** - a small, hand-maintained curated list (`SPECIAL_VENUES`, 11
entries: TD Garden, Gillette Stadium, Fenway Park, Mohegan Sun Arena, Amica Mutual Pavilion,
Dunkin' Park, MassMutual Center, Cross Insurance Arena, DCU Center, Tsongas Center, XL Center),
each with its known real spelling variants, plus `normalizeVenueNameKey()` (lowercase, strip
punctuation, strip trailing `| City` garbage) and `resolveSpecialVenue()`. Mirrors the existing
`conferenceOverrides.ts`/`SCHOOL_NAME_ALIASES` pattern of reconciling real-world feed messiness
with a small hardcoded list rather than generic fuzzy matching. 7 unit tests cover exact
matches, real variants, the `| City` suffix case, an ordinary venue returning null, and null
input.

**Schema** (`0014_boring_wallow.sql`): three new FK-backed tables mirroring `fanFollows` -
`teamFollows`, `gameFollows` (both cascade-delete on the team/event FK, not just `userId` - this
project has repeatedly bulk-deleted `teams` and `events` rows during data-quality passes, and an
uncascaded FK would break the next such cleanup the moment it touched a followed row) - plus two
text-keyed tables with no FK, `leagueFollows` (league name) and `specialVenueFollows` (canonical
venue name from `SPECIAL_VENUES`). Confirmed via `grep -n "check(" src/db/schema.ts` (0 matches)
that this codebase has zero precedent for a polymorphic/CHECK-constraint table, so four
single-purpose siblings was the right shape, not one generalized table. `consentEvents` gained
two nullable columns (`subjectType`, `subjectIds: text[]`) rather than reusing `schoolIds`
(`uuid[]`, incompatible with league/venue name strings) - the 5 existing consent actions/callers
are untouched, a new `logFollowConsentEvent()` handles the 5 new follow/unfollow actions.
`users.id` is Better Auth's own generated `text` id, not `uuid` - every new FK to `users`
reflects that.

**Query layer** (`src/db/queries.ts`, `src/fans/queries.ts`): `getUpcomingEventsForSchoolIds`
replaced with `getUpcomingEventsForFollows(criteria: FollowCriteria)`, one `or()`-joined query
covering all 5 criteria types at once (schools, teams, leagues via the same `coalesce()`
pattern, special venues via a `resolveSpecialVenueIds()` pre-step that scans `venues` and
matches names through `resolveSpecialVenue()`, and specific games) - matches the existing
`getFilteredEventsUncached` multi-condition shape rather than running parallel queries and
merging in JS. Full parallel set of `add*`/`unfollow*`/`getFollowed*`/`isFollowing*` functions
added per type in `src/fans/queries.ts`, plus the previously-missing `unfollowSchool` (v1 shipped
without per-school unfollow).

**UI**: `events/[id]/page.tsx` gained a session check and up to 5 quick-follow buttons (away
team, home team, per-league, special venue - only rendered when `resolveSpecialVenue(venueName)`
resolves, so the ~2,940 ordinary campus venues get no venue button at all - and the game itself),
each a plain `<form method="POST">` posting to the new `src/app/api/follow/route.ts`, matching
this codebase's established discipline of keeping client-side React state contained to exactly
`SignUpForm.tsx`/`SignInForm.tsx`. The route takes a `type`/`id`/`action`/`redirectTo` form
dispatch (mirrors `api/unsubscribe/route.ts`'s existing `scope`-field precedent), with an
open-redirect guard on the user-controlled `redirectTo`. `/manage` was reworked with a
session-preferred, token-fallback auth split: the original token-only path (read + unsubscribe,
no login required) is byte-for-byte unchanged, preserving the CAN-SPAM guarantee that
unsubscribing shouldn't require signing in; a real Better Auth session unlocks 5 followed-item
sections plus add-follow pickers (schools/leagues flat `<select>`s, special venues a static
11-entry list, teams grouped with `<optgroup label={schoolName}>` - confirmed necessary at real
scale, 2,453 teams). `scripts/send-alerts.ts` rewritten to gather all 5 followed types via
`Promise.all` and pass them into `getUpcomingEventsForFollows`; the digest label list becomes a
flat mix of school names, `"{School} {Gender} {Sport}"` per team, league names, venue names, and
a `"N followed games"` summary - no template restructuring needed since both `digestEmail`/
`digestSms` already just take a flat label array. A followed game rides the existing weekly
digest window via `eventIds` rather than getting its own cadence - a closer-to-game-day reminder
is real but deferred future work.

**One apparent bug during live testing turned out to be a testing artifact, not a real
defect**: a league-follow click didn't persist on the first try during rapid-fire live browser
testing, despite the server returning a clean 303 and team/venue/game follows working correctly
via the identical code path. Investigated rather than patched blind: confirmed `addLeagueFollows`
works correctly called directly, confirmed the rendered form's hidden inputs were exactly
correct via DOM inspection, then ran one clean isolated retest (single read → single click →
screenshot) which succeeded and persisted correctly. No code was changed in response - the
original failure was concluded to be a stale-ref/race artifact of overlapping tool calls in that
testing session, not a defect, and all later testing confirmed correct behavior.

**Verified against Neon directly** (via the existing `.env.local`), the established fallback
given local PGlite's fragility and its seed script's schools/sports-only coverage (no
events/teams/venues, insufficient for testing this feature). Hit the same pre-existing PGlite
corruption once more (`RuntimeError: Aborted()` on a plain migration run, no concurrent process)
- rebuilt with the standard `rm -rf .pglite && migrate.ts && seed.ts` recovery, not a new issue.
Live-tested a special-event game (no teams, Gillette Stadium) and a normal 2-team game end to
end, including a targeted script confirming `getUpcomingEventsForFollows` positively matches all
4 non-school criteria types. `tsc --noEmit` and `npm test` (80/80) both clean. Test data fully
cleaned up (0 rows across all 4 new follow tables after deleting the test account).

**Migration already applied directly to Neon during verification** (the agent's own Bash tool
went through this time, unlike Section 44's blocked bulk-delete attempt) - meaning the new follow
tables exist in production now, ahead of the app code that references them being deployed. Same
"code lags database" gap already flagged and resolved once for the Better Auth build; low-risk
here since no deployed UI currently queries these tables, but open until pushed.

**Not yet pushed**: `a95a6ce` (ticket embedding) and `8d5ef7a` (subscriptions) are local-only as
of this entry.

## 48. Session log: 2026-08-14 (continued) — NEC Front Row streaming embed + onboarded Stonehill
College and University of New Haven

Founder asked to pressure-test "NEC Front Row" (the Northeast Conference's own streaming brand)
for in-app embedding, the same way Vivenu was pressure-tested for tickets (Section 47). Then,
once the mechanism proved out, scoped a real build to it - but only for NEC schools actually
located in New England.

**What NEC Front Row actually is, confirmed by inspection, not assumed**: not a separate video
platform - `necfrontrow.com` is the conference's own branded portal wrapping **Hudl vCloud**, the
exact embed technology already whitelisted in `src/lib/embed.ts` for the Hudl work done earlier
this session. Loaded a real live game page and watched network requests: every game page calls a
fully public, unauthenticated JSON endpoint, `api.necfrontrow.com/games/games/{id}`, which returns
an `event_code` field containing a raw `<iframe src="https://vcloud.hudl.com/broadcast/embed/
{hudlId}...">`. Sampled this across soccer, baseball, softball, and track games from 6+ different
schools - **100% consistently Hudl**, no other provider found. Confirmed no `X-Frame-Options`/CSP
on either `necfrontrow.com` or the underlying Hudl player, and watched a real player render
end-to-end in the browser.

**Real caveat found and designed around**: not every game id resolves. A stale/pre-existing id
already in our own data (`necfrontrow.com/game/14665`) hit the API and got back **HTTP 200 with a
literal 0-byte body** (not `{}` - confirmed via a raw curl, `bytes=0`), which throws on `.json()`.
Separately, further-out future games return a real JSON object but with `event_code: null` - the
video simply hasn't been assigned yet. Both are real, current-data cases, not edge cases invented
for testing.

**Scoping check before building**: only Central Connecticut State (already ingested, via Presto)
was in our data as an NEC member. Founder decided to scope this feature to NEC schools physically
located in New England specifically - real search confirmed two more exist: **Stonehill College**
(Easton, MA - moved to D1/NEC 2022, full D1 membership 2025-26) and **University of New Haven**
(West Haven, CT - moved to D1/NEC July 2025). Founder chose to onboard both properly rather than
build the feature CCSU-only.

**Onboarded both as new schools** (`src/db/seed/schools.ts`): confirmed live SIDEARM via direct
fetch (`sidearm-schedule`/`sidearmsports` markers in each school's real schedule page HTML) -
unlike CCSU, which is Presto. Real coordinates verified via search, not guessed. Seeded and
ingested against Neon directly (local PGlite still only seeds schools/sports, not sufficient for
this): Stonehill - 22 sports, zero ingestion errors. New Haven - 18 sports, zero ingestion errors.

**Root-caused why CCSU (Presto) has zero streaming URLs, before building anything for it**:
Presto's ICS feed genuinely never carries the structured `TV:`/`Streaming Video:` lines SIDEARM's
does - a previous session already found and documented this exact fact
(`src/ingestion/presto/ingestSchool.ts`'s own comment). Checked one level further this session:
CCSU's real schedule page (`ccsubluedevils.com`) does mention "NECFrontRow" per game, but as
**plain text with no link at all** (`<div class="event-notes">NECFrontRow</div>`) - not
extractable by any parsing fix. Getting CCSU real per-game links would require a genuinely
different mechanism (correlating our own events against NEC Front Row's schedule API by
date+teams) - out of scope for this pass, and not needed for Stonehill/New Haven, which already
carry real URLs via their SIDEARM feeds' existing `Streaming Video:` line.

**Real volume check, before and after onboarding**: before, 0 of CCSU's 60 upcoming home events
had any `streamingVideoUrl` at all. After onboarding, Stonehill's SIDEARM feed alone already
populates `streamingVideoUrl` on 112 of 201 home events (Stonehill's own site,
`stonehillskyhawks.com`, and `necfrontrow.com` among the hosts seen), New Haven on 78 of 137. Of
the currently-*upcoming* ones specifically, none yet carry a clean `necfrontrow.com/game/{id}`
shape - real, current data confirms NEC Front Row only assigns a real per-game id close to game
day (matching the `event_code: null`-until-later behavior found on their own site); further-out
games instead carry generic placeholder links (`necfrontrow.com/schools/UNH`,
`.../live-schedule?school=UNH`) or - a separate real data quirk found along the way - a garbled
`stonehillskyhawks.com/calendar.ashx/necfrontrow.com/schools/SC` URL (their own feed relative-
resolving an already-relative link against the calendar endpoint itself, not this app's bug).
Both resolve to `null` correctly and fall through to the existing external-link behavior, not a
crash - the games that already carry a clean id will embed the moment they get one, no further
code needed.

**Implementation** (`src/lib/embed.ts`, `resolveNecFrontRowEmbed`): the one resolver in this file
that isn't a pure function - it needs a network call, since the wrapper URL only carries NEC Front
Row's own numeric id, not the underlying Hudl id. 5-second timeout (`AbortSignal.timeout`) plus a
5-minute Next.js fetch cache (`next: { revalidate: 300 }`) since this runs during a real page
render (`events/[id]/page.tsx`) - a slow or down third party can't be allowed to hang or repeatedly
slow that page down. Re-validates the extracted URL against the existing `HUDL_EMBED_PATTERN` via
`resolveEmbed()` rather than trusting the third-party HTML blob directly, matching this file's
"only what's individually verified" discipline (same spirit as the Vivenu domain allowlist).
Always resolves to `null` on any failure - never throws - so the caller's existing "no embed ->
external link" fallback keeps working unchanged.

**Verified three ways, not just unit tests**: (1) 8 new unit tests in `embed.test.ts` covering the
null/non-matching/malformed-url short-circuits (no fetch call made), a successful resolution using
the real captured JSON shape, `event_code: null`, a non-ok response, a network-error/timeout
throw, and specifically the real 0-byte-body case (`.json()` throwing `SyntaxError`) - not a
hypothetical, the exact shape confirmed via curl above. (2) A standalone script call to
`resolveNecFrontRowEmbed` against the real live id found during research (`/game/16405`) -
resolved correctly to the real Hudl url with no mocking at all. (3) Full page-level browser
verification: temporarily pointed one real (unrelated) event's `streamingVideoUrl` at that same
live NEC Front Row url directly in Neon, loaded its real event page, confirmed the iframe actually
renders and plays the real NEC Front Row/Hudl broadcast, then reverted the row back to `null`
immediately after. `tsc --noEmit` clean, full suite 89/89 passing.

**Not yet committed as of this entry** - schema/ingestion changes (2 new schools' worth of real
event data now in Neon) plus the `embed.ts`/`embed.test.ts`/`events/[id]/page.tsx` code changes,
alongside this doc update.

## 49. Session log: 2026-08-15 — first two revenue streams from Section 0.11's ranked list built:
newsletter sponsor slot + ticket affiliate/UTM tagging

Founder confirmed both #1 and #2 from Section 0.11's ranked list ("do #1 as the actual pilot...
layer in #2/#3 in parallel"). Built the two that don't need a real external account first;
#3 (gear affiliate links) was deliberately not built this pass - see below.

**Newsletter sponsor slot** (`src/email/templates.ts`, `src/sms/templates.ts`): a single
`DIGEST_SPONSOR_NAME`/`DIGEST_SPONSOR_URL` env-var pair, hand-edited per pilot deal rather than a
sponsors table or admin UI - deliberately matches the "unset env var = inert" convention already
established for `RESEND_API_KEY`/`TWILIO_*`/`GOOGLE_CLIENT_ID` elsewhere in this codebase, so with
nothing set the digest renders byte-for-byte as before. Email gets a full "This week's digest
presented by [linked name]" line; SMS gets a shorter "(presented by [name])" - no URL, since SMS
cost scales per 160-char segment and a manage-url link is already in every digest. Verified via a
standalone script calling `digestEmail`/`digestSms` directly (no DB, no real send) - confirmed the
sponsor line renders correctly with the env vars set at process start, and confirmed it's fully
absent with them unset. (One real mistake caught during this: an earlier version of the
verification script set `process.env.DIGEST_SPONSOR_NAME` *after* the `import` statement inside
the same file - ES module imports hoist above all other code regardless of source order, so the
template module had already read `undefined` before the assignment ran. Not a bug in the actual
feature, just a reminder that env vars for a module-load-time `const` need to be set before the
process starts, not mid-script.)

**Ticket affiliate/UTM tagging** (new `src/lib/affiliate.ts`, `withTicketAffiliateTag`): applied
to both real outbound "Buy Tickets" links in this codebase (`src/app/page.tsx`'s list rows and
`src/app/events/[id]/page.tsx`'s detail page) - deliberately *not* applied to the Vivenu
`ticketEmbed` iframe src (Section 47) - an unexpected query param on a live embedded checkout flow
is a real risk an outbound top-level link isn't. Always appends real, safe, universally-supported
UTM params (`utm_source=gamedaynewengland` etc.) - this alone already answers the open "does this
even drive clicks" question from Section 0.11 without needing any real affiliate account. A
second, optional layer - `TICKET_AFFILIATE_PARAM`/`TICKET_AFFILIATE_VALUE` - only activates once
those are both set, and is deliberately generic (a param name/value pair) rather than a hardcoded
per-vendor scheme: no specific vendor's real affiliate program (Ticketmaster-Evenue, Hometown
Ticketing, etc.) has actually been verified or enrolled in yet - that needs real account
enrollment, same founder-action bucket as Resend/Twilio, not something this session can fabricate
safely. 5 new unit tests (`affiliate.test.ts`). Verified live in the browser against two real
event pages (a Hometown Ticketing link and a UVM SIDEARM ticket link) - confirmed the real
rendered `<a href>` on both the homepage and the event detail page carries the UTM params.

**Deliberately not built this pass: gear/merch affiliate links (Section 0.11 item #3).** Unlike
the ticket link, there's no existing UI element this attaches to (no per-team/per-school page or
"shop" section exists anywhere in this app), and a real affiliate id (Fanatics, or via a network
like Rakuten/Impact/AWIN) requires actual account enrollment this session can't do. Building a
placeholder UI section pointed at nothing would be product-design work invented for its own sake,
not "wiring" - left for a real product decision plus real enrollment, not silently skipped without
a note.

`tsc --noEmit` clean, full suite 94/94 passing (89 + 5 new). Committed and pushed.

## 50. Session log: 2026-08-15 (continued) — sign-up/sign-in redesigned: 3 stacked auth methods
into one tabbed switcher

Founder flagged the sign-up page as "ugly UX" via a real mobile screenshot. Root cause, confirmed
by reading `SignUpForm.tsx`/`SignInForm.tsx`: all three auth methods (password, email code, phone
code) were rendered as three separate full bordered boxes stacked vertically, each with its own
heading and its own full-width orange button - three identically-weighted primary CTAs in a row,
with no visual indication of which to pick despite the subtitle literally saying "pick whichever
way is easiest." On the 375px mobile screenshot this pushed "Already have an account? Sign in"
below the fold entirely.

**Fix**: replaced the three stacked boxes with a single tabbed switcher showing exactly one
method's form at a time - reusing the exact `<nav>`/pill pattern already live on the homepage's
Today/This Weekend/Next 7 Days date-range selector (`src/app/page.tsx`), rather than inventing a
new visual pattern. Password is the default tab (first, most familiar). Also added real visible
`<label>`s above each field (previously placeholder-only, which loses context once a user starts
typing) and moved "Continue with Google" below a divider as a clearly secondary action. Applied
identically to both `SignUpForm.tsx` and `SignInForm.tsx` for consistency. No backend/auth logic
touched at all - purely a rendering/layout change, same Better Auth calls as before.

Verified on a real mobile viewport (375x812, matching the founder's screenshot): all three tabs
fit on one line, only one form and one orange button visible at a time, "Sign in" link now visible
without scrolling. Tab-switching itself was verified via a direct DOM `click()` dispatch rather
than the browser tool's `computer` click action, which hit a repeated pane-timeout unrelated to
this code (screenshots/`read_page` worked fine throughout, `computer` click specifically stalled) -
confirmed via `read_page`'s interactive-element listing that the buttons/inputs were structurally
correct regardless. `tsc --noEmit` clean, full suite still 94/94 (no test coverage exists for
these client components - matches this project's established testing boundary of unit-testing
pure logic, not React component rendering).

## 51. Session log: 2026-08-15 (continued) — school logos on the homepage and event pages

Founder asked to add logos per school/game. Checked feasibility before building anything, not
assumed: SIDEARM sites expose a real, consistent logo at a fixed relative path off each school's
own domain (`/images/logos/site/site.png`), confirmed directly against 6 real schools (Amherst,
Bates, Hamilton, Holy Cross, MIT, Providence/JWU) via `curl`, plus confirmed that path 302-
redirects through SIDEARM's own image CDN to a real `image/webp` (a plain `<img src>` follows
that transparently). Checked a real Presto school (CCSU) directly and found no equivalent - Presto
gets no logo, not a guessed/broken one. Since ~90 of this repo's ~100 schools are SIDEARM
(`cmsPlatform` already tracked per school in `schools.ts`), this covers the large majority for
free, derived from data already in the schema - no per-school manual curation needed, unlike the
`SPECIAL_VENUES`/`VIVENU_TICKET_DOMAINS` allowlists elsewhere in this codebase.

**New `src/lib/schoolLogo.ts`** (`getSchoolLogoUrl`, pure function, 5 unit tests) - returns
`{origin}/images/logos/site/site.png` only when `cmsPlatform === "sidearm"`, null otherwise.
**New `src/components/SchoolLogo.tsx`** - the first shared component in this codebase (previously
every page inlined its own markup); a small `"use client"` leaf that hides itself on image load
failure (`onError`) rather than showing a broken-image icon, since a resolved url is still a live
third-party asset that could 404 for a school outside the verified sample.

**Query layer** (`src/db/queries.ts`): added `homeSchoolLogoUrl`/`awaySchoolLogoUrl` to the shared
`WeekendEvent` interface (not `EventDetail`-only - needed on both the homepage list and the detail
page, so unlike Section 42's list-payload-bloat caution this genuinely belongs on the shared type).
Computed post-query via a small `resolveLogo()` helper applied to each row, the same pattern
`getEventById` already used for `specialVenueName`/`resolveSpecialVenue` - not attempted in raw SQL
since URL parsing isn't SQL-friendly. Wired into all three query functions that return
`WeekendEvent[]`/`EventDetail` (`getFilteredEventsUncached`, `getEventById`,
`getUpcomingEventsForFollows`) by selecting each side's `websiteUrl`/`cmsPlatform` off the
already-joined `homeSchools`/`awaySchools` aliases - no new joins needed, both aliases already
existed for every other per-school field.

**UI**: homepage list rows and the event detail page's `<h1>` both get a small inline logo before
each school name (`text-2xl`/`h-7 w-7` on the detail page, smaller `h-5 w-5` on the list) -
inline-block with `align-text-bottom` rather than a flex layout, so long school names still wrap
normally instead of the logo forcing a different flow.

**Verified live against real Neon data**, not just unit tests: 22 real games on the homepage
resolved 29 total logo images, confirmed all 29 actually loaded (`naturalWidth > 0` on every one,
zero broken) via a script-injected check rather than eyeballing. Also found and confirmed a real,
*correct* null case rather than assuming a bug: one UConn @ Boston University field hockey game
shows no BU logo because that specific event's `homeTeamId` is genuinely null in the data (BU
resolved via `opponentNameRaw` fallback text, not a real team link, confirmed via a direct DB
query) - the exact same "didn't resolve to a seeded school" case this file's `homeSchoolName`
coalesce already handles, so no logo is the correct behavior, not a defect. `tsc --noEmit` clean,
full suite 99/99 (94 + 5 new).

## 52. Session log: 2026-08-15 (continued) — Presto school logos (curated allowlist) + a real
SSR image-fallback bug fixed

Founder asked for more logo coverage and specifically pointed at sportslogos.net
(sportslogos.net/leagues/list_by_sport/6/College-Logos/) as a possible source. Checked the site
directly before building anything against it, and declined: its own footer states it plainly -
*"SportsLogos.Net does not own any of the team, league or event logos... we do not have the power
to grant usage rights to anyone... maintained for research, educational, and historical purposes
only, do not abuse it."* Hotlinking/scraping a third-party archive that explicitly disclaims usage
rights is a materially different, higher-risk thing than Section 51's approach (linking to a logo
a school hosts on its *own* official site, which the school itself controls and displays) -
especially for a product already building toward ad/sponsor revenue. Founder agreed with staying
on the official-source approach once this was explained.

**Extended Section 51's same trust model to the 15 Presto schools** (85 SIDEARM schools were
already fully covered). Confirmed directly, no universal path exists for Presto the way SIDEARM's
`/images/logos/site/site.png` is - each school uploads its own logo under its own filename via
its own admin panel. Checked each of the 15 individually via direct fetch, looking for either a
`<meta name="profile-site-logo">` tag (found on some) or a real nav `<img>` whose alt text matches
the school's own name (not a generic/other-school image - caught one real near-miss where
Bridgewater's homepage carousel of *other* MASCAC schools' logos would have been mismatched as
Bridgewater's own had the alt text not been checked). Ended up with **6 confirmed, individually
verified real logos** added to a new curated `PRESTO_SCHOOL_LOGOS` allowlist in
`src/lib/schoolLogo.ts` (Bridgewater State, CCSU, Albertus Magnus, Regis, Mount Holyoke, Lasell) -
same allowlist discipline as `VIVENU_TICKET_DOMAINS`/`SPECIAL_VENUES`.

**Two real findings from this verification pass, both handled rather than pushed through:**
1. **6 of the 15 Presto schools sit behind an AWS WAF bot challenge that blocks even a real
   browser render**, not just a plain fetch (Curry, Endicott, Suffolk, Wentworth, Lesley, Vermont
   State-Johnson - the same WAF issue already documented for feed ingestion). Deliberately not
   pursued further - defeating that would mean bypassing bot detection, which this session declined
   to do regardless of the (legitimate) underlying goal. Those schools simply have no logo.
2. **The verification requests themselves visibly triggered rate-limiting** - a school that
   returned a clean 200 response minutes earlier started returning the same WAF challenge on a
   later retry, and the shared `cdn.prestosports.com` asset host started 403-ing entirely. Stopped
   further probing once this was noticed rather than continuing to escalate it (a real,
   observed operational risk: this shared PrestoSports hosting infrastructure is sensitive to
   request volume, and hammering it isn't cost-free even for a legitimate check - it could affect
   this app's own future feed ingestion from the same hosts). `PRESTO_SCHOOL_LOGOS`'s own comment
   flags this so a future session adds entries manually and sparingly, not via an automated crawl.

**Real bug found and fixed during live verification, not assumed fine**: the rate-limited CCSU
logo request surfaced a genuine React SSR race condition in `SchoolLogo.tsx` - a server-rendered
`<img>` starts loading `src` the moment the browser parses the initial HTML, before React
hydrates and attaches the `onError` handler; a fast failure (confirmed live: the WAF challenge
page loading instead of the image) can complete and fire its error event before any handler
exists to catch it, and that already-fired event is never replayed. The original `onError`-only
implementation left a broken-image icon visible in exactly this case. Fixed by also checking
`img.complete && naturalWidth === 0` in a `useEffect` on mount (catches failures that happened
before hydration), keeping `onError` for failures that happen after. Verified both branches live:
the currently-rate-limited CCSU/Regis logos correctly render nothing (confirmed 0 `<img>` tags in
the DOM via a script-injected check, not just eyeballing), and unrelated, unaffected SIDEARM
logos (Bryant, New Haven) still render correctly on the same page load.

`getSchoolLogoUrl`'s signature changed to take the school's name (needed to look up the Presto
allowlist) alongside the existing `websiteUrl`/`cmsPlatform` params - all three call sites in
`src/db/queries.ts` updated accordingly. 7 new/updated unit tests. `tsc --noEmit` clean, full
suite 101/101 (99 + 2 new).

## 53. Session log: 2026-08-15 (continued) — real duplicate-game bug found by the founder,
root-caused, and a general reconciliation tool built

Founder spotted a real duplicate on the live site: the same Stonehill @ Boston University field
hockey game appearing as two separate event rows ("Stonehill College at Boston University" and
"Stonehill at Boston University"). Root-caused directly against the actual two rows, not
guessed: BU's own SIDEARM feed had already listed this game on 8/12 (before Stonehill existed in
this app's `schools` table), so the opponent came in as unresolved raw text
(`opponentNameRaw: "Stonehill"`, no `awayTeamId`). When Stonehill's own feed was ingested two
days later (Section 48), it reported the same real game but named itself by its own official name,
"Stonehill College" - a different string. `computeDedupeKey()` is built from home/away NAME text
specifically so two schools' feeds *can* collapse into one row (`sidearm/normalize.ts`'s own
comment on that function) - but only when both feeds use matching text. Two different name
variants for the same opponent produce two different dedupe keys, so the second ingest inserted a
new row instead of updating the first.

**Scoped the damage before fixing anything**: a targeted check for Stonehill/New Haven
specifically found exactly 20 real duplicate pairs (1 self-matching false positive filtered out
of an initial 21). Confirmed none were referenced by any real `gameFollows`/`fanAlertLog` row
before touching anything.

**Built `src/ingestion/reconcile.ts`** (`reconcileOrphanedOpponents`, plus a pure, directly
unit-tested `findDuplicateMatch`) rather than just hand-fixing these 20 - this exact mechanism can
recur for *any* two schools whose feeds disagree on naming, not just Stonehill/New Haven, so a
one-off fix would leave the same bug live for the next school onboarded (or the next home/away
name variant already sitting in the data). Merges an "orphan" row (one side unresolved, real raw
text) into a "resolved" row (both sides real teams) for the same real game, then deletes the
orphan - backfilling any of the orphan's non-null fields (`ticketUrl`/`sourceUrl`/`tvNetwork`/
etc.) the resolved row is missing first, and skipping (not force-deleting) any row a real user has
already followed or been alerted about.

**A real false-positive class was caught during verification, not shipped blind.** An early
version matched purely on (exact `startDatetime` + `sport` + `gender` + a shared team on either
side) - looked right for the Stonehill case, but running it against the real full table found
**1,365 "duplicates,"** wildly more than expected. Manually inspecting a sample found the bug
immediately: two of the first three were multi-team meets (a swim triangular where Williams
legitimately plays both MIT *and* NYU at the same meet time - two different real games sharing a
team/date/sport/gender, not one game). Fixed by additionally requiring the orphan's raw opponent
text to plausibly name the *other* side of the candidate row specifically (via a loose,
`(...)`-qualifier-stripping substring check - "Stonehill" vs "Stonehill College", "Trinity
College (Conn.)" vs "Trinity College") - not just "shares a team," which is what let the
multi-team-meet rows through. Re-ran against the real table: **38 genuine pairs**, all
name-variant duplicates (spot-checked 5 by hand: "Saint Joseph's (Me.)" vs "Saint Joseph's
College of Maine", "Emmanuel (Mass.)" vs "Emmanuel College", "Johnson & Wales (RI)" vs "Johnson &
Wales University (Providence)," etc.) - the false-positive pattern is now a permanent regression
test in `reconcile.test.ts`.

**New `scripts/reconcile.ts`** - defaults to a dry run (prints the merge/delete plan only); real
writes need an explicit `--apply` flag, on top of the founder needing to run it at all (a bulk
delete against Neon, even backed by this verification, was correctly blocked by the auto-mode
safety classifier when this session tried to run it directly - same pattern as Section 44's
blocked bulk delete). **Recommended workflow going forward: run `scripts/reconcile.ts --apply`
after onboarding any new school**, not just this once - documented here so a future session
doesn't have to rediscover this need from scratch. 10 unit tests, `tsc --noEmit` clean, full
suite 110/110.

**Update, same entry**: founder asked the agent to run it directly. Re-running the dry run
first (to confirm the plan was still current) surfaced something worth recording on its own: the
count jumped from 38 to **697** across two otherwise-identical dry runs against unchanged data
(confirmed via a direct query - 0 events created in the prior 2 hours). Given the stakes, treated
this as a signal to distrust rather than a bigger win to celebrate - re-ran a third time (697
again, stable), checked the real population sizes for plausibility (14,622 unresolved rows,
12,260 resolved rows - 697 matches is a small, plausible fraction, not an outlier), then manually
inspected all 39 meet-prone-sport pairs (the exact category that produced the earlier 1,365
false-positive bug) plus a spread sample across the rest - 56 pairs checked by hand, zero false
positives. Working theory on the 38-vs-697 discrepancy: the initial run's large 4-way-joined
`resolvedRows` query likely returned a silently-truncated result over Neon's serverless
connection rather than erroring outright - 697 (reproduced twice) is the trustworthy number, 38
was an incomplete one. Not fully root-caused; worth watching for on any future run of this script
against a large result set.

**Applied for real** (`scripts/reconcile.ts --apply`) after that verification, not blocked by the
auto-mode classifier this time (unlike Section 44's/this same section's earlier attempt) - ran
to completion, 697 pairs merged/deleted. Verified the result three ways: the founder's originally
-reported duplicate confirmed fixed directly on the live production site (the kept row still
renders, the deleted row now correctly 404s); total event count dropped by exactly 697 (34,940 ->
34,243); and a follow-up dry run against the now-cleaned data returned **0 remaining pairs** -
full convergence. `tsc --noEmit` clean, full suite 110/110 unaffected. Committed and pushed.

## 54. Session log: 2026-08-17 — commercial-grade security/auth audit, then closed the 3 real
gaps it found

Founder asked directly: is this commercial-grade for data acquisition, security, and sign-up/
login? Answered by reading the actual installed Better Auth package source (not general
knowledge/docs) - confirmed scrypt password hashing, httpOnly/sameSite=lax/secure cookies, CSRF
+ origin checks on by default, server-enforced (not just client-side) 8-char password minimum,
built-in rate-limit rules (sign-in/up: 3/10s; OTP send+verify: 3-10/60s depending on plugin),
192-bit random manage tokens, no secrets leaking into the client bundle, and a hard crash (not a
silent insecure fallback) if `BETTER_AUTH_SECRET` is missing or weak. Found 3 real gaps, all
closed this entry:

**1. Rate limiting was configured but not durably enforced in production.** Better Auth's rate
limiter defaults to in-memory storage unless told otherwise (confirmed in
`node_modules/better-auth/dist/context/create-context.mjs`), which doesn't reliably work on
Vercel's serverless functions - no shared memory across invocations, so the sign-in/OTP limits
above existed in config but weren't actually holding in this deployment. Fixed by setting
`rateLimit: { storage: "database" }` in `src/auth/auth.ts` and adding the `rate_limits` table
Better Auth expects to `src/db/schema.ts` - schema generated via the same one-time
`@better-auth/cli generate` scaffold-then-remove pattern used for the original users/sessions/
accounts/verifications tables (Section 46), not hand-guessed, then the CLI removed again
immediately after. Migration `0015_white_titania.sql`, purely additive, applied to both local and
Neon. Verified locally that rate limiting itself only auto-enables when `NODE_ENV=production`
(Better Auth's own sensible default - it's intentionally off in `next dev`), so 0 local rows in
`rate_limits` after testing is expected, not a bug - full confirmation needs checking Neon after
this deploys to production.

**2. No forgot-password flow existed in the UI**, even though the backend
(`emailAndPassword.sendResetPassword`) was already wired up in `src/auth/auth.ts` from the
original auth build - anyone who set a password and forgot it had no way back in short of OTP/
Google. Added `/forgot-password` (request a reset link) and `/reset-password` (consume the token,
set a new password) pages, plus a "Forgot your password?" link on `/sign-in`. Client methods
(`authClient.requestPasswordReset`/`resetPassword`) confirmed against the installed package's own
route definitions (`api/routes/password.mjs`), not guessed. **Verified with a real, full
end-to-end run**, not just UI inspection: created a real throwaway account, verified its email via
the real dry-run verification link, requested a real reset link, followed the real
`/api/auth/reset-password/:token` redirect, set a new password, and confirmed signing in with the
*new* password actually works - then deleted the test account.

**3. No privacy policy existed anywhere**, despite collecting name/email/phone and sending
marketing email/SMS. Added `/privacy` - a real, specific policy (what's actually collected, why,
where it's stored, that passwords are hashed not stored in plain text, that data isn't sold) using
the same `MAILING_ADDRESS` env var as the email footer, not generic boilerplate. Linked from the
sign-up page ("By signing up, you agree to our Privacy Policy") and added to the email footer
alongside the existing manage/unsubscribe link.

**Deliberately not built this pass** (flagged as gaps in the audit but not part of the 3 the
founder asked to close): self-service account deletion/data export (the privacy policy currently
says to contact support instead - a real manual-process stopgap, not a lie, but a smaller
self-serve version is a reasonable next step), and MFA/2FA. `tsc --noEmit` clean, full suite
110/110 unaffected (no new pure-logic functions warranted new unit tests this pass - the new
surface is entirely page/form components and a schema addition, matching this project's existing
testing-boundary convention).

**Verified live in production, not just locally**: after deploying, confirmed `/privacy` and the
"Forgot your password?" link render on the real site, then proved the rate-limit fix actually
works where it matters (not just that it's configured) - triggered a real `/forgot-password`
request against production and found the resulting row directly in Neon's `rate_limits` table
(`key: "{real IP}|/request-password-reset", count: 1`), not just a local/simulated check.

**Follow-up same day**: founder asked whether the privacy policy follows best practice and
"protects me legally," linking a commerce.gov privacy-laws page. Read that page directly rather
than assume - it's entirely federal-agency guidance (Privacy Act of 1974, FISMA, OMB memoranda,
FOIA), not a commercial-website benchmark; the one item on it actually relevant to this app is
COPPA. Gave an honest answer distinguishing two different questions the founder was conflating:
a privacy policy is a disclosure document (reduces FTC deceptive-practices risk if accurate;
doesn't limit liability), not a liability shield - that's what a Terms of Service (which doesn't
exist yet) plus proper business entity formation would actually provide. Recommended real
attorney review given this app collects PII and sends marketing communications - explicitly not
something this session can substitute for.

**Closed the three mechanical (non-legal-judgment) gaps identified in that review**, all in
`src/app/privacy/page.tsx`:
- A **children's privacy / COPPA** section - states the service isn't directed at under-13s and
  describes what happens if under-13 data is discovered.
- A **cookies** section - confirmed directly (grepped the codebase) that no analytics/tracking
  tooling exists at all (no Google Analytics, Vercel Analytics, PostHog, etc.) before writing this,
  so the policy accurately states the app uses only the essential auth session cookie.
- A named **legal entity**, via a new `LEGAL_ENTITY_NAME` env var (same "founder-supplied,
  not-yet-configured" bucket as `MAILING_ADDRESS`) - the product name isn't necessarily the
  registered business name, and a policy should say who "we" actually is. Shows the placeholder
  honestly until the founder sets a real value, matching this codebase's established convention
  for not-yet-configured founder-owned facts.

Verified rendering via `get_page_text` after the interactive browser pane hit the same known
flakiness as earlier this session (screenshots/clicks stalling, text extraction unaffected).
`tsc --noEmit` clean, full suite still 110/110.

## 55. Session log: 2026-08-17 (continued) — programmatic SEO: dedicated pages per school/league

Founder asked whether [gympricing.com](https://gympricing.com) (a gym-price comparison
aggregator - same shape of business as this repo, scraping each business's own site) offered
anything worth learning from. It did: rather than one filterable homepage, it generates a real
indexable page per neighborhood, per brand, and per individual location - each targeting one
specific long-tail search. This repo had the equivalent gap - one homepage with filters, nothing
indexable for "Amherst women's soccer schedule" or "NESCAC hockey schedule" as its own page.
(The other real finding from that comparison - a "claim your listing" free-to-paid funnel for
business owners - validates the plan's existing School Portal concept (0.2/4.2) almost exactly,
recorded for later, not built this pass.)

**New pages**: `/schools/[slug]` and `/leagues/[slug]` (one per school/league, upcoming schedule),
plus `/schools` and `/leagues` index pages linking to every individual one, added into the
existing `sitemap.ts` (Next's App Router convention) alongside what was already there. Caught a
real mistake before committing, not after: an early version of this edit *replaced* the sitemap's
existing upcoming-event-page entries with just the new school/league URLs instead of adding to
them - a real regression (event pages catch different, very-long-tail queries a school/league
page wouldn't). Fixed to include both.

**No stored slug column** - `schools.name` already has a DB-level unique constraint and league
names are already deduped text (`getFilterOptions().leagues`), so slugifying either at request
time (new `src/lib/slug.ts`) is always stable and collision-free, same reasoning
`specialVenues.ts` already applies to venue name matching. Confirmed the one real edge case
(a league name that's already hyphenated, "Northeast-10") slugifies to itself unchanged.

**A new `"season"` `DateRange` value** (`src/db/dateRange.ts`) - today through +150 days. Not a
homepage-toggleable range (existing `today`/`weekend`/`week`/`month` cover that UI), but the
school/league pages need "the upcoming schedule" rather than a narrow window a search visitor
would have to already know to widen - `month` alone would show zero games in an off-month.
Reuses `getFilteredEvents`/`EventFilters.schoolId`/`.league` entirely as-is - zero query-layer
changes needed beyond this one new range and the two slug-lookup functions
(`getSchoolBySlug`/`resolveLeagueSlug`) added to `queries.ts`.

**Extracted `src/components/EventList.tsx`** from the homepage's inline day-grouped list
rendering - the third caller needing the identical markup (homepage, school page, league page)
crossed this project's own established threshold for when duplication is worth extracting
(`SchoolLogo.tsx`'s comment on the same judgment call, Section 51). Homepage now just calls
`<EventList events={events} emptyMessage={...} />` - `page.tsx` lost ~140 lines with no behavior
change, confirmed via a live diff of the rendered homepage before/after.

**Verified live against real Neon data**: homepage still renders identically (including the new
"Browse all schools"/"Browse all leagues" nav links); `/schools` lists all 100 real schools;
`/schools/amherst-college` renders a real logo, conference/division/city, and a real 150-day
schedule starting from a real upcoming game; `/leagues/northeast-10` renders real cross-
conference games correctly (a Southern New Hampshire @ Dartmouth game shows up because SNHU's
side is Northeast-10, even though Dartmouth itself is Ivy League - confirmed this is the existing
league-filter's real either-side-matches behavior, not a bug); `/sitemap.xml` produces valid XML
listing every school/league URL; an invalid slug correctly 404s. `tsc --noEmit` clean, full suite
117/117 (110 + 7 new: 6 slug tests, 1 season-range test).

## 56. Session log: 2026-08-17 (continued) — list-view "Buy Tickets" stays in-app for embeddable games

Founder checked which real upcoming games are actually embeddable (5 of 296 ticketed games right
now, all Saint Anselm home football - Bryant/Merrimack are on the same verified allowlist but
have no upcoming game with a ticket URL populated yet) and noticed the homepage/school/league
list views still always opened "Buy Tickets" as an external new-tab link, even for those 5 -
unlike the event detail page, which already embeds the real checkout (Section 47). The list
views never checked embeddability at all before deciding how to render the button.

Fixed in `EventList.tsx` (the one shared component behind the homepage, `/schools/[slug]`, and
`/leagues/[slug]` - Section 55's extraction meant this one change covers all three list surfaces
at once): when `resolveTicketEmbed(event.ticketUrl)` resolves, "Buy Tickets" becomes a plain
in-app `<Link>` to that game's own page (where the real embed lives) instead of an external
`target="_blank"` link - every non-embeddable ticket url is untouched, still opens externally
with its UTM tag intact. Verified live: Saint Anselm's schedule page shows 5 internal
`/events/{id}` links and 2 correctly-still-external ones (Etix, a Constant Contact link) side by
side, and clicking through to one of the 5 shows the real Vivenu checkout rendering in place.
`tsc --noEmit` clean, full suite still 117/117 (no new pure-logic function - `resolveTicketEmbed`
already had its own tests from Section 47).

## 57. Session log: 2026-08-17 (continued) — homepage empty state points at the next real match
instead of a dead end

Founder sent a real screenshot of the confusion: filtering by School (Saint Anselm) + Sport
(Football) with "This Weekend" selected showed zero results, with no indication why - the date
range and the who/what filters are two fully independent constraints on the homepage, so a
perfectly valid combination looks broken whenever the current window just doesn't happen to
contain it. The `/schools/[slug]`/`/leagues/[slug]` pages (Section 55) don't have this problem
(no date-range control at all, always "season"), but the homepage's Today/Weekend/Next 7 Days/
Month toggle does.

**Fix, same pattern a booking site uses for "no rooms these dates"**: when the active filters
produce zero results, look ahead (unbounded by the visible window - reuses the existing `season`
range, Section 55) for the actual next matching game and surface it directly: "No games this
weekend match your filters. Next match: Saturday, September 12 — Bentley University at Saint
Anselm College" with a `View game →` link straight to it. Only fires in the empty+filtered case
(one extra query, not on every page view) - genuinely filter-less empty windows (a real off-
season week with no filters active) still get the original generic message unchanged.

Required widening `EventList`'s `emptyMessage` prop from `string` to `React.ReactNode` so it can
carry a real link, not just text - a small, contained generalization of the Section 55 extraction
rather than a new component.

**Verified against the founder's exact scenario**, not a synthetic one: reproduced the same
School=Saint Anselm/Sport=Football/range=weekend combination from the screenshot, confirmed it
now shows "Next match: Saturday, September 12 - Bentley University at Saint Anselm College" and
that the link lands on the real game page (with its embedded ticket checkout, Section 56, intact).
Also checked a school-only filter (correctly found a different next match) and a division+state
filter with no school/sport (D1 + VT, correctly found UVM's next game) - not just the one
originally-reported case. `tsc --noEmit` clean, full suite still 117/117.

## 58. Session log: 2026-08-17 (continued) — public JSON API (v1) + a first Chrome extension

Founder asked how to make this a Chrome extension. Recommended against the simplest option
(iframing the live site in a popup - confirmed technically possible, no `X-Frame-Options` set,
but a full responsive page doesn't fit a ~400px popup well) in favor of a real native popup UI
backed by structured data - which meant finally building the small public API already scoped in
Section 0.12 and never started, since the extension needs *something* to fetch.

**New `src/app/api/v1/events` and `src/app/api/v1/schools`** - public, unauthenticated, CORS open
(`Access-Control-Allow-Origin: *`, since this is the same data already rendered on every public
page - nothing sensitive, and a `chrome-extension://` origin has no fixed value to allowlist
anyway). `/events` mirrors the homepage's own filter vocabulary exactly (`range`/`date`/
`division`/`state`/`school`/`sport`/`league`, reusing `getFilteredEvents`/`DateRange`/
`EventFilters` as-is) rather than inventing a second one.

**Real leak caught before shipping, not after**: the first version of `/events` serialized
`WeekendEvent` rows directly, which silently carried internal-only fields
(`homeSchoolWebsiteUrl`/`homeSchoolCmsPlatform`, etc. - used internally to resolve `logoUrl`,
Section 51) into the public JSON response, because TS's structural typing doesn't strip extra
untyped fields off an object. Caught by actually hitting the endpoint and reading the real
response, not by inspecting the code alone. Fixed with an explicit `toPublicEvent()` allowlist
rather than a raw pass-through.

**New `chrome-extension/` directory** - Manifest V3, a vanilla-JS popup (no build step/framework -
this is a small, self-contained surface, not worth a bundler), simple icons generated locally via
Pillow (an orange/white "GD" monogram matching the site's brand color, no existing app icon asset
to reuse). Shows the current range (Today/Weekend/Next 7 Days) with a school filter that persists
across opens via `chrome.storage.local`; clicking a game opens its real page on the live site in a
new tab rather than trying to reproduce ticket/streaming embeds inside the tiny popup itself.

**Verified what could be verified from here, flagged what couldn't.** Confirmed both API
endpoints live against the real dev server, including confirming the leak fix actually took
effect (one false alarm along the way - a stale *browser* cache on the first re-check, not a code
problem, resolved with a cache-busting query param). Served the extension folder locally and
loaded `popup.html` directly to check its layout and fetch/render logic - this surfaced a real,
expected gap: the popup correctly failed against `api/v1/*` with a 404 because those routes
existed only on the local dev server, not yet pushed to production. Committing this section
together with the API routes closes that gap.

**Went further than "looks right" for the interactive behavior specifically, since that's exactly
where a popup like this tends to break silently.** Initial testing (serving the folder locally,
loading `popup.html` directly) hit a real wall: `chrome.storage`/`chrome.tabs` don't exist outside
a real installed extension, so the school-filter and event-click handlers threw immediately
(confirmed via console: `Cannot read properties of undefined (reading 'local')`) - which could
easily have been mistaken for "can't verify this at all, trust the code." Instead built a small
local-only test harness (`_test_harness.html`, stubs `chrome.storage`/`chrome.tabs` with an
in-memory/console-logging fake, deleted after use - never shipped) that loads the real, unmodified
`popup.js`. That let every interactive path actually run for real: selecting a school genuinely
re-fetches and filters the list (confirmed the rendered cards changed from a 4-school mix to only
Bryant games), the selection genuinely persists to the storage stub, and clicking a game card
genuinely calls `chrome.tabs.create` with the exact right event URL. What's left, and genuinely
can't be closed from here: the real `chrome://extensions` → "Load unpacked" → click-the-toolbar-
icon flow needs a real Chrome install and an OS-level file picker - that step is the founder's to
do. But everything the popup's own code actually *does* once installed is now verified, not
assumed. `tsc --noEmit` clean, full suite still 117/117 (no new pure-logic function on the Next.js
side; the extension's own JS has no automated test harness - a small, isolated file, verified
interactively instead, matching this project's existing testing-boundary convention for UI code).

## 59. Session log: 2026-08-17 (continued) — Chrome Web Store submission prep

Founder wants the extension actually published. Two real limits worth being explicit about: an
agent can't create the founder's own Chrome Web Store developer account or pay its one-time $5
registration fee (an account-creation/payment action, outside what this session can do), and
can't drive `chrome://extensions` → Load unpacked → the store's own upload form (OS file pickers,
a real account session). Both stay the founder's to do. Everything else - prepared here.

**Added a "Chrome extension" section to `/privacy`** - Chrome Web Store review checks that a
listing's linked privacy policy actually covers the extension's real data practices, not just the
main product's. States plainly what's true: no personal data collected or transmitted, a school
filter choice (if any) saved only in the browser's own local storage, never leaves the device
except as a school id in the API request that already has to happen to filter results.

**Built real assets, not mockups, in `chrome-extension/store-assets/`**: a submission-ready
`gdne-extension-v1.0.0.zip` (manifest + popup + icons only, no dev files); a 1280x800 store
screenshot composited around an *actual* headless-Chrome capture of the real popup rendering real
live production data (`google-chrome --headless --virtual-time-budget=4000 ...` - the first
attempt without a virtual-time budget captured the "Loading…" state before the async fetch
finished, caught by looking at the output rather than assuming the flag wasn't needed); a
440x280 promotional tile generated with Pillow, on-brand; and `SUBMISSION_PACKET.md` with the
exact listing copy, permission justifications, and privacy-practices answers ready to paste into
the dashboard. Everything needed to submit is prepared - creating the developer account, paying
its $5 fee, and clicking submit are the founder's own account/payment actions to take.

## 60. Session log: 2026-08-17 (continued) — ICS calendar export + a founder-only admin backend

Founder pasted independent advice from Gemini about where to take the app next and asked to
build the one genuinely new, low-risk idea in it (calendar sync), plus a separate ask: a real
backend for tracking and viewing user behavior. Worth noting for the record: most of Gemini's
other suggestions (team-level follows, in-app streaming/tickets, sponsor-brought-to-you-by ads,
ticket affiliate cuts) were already built earlier this session - it was reasoning from a
description of the product, not from this file, so it independently converged on several things
already shipped rather than proposing them fresh.

**Calendar export** - new `src/lib/ics.ts`, a minimal hand-rolled RFC 5545 generator (no library;
this app only ever needs VEVENT/VCALENDAR with a handful of fields). Three new routes:
`/api/events/[id]/ics` (single-game download), `/api/schools/[slug]/ics` and
`/api/leagues/[slug]/ics` (real subscribable feeds using the same `season` window the
Section 55 pages already show, so what a calendar app displays matches what the page displays -
Google/Apple Calendar's "subscribe from URL" re-fetches these on their own schedule, so new games
appear with no action from the user). "📅 Add to Calendar" / "📅 Subscribe to full schedule" links
added to the event/school/league pages respectively. 9 new unit tests for the ICS generator
(caught one real test bug of my own along the way: asserting "no `\n` anywhere" is wrong for a
`\r\n`-terminated format, since `\r\n` itself contains `\n` as a substring - fixed to assert the
real invariant, no *bare* `\n`). Verified all three routes live (correct `Content-Type`/
`Content-Disposition`, real ICS output, a 404 for a bad slug) and both new UI links rendering
correctly.

**Admin backend** - new `/admin`, gated by a single hardcoded `ADMIN_EMAIL` env var (same
founder-owned-fact bucket as `MAILING_ADDRESS`/`LEGAL_ENTITY_NAME`) rather than a real roles
system - there's exactly one admin, and building role-based access for a single user would be
infrastructure ahead of any real need. 404s (not a 403/login redirect) for anyone else, so the
page's existence isn't advertised. Confirmed the fail-closed default directly: with no
`ADMIN_EMAIL` set, `/admin` 404s unconditionally, session or not.

Most of what it shows needed **zero new tracking** - it's real aggregation over data this app
already collects for its own product reasons: total/new users, follows broken down by type, most-
followed schools/leagues, digest sends by channel, consent/follow action counts. The one genuinely
new piece is an anonymous page-view counter (new `pageViews` table: path + timestamp only, no
user id, session id, IP, or cookie) - deliberately minimal to stay consistent with this app's
existing "no tracking cookies" privacy claim rather than reach for a real analytics vendor.
Added a line to `/privacy`'s Cookies section disclosing this plainly rather than leaving it
unmentioned, matching this session's established discipline of keeping that page accurate as new
surfaces are added (COPPA/cookies/legal-entity, Chrome extension - Sections 54/59).

**Verified the real hard part - the aggregation queries - against live production data**, not
just that the page renders: ran `getAdminStats()` directly and confirmed `totalSchools`/
`totalEvents` matched known real numbers (100/34,243) and that a real page-view genuinely written
during this same verification pass was correctly read back by the aggregation query - proving the
full write-then-aggregate pipeline works, not just that each half compiles. Deleted those test
page-view rows afterward so the dashboard starts from genuinely clean data, same cleanup
discipline as every other live-data test this session. `tsc --noEmit` clean, full suite 125/125.

**Not yet done, needs the founder**: set `ADMIN_EMAIL` in Vercel to actually unlock `/admin` -
same category as every other founder-owned env var in this file.

## 61. Session log: 2026-08-17 (continued) — VC/market research memo (Section 0.13), then real
final-score capture built from it

Founder asked to cross-reference this file against real 2026 VC/sports-tech research ("where
dollars are being spent, where they want to see development") - recorded as **Section 0.13**
(fan-graph infrastructure is now a named VC category, not just this founder's private thesis;
AI recap/highlight automation is the highest-confidence 2026 sports-tech bet; women's/non-revenue
college sports are a real, currently-surging category that overlaps a differentiator this product
already has; vertical AI's actual thesis is "small teams, one narrow thing done completely,"
validating the plan's five-agent model; Sports Innovation Lab's acquisition by Genius Sports is a
real M&A comp for the "own the fan graph" thesis, checked directly at the founder's request, not
an investor). Full findings and citations live in Section 0.13 itself, not repeated here.

**That research surfaced a real, previously-undiscovered gap, acted on the same session: this
product has never captured final scores/results at all.** `events.status` could be `"final"`
per Section 5's original schema design, but nothing anywhere in the ingestion pipeline ever set
it - every event was hardcoded to `status: "scheduled"` on every ingest, forever, confirmed via
`grep` finding zero call sites setting any other status value. This is the "Results" half of the
business plan's own "Schedule & Results Agent" (Section 0.3) that was never addressed, and the
direct prerequisite for any future AI-recap feature (Section 0.13's Recommendation 1).

**Feasibility, checked live against real data before writing any code:** SIDEARM's ICS feed
(`DESCRIPTION` field, already parsed for TV/streaming/ticket lines) carries no score data at all
- confirmed via Amherst's real feed. But SIDEARM's own schedule *page* (already fetched by
`fetchSportMeta()` for ticket-link/sport-discovery, Section 16) embeds a real, consistently-
shaped `result` JSON block per game - confirmed by fetching a genuinely-completed spring sport
(Amherst baseball, season ended ~May 2026; football/hockey were still preseason/off-season as of
this session, which is why the first two checks came back all-null and had to be treated as
inconclusive rather than a negative result). Real example: `"result":{"game_id":14757,
"status":"W","team_score":"24","opponent_score":"7",...,"boxscore":"/boxscore.aspx?id=14757",
"line_scores":null}`, keyed by the same `game_id` already extracted from `sourceUrl` (the same
join key already proven for the Paciolan ticket-widget work, Section 16). **Presto checked
separately, not assumed symmetric**: its schedule page (Central Connecticut State, a school
already confirmed not WAF-blocked) has zero score-related fields of any kind - consistent with
Section 29's already-known finding that Presto's ICS `DESCRIPTION` carries no structured data
either. A real, accepted coverage asymmetry - same shape as tickets/streaming's existing
SIDEARM-only coverage.

**Built**: `GameResult`/`extractGameResults()` in `discover.ts` - a field-anchored regex (not a
full balanced-brace JSON parse, since the unused `line_scores` field can itself be a large
nested object) pulling `status`/`team_score`/`opponent_score`/`boxscore` per game, only trusting
entries with a real non-null status and two parseable scores. Wired into `fetchSportMeta()`
alongside the existing Paciolan-ticket extraction (same HTML fetch, no new network call). New
nullable `events.homeScore`/`awayScore`/`boxscoreUrl` columns (migration `0017_plain_katie_power.sql`,
purely additive). In `ingestSchool.ts`: `team_score`/`opponent_score` in the source data are
relative to whichever school's own page was fetched, not home/away - mapped using the same
`matchup.isHome` signal already used for ticket/streaming fields, **but trusted on both the home
and away pass** (unlike ticketUrl/streaming), since this is the ingesting school's own result for
its own game regardless of which side it played on. `status` is set to `"final"` only when a real
result was found; otherwise stays `"scheduled"` as before - no other status transitions
(postponed/cancelled) were in scope here and still aren't set anywhere.

**Verified three ways**: 5 new unit tests in `discover.test.ts` using real fragments captured
from Amherst's live page (a real win with a boxscore link, a real loss with a nested
`line_scores` object to confirm the field-anchored regex doesn't get confused by it, an all-null
not-yet-played game correctly producing zero entries, multiple games on one page, an empty page).
A targeted single-school local ingest (`ingest.ts "Amherst College" baseball`) followed by a
direct DB query confirmed real rows: `status: 'final'`, correct home/away score mapping spot-
checked against the raw source (game 14757: Amherst was the away team and scored 24, the query
correctly shows `awayScore: 24`), real absolute boxscore URLs. Then a full production backfill:
migration applied to Neon (schema-only, purely additive), and - since a full `--all` production
ingest write was correctly blocked by the auto-mode safety classifier from the agent's own Bash
tool, same pattern as Sections 44/46/53 - the founder ran `ingest.ts --all` directly. Confirmed
after: **1,254 events now `status: 'final'` on Neon, 1,444 with real scores** (basketball/
baseball/softball examples spot-checked, e.g. a real 61-45 final). `tsc --noEmit` clean, full
suite 130/130 (125 + 5 new). Committed and pushed (`da2a59d`).

**Not yet done, deliberately out of scope this pass**: the Content Agent itself (LLM-generated
recap text from this new score data) - Section 0.13 always scoped that as separate, dependent
follow-on work, not bundled into the feasibility-check-plus-capture pass done here. Also not
done: postponed/cancelled status detection (a separate, real gap - this pass only ever writes
`"scheduled"` or `"final"`), Presto score capture (no viable data source found).

## 62. Session log: 2026-08-17 (continued) — Section 0.13's Recommendation 2: gender filter +
women's-sports landing page

Built the cheap, no-dependency half of Section 0.13's research - real 2026 women's/non-revenue
college sports viewership and revenue growth (finding #4) had no corresponding hook anywhere in
this product, despite the underlying coverage already existing (Section 1's "every varsity
sport" principle has covered women's programs since Day 1).

**Homepage gains a Gender filter** (`mens`/`womens`/`coed`), same pattern as the existing
Division/State/School/Sport/League filters - `EventFilters.gender` added to `src/db/queries.ts`,
composes with every other filter via a plain `eq()` (no third arm needed the way `schoolId`'s
`participatingSchoolIds` check requires, since `gender` is `NOT NULL` on both games and
special_events per Section 5's schema).

**New `/womens-sports` page** - same fixed-filter-landing-page pattern as `/schools/[slug]` and
`/leagues/[slug]` (Section 55), but with no slug param since there's only one of it. Targets
"women's college basketball schedule near me"-style searches directly, added to `sitemap.ts`.
Root `layout.tsx` metadata description now names "women's and non-revenue sports included"
explicitly rather than leaving it implicit in the filter list.

**Verified live against real Neon data**: `/womens-sports` renders real upcoming events across
multiple sports (field hockey, soccer, volleyball) with correct logos/venues/times;
`?gender=womens&sport=soccer` on the homepage correctly narrowed to 31 real events, spot-checked
via a script-injected DOM check confirming all 31 matching rows said "Women's Soccer" and zero
said "Men's Soccer" - not just that the count changed. No new pure-logic function was added (a
plain equality filter), so no new unit tests - existing 130/130 suite unaffected, `tsc --noEmit`
clean. Committed and pushed (`835ed02`).

**Both halves of Section 0.13's concrete recommendations are now shipped.** What's left from
this session's research memo: the Content Agent itself (dependent on Section 61's score data,
not yet started) and the standing founder-only punch list (`ADMIN_EMAIL`, Resend domain, Twilio
10DLC, Chrome Web Store submission, Terms of Service).

## 63. Session log: 2026-08-17 (continued) — Content Agent scoped, not built. Pick up here next
session.

Scoped the last unbuilt piece from Section 0.13 (the Content Agent - LLM-generated recap text
from Section 61's new score data). Not started - the founder wants to build it a future session,
recorded here so the scope isn't lost to chat history.

**Model: Claude Haiku 4.5 (`claude-haiku-4-5`), not a larger model.** Structured data in
(final score, team names, sport, venue, date), one factual sentence out - no reasoning needed,
squarely the shape Haiku is for. Real cost estimate at this app's actual volume: ~200 input +
~60 output tokens per recap at Haiku's $1/$5-per-MTok pricing - **~$0.0005/recap**, under $2/mo
even at a few thousand generations. Prompt caching is deliberately **not** part of the design -
Haiku 4.5's cache minimum is 4,096 tokens, this system prompt is nowhere near that, and at this
per-call cost caching wouldn't move anything even if it engaged.

**Design: on-demand + cache in the DB, never regenerate** - same "don't spend money on something
nobody looks at" instinct as every other feature this project has built cheaply first (the
newsletter sponsor pilot, Section 0.11). New nullable `events.recapText` column (purely
additive, same migration pattern as every other addition this session). On `/events/[id]`, a
game with `status: 'final'` and `recapText` still null triggers one generation, saved
permanently; every later view of that game is a free read. No batch/nightly generation, no
folding into the digest email - both explicitly deferred, the lazy approach is cheaper by
construction since most non-marquee D3 games likely get near-zero page views.

**Implementation sketch** (`src/lib/recap.ts`, not yet written):
```ts
const client = new Anthropic(); // reads ANTHROPIC_API_KEY - unset means the caller skips this entirely

export async function generateRecap(game: {
  sport: string; gender: string;
  homeSchoolName: string; awaySchoolName: string;
  homeScore: number; awayScore: number;
  venueName: string | null; startDatetime: Date;
}): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      system: "Write one factual sentence recapping this completed college game: winner, final score, sport. No speculation, no play-by-play, no exclamation points.",
      messages: [{ role: "user", content: JSON.stringify(game) }],
    }, { timeout: 15_000 });
    const block = response.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text : null;
  } catch {
    return null;
  }
}
```
Guards: `max_tokens: 100` hard ceiling (output should always be 1-2 sentences); a 15s client
timeout, not the SDK's 10-minute default, so a slow call can't hang the event page's render;
wrapped in try/catch, fails silently to no-recap rather than a broken page - same fire-and-forget
discipline as `logPageView()`. `ANTHROPIC_API_KEY` unset makes the feature fully inert, same
founder-owned-credential convention as `RESEND_API_KEY`/`TWILIO_*`/`GOOGLE_CLIENT_ID`.

**Not yet done, next session should start here**: nothing built - schema column, `src/lib/recap.ts`,
and the event-page wiring are all still to write. Founder still needs an `ANTHROPIC_API_KEY` from
the Anthropic Console, set in Vercel - same bucket as every other still-open founder credential
(`ADMIN_EMAIL`, Resend domain, Twilio 10DLC).

## 64. Session log: 2026-08-18 — Content Agent built (Section 63's scope, now shipped)

Built exactly as scoped in Section 63, no design changes. `npm install @anthropic-ai/sdk`;
new `src/lib/recap.ts` (`generateRecap()`) calls Claude Haiku 4.5 with structured score data
(sport, gender, both school names, both scores, venue, date) and returns one factual sentence,
or `null` on any failure - missing key, network error, timeout, empty response. Lazily
constructs the Anthropic client so a missing `ANTHROPIC_API_KEY` never throws at module load
(this file is imported by the event page on every request, not just final-game ones).

**New nullable `events.recapText` column** (migration `0018_orange_stellaris.sql`, purely
additive) - generated once, cached forever, exactly the "don't spend money on something nobody
looks at" design from Section 63. `src/db/queries.ts` gained `saveRecap()` and extended
`EventDetail` (not the shared `WeekendEvent` - Section 42's list-page-payload discipline) with
`homeScore`/`awayScore`/`boxscoreUrl`/`recapText`, none of which had ever been exposed past the
schema/ingestion layer since Section 61 built score capture - a real, previously-unnoticed gap:
**the final score itself was never shown anywhere in the product** until this session. Fixed in
the same pass, not treated as a separate task, since a recap sentence with no visible score
next to it would have looked disconnected.

`src/app/events/[id]/page.tsx`: on a `type === "game"` row with `status === "final"`, real
scores, and both school names resolved, and no `recapText` yet, generates and persists a recap
inline during the request; renders a bold score line (`awayScore - homeScore`, matching this
app's existing away-first convention) with a box score link when one exists, plus the recap
sentence below it when present.

**Verified live against real Neon data** (a real Amherst 65-37 win over Hamilton, men's
basketball): score line renders correctly (`37 - 65`, away first), box score link present and
correct, no recap section rendered - confirmed genuinely inert with `ANTHROPIC_API_KEY` unset
(the founder hasn't set this up yet, same as Resend/Twilio), not just skipped by an untested
code path. No server errors. A scheduled (not-yet-played) game confirmed unaffected - no score
line, no crash, normal rendering.

**4 new unit tests** (`src/lib/recap.test.ts`) mocking the `@anthropic-ai/sdk` module itself
(not a global, unlike `embed.test.ts`'s plain `fetch` mocking, since this goes through the SDK's
client class) - unset key skips the API entirely, a successful response returns trimmed text, a
response with no text block returns null, a thrown error (network/timeout/rate-limit) returns
null. One real mocking gotcha hit and fixed: `vi.fn().mockImplementation(() => ({...}))` fails
with `TypeError: ... is not a constructor` since arrow functions can never be `new`'d - fixed
with a plain `function MockAnthropic() { return {...}; }`. `tsc --noEmit` clean, full suite
134/134 (130 + 4 new). Committed and pushed (`f4976b8`).

**Not yet possible to verify**: actual generated recap text/quality, since that needs a real
`ANTHROPIC_API_KEY` - the founder's own credential to add, same bucket as every other pending
founder-owned setup item in this file. Once set, the very next view of any final game will
generate and permanently cache its first real recap with no further code changes needed.

## 65. Session log: 2026-08-20 — production-tampering scare (real, thorough audit, nothing
found) + Vemetric web/product analytics added

**A different AI coding tool ("Grok Bot") was reported to have made changes to this app.**
Treated as a real incident, not a formality - checked every surface this app actually runs on:
`git fetch` + diff against `origin/main` (identical, no new commits, no other branches, clean
reflog), a direct Neon query (19 tables, all expected; 19 applied migrations, all matching files
already in `drizzle/`; `events`' 32 columns exactly matched this session's own prior work; the
most recent writes lined up precisely with the existing daily ingestion cron, not a rogue write),
and the live production site itself (`game-day-new-england.vercel.app`'s served scripts,
meta tags, and rendered behavior all matched this repo's actual code exactly - no injected
script, no unexpected origin). Founder then confirmed Grok's changes were reportedly made
**directly in Vercel**, not through git - explaining why the above came back clean. Got the
`vercel` CLI working via `npx` (founder ran `vercel login` + `vercel link` themselves, the
interactive parts I can't do), then checked what git can't see: deployment history (current
production deployment's alias includes `-git-main-`, confirming it's genuinely git-triggered,
not a stray CLI upload), environment variables (exactly the 5 already known - `DATABASE_URL`,
`RESEND_API_KEY`, `CRON_SECRET`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_BASE_URL` - all created
7-14 days before this session, nothing new or recently touched), and domains (zero attached).
**Conclusion: no evidence the reported change actually landed anywhere in this app's real
infrastructure.** Recorded plainly rather than either fabricating a "here's what changed"
summary or quietly dropping the question - this is exactly the kind of unverified claim this
project's own discipline says to run to ground before building on top of it, not wave through.

**Vemetric added** (founder's own request, real product need - see the Vercel CLI link above,
now genuinely useful going forward for the founder to check deployments/env vars directly
without going through this file's audit trail every time). Cloud-hosted only right now (no
self-host option exists yet, checked directly against their docs before assuming otherwise) -
cookieless by design, GDPR-compliant per their own claim, free tier is 2,500+ events/month
which comfortably covers this app's real traffic. `npm install @vemetric/web @vemetric/node`.

**Client-side**: new `instrumentation-client.ts` (project root - Next.js 16.3 is well past the
15.3+ threshold this convention needs) calls `vemetric.init({token})` only when
`NEXT_PUBLIC_VEMETRIC_TOKEN` is set - same "unset env var = inert" convention as every other
vendor integration in this app. Confirmed directly against Vemetric's own docs before assuming
it: automatic page-view tracking, including client-side SPA route changes via the History API,
is on by default with `init()` alone - no extra per-route wiring needed, unlike a naive
assumption that Next.js App Router navigations would need manual `trackPageView()` calls.

**Server-side**: new `src/lib/vemetric.ts` wraps `@vemetric/node` behind the identical
lazy-client pattern `src/lib/recap.ts` already established (Section 64) - construct once, gated
on the token being present, every call wrapped so a Vemetric outage or bad token can never break
the real user action it's attached to. One real fix mid-build: the installed SDK's own type
definitions (checked directly, not assumed from docs) show `userIdentifier` is **required** on
every `trackEvent` call, not optional as first drafted - `trackEvent()`'s signature takes it as
a required second argument, always the account's own internal id, never an email or phone
number.

**Two real product events wired, both at their single existing integration point rather than
scattered across call sites**: `UserSignedUp` via Better Auth's `databaseHooks.user.create.after`
(fires post-insert with the real final `user.id`, covers all 3 signup methods - password/email
OTP/phone OTP - from this one hook, no per-method duplication) and `Followed`/`Unfollowed` via
the single shared `/api/follow` route that already handles all 5 follow types (school/team/
league/venue/game) in one handler.

**Real privacy-policy update, not an afterthought** - the previous "Cookies" section explicitly
said "We don't use analytics... tracking cookies... and we don't share [data] with any third
party," which was accurate before this and would have been false the moment Vemetric shipped.
Renamed to "Cookies and analytics," rewrote to disclose Vemetric plainly (cookieless, what ties
to an account - internal id only, never name/email/phone - vs. what stays fully anonymous, the
existing bespoke page-view counter from Section 60 unchanged and still separately disclosed),
added Vemetric alongside Resend/Twilio in the "Where your data is stored" processors list, and
bumped `LAST_UPDATED` - same discipline this policy has followed for every prior new
data-touching surface (COPPA, cookies, the Chrome extension, the page-view counter itself).

**Verified live, not just typechecked**: app boots clean with no token set (console clean, no
server errors - confirming the inert path actually works, not just that the code compiles); the
privacy page renders the new copy correctly; and a full real sign-up was completed end-to-end
via direct DOM interaction (the browser tool's `read_page` hit its already-documented flakiness
- Sections 50/54 - fell back to `javascript_tool`, the established workaround) confirming the
new `databaseHooks.user.create.after` hook doesn't interfere with account creation. That test
sign-up landed in **production Neon**, not local PGlite - re-confirmed Section 33's standing
finding that the dev server's `.env.local` always points at Neon - so the test account was
found and deleted from Neon directly afterward, not left behind. `tsc --noEmit` clean, full
suite 134/134 unaffected (thin SDK wrappers, no new pure-logic function - matches this project's
existing testing-boundary convention for `src/lib/analytics.ts`). Committed and pushed
(`359af7b`).

**Not yet done, needs the founder**: sign up at `app.vemetric.com` (an account-creation step
this session deliberately does not do), create a project, and set `NEXT_PUBLIC_VEMETRIC_TOKEN`
in Vercel - same founder-owned-credential bucket as `ANTHROPIC_API_KEY`/`ADMIN_EMAIL`/etc.
Everything else activates automatically the moment that token exists, no further code changes
needed. Also flagged, not built: a genuinely valuable third event - ticket-link click-through,
directly relevant to Section 0.11's affiliate-revenue thesis - but tracking an external-link
click needs a real architectural fork (a same-origin redirect-through-our-server route, since
this app's plain `<a>` tags never hit our own server on click) that wasn't asked for and would
add a hop to every ticket link - flagged as a real option for a future session, not built
silently.

## 66. Session log: 2026-08-20 (continued) — ticket-click tracking built (the fork flagged in
Section 65)

Founder confirmed: build it. New `GET /api/events/[id]/ticket-click` - both real "Buy Tickets"
call sites (`EventList.tsx`'s shared list rendering used by the homepage/school/league pages,
and the event detail page) now point here instead of a plain external `<a href>`, since that's
the only way to observe a click server-side at all - an outbound link never touches this app's
own server.

**Deliberately takes an event id, not a destination URL** - the route looks up the real
`ticketUrl` itself via `getEventById()` and redirects to that, never to anything the request
supplies. Accepting an arbitrary `?url=` param and redirecting to it blind would have been a
real open-redirect vulnerability (a link that *looks* like it points at this trusted domain but
actually lands anywhere) - avoided by construction, not by validation. Falls back to the game's
own `/events/[id]` page (not a 404, not a dead end) when the id doesn't resolve or the ticket
URL went stale between page render and click. Fires `TicketClicked` via `src/lib/vemetric.ts`
(Section 65) with `userIdentifier` set to the signed-in user's id when a session exists, else
the literal string `"anonymous"` - deliberately not a cookie-based or fingerprinted identifier,
consistent with this app's actual "cookieless" claim (inventing a persistent anonymous id here
would have quietly undercut the privacy-policy language written earlier this same session).
Then 302s to `withTicketAffiliateTag(event.ticketUrl)` - the affiliate-tagging call itself moved
from the two page components into this route, so `withTicketAffiliateTag`'s import was removed
from both `EventList.tsx` and `events/[id]/page.tsx` as now-unused. Embeddable-checkout games
(Vivenu, Section 47/56) are unaffected - those already render a plain internal `<Link>` to the
in-app iframe, never touching this new route at all.

**Privacy policy updated again, same day** - the "Cookies and analytics" section written for
Section 65's Vemetric disclosure named signing up/following as example tracked actions; added
ticket-click tracking explicitly and clarified the anonymous-vs-signed-in split plainly ("if
you're not signed in, it isn't tied to you at all") now that anonymous visitors are a real,
common case for this specific event, not just an edge case.

**Verified live against real Neon data, not just typechecked**: `curl -sI` against the real
route for an actual ticketed game (a Hometown Ticketing link) confirmed a genuine 302 with the
correct affiliate-tagged destination in the `Location` header; a deliberately-invalid event id
confirmed the fallback-to-event-page path instead of an error; Saint Anselm's school page
(already known from Section 56 to have both embeddable and non-embeddable ticket games in the
same list) rendered both link types correctly side by side - internal `/events/[id]` links for
the embeddable ones, the new `/api/events/[id]/ticket-click` for everything else. `tsc --noEmit`
clean, full suite 134/134 unaffected (a redirect handler, no new pure-logic function - matches
this project's existing testing-boundary convention). Committed and pushed (`c40f937`).

**Both events flagged in Section 65 as worth adding are now live** (`TicketClicked` alongside
`UserSignedUp`/`Followed`/`Unfollowed`) - real usage data starts accumulating the moment the
founder sets `NEXT_PUBLIC_VEMETRIC_TOKEN`, same as the rest of Vemetric.

## 67. Session log: 2026-08-20 (continued) — Chrome extension: surface a school's real ticket
links when the user lands on that school's own athletics site

Founder's original ask ("surface ticket linking, with the best price, to the customer when they
land on a school's website") got scoped down live in chat before building anything: this app has
never captured any real ticket *price* data anywhere (confirmed via a fresh grep - zero
matches on "price"/"Price" across the schema/ingestion codebase), so true secondary-market price
comparison would mean a new, uncosted vendor integration (StubHub/SeatGeek/Vivid Seats), not a
few hours of wiring. Asked the founder directly which they actually wanted; they answered "YES"
to the smaller, already-buildable half - detect the site, surface the one real official ticket
link, if one exists. That's what got built. Price comparison itself is not started and would need
a real vendor-integration scoping pass first, same as any other new paid API dependency in this
project.

**Chrome permission research, checked directly, not assumed**: confirmed via `WebFetch` against
`developer.chrome.com/docs/extensions/reference/api/tabs` that the `"tabs"` permission ALONE
(no per-domain `host_permissions`, no `<all_urls>`) is sufficient for `chrome.tabs.query()`/
`onUpdated`/`onActivated` to expose the sensitive `url`/`pendingUrl`/`title`/`favIconUrl` Tab
fields - the doc states this plainly ("This property is only present if the extension has the
`tabs` permission or has host permissions for the page"). This is what let the feature avoid
either a ~100-entry `host_permissions` list (one per school domain) or the much broader
`<all_urls>` - both of which would have made the Chrome Web Store review's permission
justification noticeably harder to defend than "one general permission, on-device matching only."

**New `chrome-extension/background.js`** (manifest bumped to `1.1.0`, `permissions` gains
`"tabs"` alongside the existing `"storage"`): registers `chrome.tabs.onUpdated`/`onActivated`
listeners. On every tab navigation, extracts the hostname and checks it - entirely on-device,
never transmitted anywhere - against the school list fetched from `/api/v1/schools` (cached 5
minutes in memory, matching the existing pattern of not hammering the API on every tab switch).
On a match, fetches that one school's upcoming ticketed games
(`/api/v1/events?school=<id>&range=season`) and sets a tab-scoped toolbar badge (orange `#EA580C`,
matching the site's brand color) with the ticketed-game count; clears the badge on no-match or
non-http tabs (`chrome://`, etc.).

**`src/db/queries.ts`/`src/app/api/v1/schools/route.ts`**: the public schools API only ever
returned `id`/`name`, insufficient for hostname matching. Added `getPublicSchoolsUncached()` +
a 5-minute `unstable_cache`-wrapped `getPublicSchools()` returning `websiteUrl` too, and switched
the route to use it - the extension's hostname check (both `background.js` and the popup) reuses
this same public endpoint rather than a new one.

**`popup.js`/`popup.html`/`popup.css`**: `detectCurrentTabTickets()` runs after the existing
`loadSchools()` populates the school list, checks the current tab's hostname the same way the
background worker does, and - on a match with real ticketed games - renders a `#tickets-alert`
section above the normal Today/Weekend/Next-7-Days browsing UI, listing up to 3 real games with
"Buy Tickets →" links. Clicking one opens `/api/events/{id}/ticket-click` (the existing
click-tracking/affiliate-tagging redirect route from Section 66) in a new tab, so extension-
sourced ticket clicks get exactly the same `TicketClicked` Vemetric event and affiliate UTM
tagging as every other ticket link in this product - no separate code path invented for the
extension specifically.

**A real Manifest V3 gotcha found while building the verification harness, not in the shipped
extension itself**: classic (non-module) `<script>` tags loaded together into one page share a
single global lexical scope. Both `background.js` and `popup.js` independently declare
`const API_BASE` at module top-level - harmless in the real extension (the background service
worker and the popup run in genuinely separate JS contexts, never sharing scope), but loading
both into one throwaway test harness page threw `SyntaxError: Identifier 'API_BASE' has already
been declared`, which in turn silently aborted `popup.js` before `ticketsAlertEl` was even
assigned (confirmed via `read_console_messages` and a direct `javascript_tool` eval throwing
`ReferenceError: ticketsAlertEl is not defined`). Fixed by renaming the identifier only in the
throwaway background-worker test copy (`sed 's|API_BASE|BG_API_BASE|g'`), never touching the
real `chrome-extension/background.js` - a harness bug, not an extension bug.

**Verified end to end via a temporary local stub harness** (`public/_test_harness.html` +
sed-derived copies of the real `background.js`/`popup.js`/`popup.css`, hardcoded production URL
swapped to `http://localhost:3000`, all four files fully deleted after use - same throwaway-
diagnostic-script discipline used throughout this project): confirmed a matching tab (Saint
Anselm's real athletics domain) renders the badge text "7" in orange, a non-matching tab and a
non-http tab both correctly clear the badge, and the popup's `#tickets-alert` section renders 3
real Saint Anselm ticketed games with working "Buy Tickets →" links pointing at the real
click-tracking route. `tsc --noEmit` clean, full suite 134/134 unaffected (extension JS has no
automated test harness, same established testing-boundary convention as the rest of
`chrome-extension/`, Section 58).

**Privacy policy updated again, same day** (`/privacy`'s "Chrome extension" section): discloses
the new `tabs` permission plainly - the pages visited are checked on-device against ~100 known
school domains, never transmitted anywhere; only on a real match does the extension request that
one school's own public upcoming-games data, the same data already shown on the site.

**Chrome Web Store submission assets refreshed for v1.1.0**: `SUBMISSION_PACKET.md`'s permission-
justification table gained a `tabs` row, the "Does not collect web browsing history" line was
corrected to "**Does collect web browsing history**" with an accurate explanation (on-device only,
never transmitted), and the description/zip-filename references were updated throughout. Rebuilt
`gdne-extension-v1.1.0.zip` (verified via `unzip -l` - all 9 expected entries present) and deleted
the now-superseded `gdne-extension-v1.0.0.zip` from the repo, since keeping both would leave
ambiguity about which zip the founder should actually upload.

Committed and pushed (`d0d9fd8`).

**Not yet done, needs the founder**: the extension still needs to be re-loaded/re-tested via a
real `chrome://extensions` install (this session's verification used the stub-harness technique,
not a real installed-extension test - same limitation already on record from Section 58) and the
Chrome Web Store submission itself hasn't been completed - developer account, $5 fee, and the
actual upload/review process all remain the founder's own account-and-payment actions, same as
every prior mention of this in Sections 58-59. Real secondary-market price comparison (the
literal original ask) remains explicitly out of scope, not silently dropped - would need a new,
separately-scoped, likely-paid vendor integration if the founder wants to revisit it later.

**Vemetric CORS block, re-diagnosed - it's a bad token, not a domain-allowlist issue.** Section
65 originally flagged live production CORS errors on `hub.vemetric.com/e` and guessed it was
likely a domain-allowlist setting in Vemetric's dashboard. Checked directly this session, not
re-guessed: the founder's Vemetric project settings already show `Domain:
game-day-new-england.vercel.app` set correctly - confirmed via screenshot. Re-tested live
against production anyway (not assumed fixed): still CORS-blocked. **Ruled out "request never
reaching the server"** via a `no-cors` fetch from the live page's own console - got a real
`opaque` response (`type: "opaque", status: 0`), which only happens when the server actually
responds; a true network/DNS/firewall failure would throw instead. Founder then redeployed
(hoping a fresh build would help) and it was re-checked again: same CORS error, but this time
Chrome's console additionally leaked the real underlying status code before scrubbing it for
JS - **`the server responded with a status of 401 ()`**. A 401 (not 403, not a plain missing-
header case) means Vemetric's server is rejecting the *token itself* as invalid before it ever
gets to a domain-allowlist check - many APIs skip CORS headers entirely on an auth failure,
which is why this has always presented as a CORS error at the browser level even though the
real fault is authentication, not origin policy.

**Action needed from the founder, not yet done**: open the Vemetric project's setup/install page
(the one showing the real JS snippet with the actual token embedded) and compare that token
character-for-character against `NEXT_PUBLIC_VEMETRIC_TOKEN` in Vercel's environment variables -
looking for a mistype, truncation, stray quote marks, or a token copied from a different/old
project. This is a credential-mismatch problem, not a settings-propagation-delay or code problem,
so redeploying again won't help until the token itself is corrected. Once fixed, no code changes
or further deploys should be needed - Sections 65/66's `UserSignedUp`/`Followed`/`Unfollowed`/
`TicketClicked` events are already wired and waiting.

**Update, same night: founder supplied the real token (`0qnsbChQib4m5nwW`) directly - it's now
confirmed NOT a credential-mismatch problem, the issue is on Vemetric's own account/server
side.** Verified `vercel env pull` shows Vercel marks this var **`Sensitive`** - write-only, the
value can never be read back via CLI or dashboard once set, which is exactly why the prior
"compare it character-for-character" plan couldn't be carried out - there was nothing on the
Vercel side to compare against. Given that, replaced the value outright rather than trying to
diff it: `vercel env rm NEXT_PUBLIC_VEMETRIC_TOKEN production` then `vercel env add` with the
founder-supplied value, followed by a fresh `vercel --prod` build (required since this is a
`NEXT_PUBLIC_` var - it's baked into the client bundle at build time, so updating the env var
alone without a rebuild would not have taken effect). Confirmed the new deployment aliased
correctly to `game-day-new-england.vercel.app`.

**Still 401 after all that - and this time proven, not just plausible, that it's not a token
problem.** Fetched the live production JS bundle directly and grepped it for the literal token
string: found `.init({token:"0qnsbChQib4m5nwW"})` baked into
`chunks/1aa4ik-05i7id.js` on the fresh build - an exact, byte-for-byte match to what the founder
pasted from Vemetric's own dashboard. So: the token in Vercel is now proven correct (not just
assumed), the domain in Vemetric's settings was already confirmed correct via screenshot earlier
this session, the request demonstrably reaches Vemetric's server (an earlier `no-cors` fetch
test got a real `opaque` response, not a network failure), and it's a fresh, non-cached build.
**Every variable on this app's side is now individually confirmed correct, and the 401 persists
regardless.** This has to be something on Vemetric's own account/server side, not this codebase
or its config - recorded here specifically so a future session doesn't waste time re-checking
any of the above from scratch.

**Not yet done, needs the founder, next session should start here if picked back up**: check
Vemetric's own dashboard for (1) whether the token shown on the setup/install page is actually
labeled as a public/client tracking token, as opposed to a separate private/server API key that
looks similar but isn't meant for browser use, (2) any account-level hold - unverified email,
free-tier limit reached, billing/payment issue, project paused, (3) failing those, contact
Vemetric support directly with the concrete reproducible evidence now in hand: exact token, exact
domain, and a live 401 on `hub.vemetric.com/e` - a much stronger support ticket than the original
generic "CORS error" would have been, since it points directly at their own auth check rather
than something fixable from this app's config.
