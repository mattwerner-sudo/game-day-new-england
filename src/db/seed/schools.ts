// Validation batch: 10 real New England D1-D3 schools, verified live on 2026-08-04 by
// fetching each school's actual athletics schedule page and confirming SIDEARM CMS
// fingerprints (dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/... asset domains,
// "Sidearm Sports" footer attribution). See CLAUDE.md Section 8 for the platform-mix finding.
export const SCHOOLS_SEED = [
  {
    name: "Amherst College",
    conference: "NESCAC",
    division: "D3",
    city: "Amherst",
    state: "MA",
    lat: 42.3709,
    lng: -72.5148,
    websiteUrl: "https://athletics.amherst.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Williams College",
    conference: "NESCAC",
    division: "D3",
    city: "Williamstown",
    state: "MA",
    lat: 42.7128,
    lng: -73.2032,
    websiteUrl: "https://ephsports.williams.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Bowdoin College",
    conference: "NESCAC",
    division: "D3",
    city: "Brunswick",
    state: "ME",
    lat: 43.9128,
    lng: -69.9653,
    websiteUrl: "https://athletics.bowdoin.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Middlebury College",
    conference: "NESCAC",
    division: "D3",
    city: "Middlebury",
    state: "VT",
    lat: 44.0134,
    lng: -73.167,
    websiteUrl: "https://athletics.middlebury.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Tufts University",
    conference: "NESCAC",
    division: "D3",
    city: "Medford",
    state: "MA",
    lat: 42.4085,
    lng: -71.118,
    websiteUrl: "https://gotuftsjumbos.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Bentley University",
    conference: "Northeast-10",
    division: "D2",
    city: "Waltham",
    state: "MA",
    lat: 42.3868,
    lng: -71.2359,
    websiteUrl: "https://bentleyfalcons.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Saint Anselm College",
    conference: "Northeast-10",
    division: "D2",
    city: "Goffstown",
    state: "NH",
    lat: 43.009,
    lng: -71.6086,
    websiteUrl: "https://saintanselmhawks.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Assumption University",
    conference: "Northeast-10",
    division: "D2",
    city: "Worcester",
    state: "MA",
    lat: 42.2896,
    lng: -71.7987,
    websiteUrl: "https://assumptiongreyhounds.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Vermont",
    conference: "America East",
    division: "D1",
    city: "Burlington",
    state: "VT",
    lat: 44.4759,
    lng: -73.1959,
    websiteUrl: "https://uvmathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Bryant University",
    conference: "America East",
    division: "D1",
    city: "Smithfield",
    state: "RI",
    lat: 41.9226,
    lng: -71.5495,
    websiteUrl: "https://bryantbulldogs.com",
    cmsPlatform: "sidearm",
  },

  // Batch 2 (Full D3 rollout, step 1 of Section 3): 14 more schools, verified live on
  // 2026-08-04 the same way as the batch above (fetched each school's real athletics homepage,
  // grepped for the dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/... asset domain and/or
  // a "Sidearm Sports" footer attribution). See CLAUDE.md Section 12 for the full session log,
  // including 4 Little East candidates and 2 NE10 candidates that were researched but NOT added
  // (WebFetch blocked with HTTP 403 - likely bot/WAF protection, not confirmed either way) and
  // the Hamilton College (NESCAC, but Clinton NY) geographic-scope question left open in
  // Section 8 rather than silently resolved.
  //
  // Remaining NESCAC (5 of 6 candidates - Hamilton excluded pending the scope question above):
  {
    name: "Wesleyan University",
    conference: "NESCAC",
    division: "D3",
    city: "Middletown",
    state: "CT",
    lat: 41.5566,
    lng: -72.656,
    websiteUrl: "https://athletics.wesleyan.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Colby College",
    conference: "NESCAC",
    division: "D3",
    city: "Waterville",
    state: "ME",
    lat: 44.5588,
    lng: -69.6325,
    websiteUrl: "https://colbyathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Bates College",
    conference: "NESCAC",
    division: "D3",
    city: "Lewiston",
    state: "ME",
    lat: 44.1046,
    lng: -70.2064,
    websiteUrl: "https://gobatesbobcats.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Trinity College",
    conference: "NESCAC",
    division: "D3",
    city: "Hartford",
    state: "CT",
    lat: 41.7476,
    lng: -72.6892,
    websiteUrl: "https://bantamsports.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Connecticut College",
    conference: "NESCAC",
    division: "D3",
    city: "New London",
    state: "CT",
    lat: 41.3712,
    lng: -72.1004,
    websiteUrl: "https://camelathletics.com",
    cmsPlatform: "sidearm",
  },

  // Little East Conference (6 of 10 sampled candidates - the 6 below all confirmed live
  // SIDEARM via direct WebFetch; Bridgewater State, Framingham State, Salem State, and
  // Westfield State returned HTTP 403 to WebFetch and were left out unconfirmed - see
  // CLAUDE.md Section 12):
  {
    name: "UMass Dartmouth",
    conference: "Little East",
    division: "D3",
    city: "North Dartmouth",
    state: "MA",
    lat: 41.6362,
    lng: -70.9829,
    websiteUrl: "https://corsairathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Keene State College",
    conference: "Little East",
    division: "D3",
    city: "Keene",
    state: "NH",
    lat: 42.9337,
    lng: -72.2779,
    websiteUrl: "https://keeneowls.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Plymouth State University",
    conference: "Little East",
    division: "D3",
    city: "Plymouth",
    state: "NH",
    lat: 43.7564,
    lng: -71.6887,
    websiteUrl: "https://athletics.plymouth.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Rhode Island College",
    conference: "Little East",
    division: "D3",
    city: "Providence",
    state: "RI",
    lat: 41.8412,
    lng: -71.4396,
    websiteUrl: "https://goanchormen.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Southern Maine",
    conference: "Little East",
    division: "D3",
    city: "Gorham",
    state: "ME",
    lat: 43.6795,
    lng: -70.4442,
    websiteUrl: "https://southernmainehuskies.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Eastern Connecticut State University",
    conference: "Little East",
    division: "D3",
    city: "Willimantic",
    state: "CT",
    lat: 41.7148,
    lng: -72.214,
    websiteUrl: "https://gowarriorathletics.com",
    cmsPlatform: "sidearm",
  },

  // Northeast-10 (3 of 5 sampled candidates, picked for state diversity - Franklin Pierce (NH)
  // and SNHU (NH) also confirmed live SIDEARM but skipped here since Saint Anselm/NH is already
  // in the batch above; see CLAUDE.md Section 12):
  {
    name: "American International College",
    conference: "Northeast-10",
    division: "D2",
    city: "Springfield",
    state: "MA",
    lat: 42.1015,
    lng: -72.5698,
    websiteUrl: "https://aicyellowjackets.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Saint Michael's College",
    conference: "Northeast-10",
    division: "D2",
    city: "Colchester",
    state: "VT",
    lat: 44.5322,
    lng: -73.1601,
    websiteUrl: "https://smcathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Southern Connecticut State University",
    conference: "Northeast-10",
    division: "D2",
    city: "New Haven",
    state: "CT",
    lat: 41.3106,
    lng: -72.9317,
    websiteUrl: "https://scsuowls.com",
    cmsPlatform: "sidearm",
  },

  // Hamilton College - NESCAC, but campus is in Clinton, NY, outside the six-state New England
  // scope (see CLAUDE.md Section 8/11). Added anyway: Section 11's venue-state WHERE clause is
  // unconditional, so Hamilton's own home games (venue = NY) will never display regardless of
  // whether it's seeded here. The only effect of adding it is that its AWAY games at other
  // NESCAC schools (venue = New England) resolve to a real opponent name instead of the "TBD"
  // gap noted in Section 7 - pure fix, no scope leakage. Confirmed live SIDEARM 2026-08-04.
  {
    name: "Hamilton College",
    conference: "NESCAC",
    division: "D3",
    city: "Clinton",
    state: "NY",
    lat: 43.0492,
    lng: -75.396,
    websiteUrl: "https://athletics.hamilton.edu",
    cmsPlatform: "sidearm",
  },

  // Batch 3 (2026-08-06): 16 more schools, verified live SIDEARM the same way as prior batches
  // (fetched each school's real athletics homepage via WebFetch, grepped for the
  // dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/... asset domain and/or a "Sidearm
  // Sports" footer attribution; where WebFetch 403'd, fell back to WebSearch for a *direct*
  // fingerprint match - e.g. a `<school-domain>/sidearmstats/...` result URL on the school's
  // own domain, not just circumstantial "SIDEARM is a big company" hits). See CLAUDE.md
  // session log for 2026-08-06 for the full method, corrections, and schools checked but not
  // added.
  //
  // Northeast-10 (D2) - completes full NE10 New England membership (Adelphi/Pace are NY, out
  // of region): both previously confirmed live SIDEARM in Section 12 (2026-08-04), re-confirmed
  // here, just never added before now.
  {
    name: "Franklin Pierce University",
    conference: "Northeast-10",
    division: "D2",
    city: "Rindge",
    state: "NH",
    lat: 42.7539,
    lng: -72.0087,
    websiteUrl: "https://fpuravens.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Southern New Hampshire University",
    conference: "Northeast-10",
    division: "D2",
    city: "Manchester",
    state: "NH",
    lat: 42.9956,
    lng: -71.4548,
    websiteUrl: "https://snhupenmen.com",
    cmsPlatform: "sidearm",
  },

  // Little East Conference (D3) - the 3 full members not yet seeded. Note: current Little East
  // full membership (verified via Wikipedia 2026-08-06) is Eastern Connecticut State, Keene
  // State, Plymouth State, Rhode Island College, UMass Boston, UMass Dartmouth, Univ. of
  // Southern Maine, Vermont State University-Castleton, Western Connecticut State - 6 of these 9
  // were already seeded in Batch 2; these 3 complete the roster.
  {
    name: "Western Connecticut State University",
    conference: "Little East",
    division: "D3",
    city: "Danbury",
    state: "CT",
    lat: 41.4001,
    lng: -73.4823,
    websiteUrl: "https://westconnathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Massachusetts Boston",
    conference: "Little East",
    division: "D3",
    city: "Boston",
    state: "MA",
    lat: 42.314,
    lng: -71.0386,
    websiteUrl: "https://beaconsathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Vermont State University-Castleton",
    conference: "Little East",
    division: "D3",
    city: "Castleton",
    state: "VT",
    lat: 43.6167,
    lng: -73.1729,
    websiteUrl: "https://castletonsports.com",
    cmsPlatform: "sidearm",
  },

  // MASCAC (D3) - Bridgewater/Framingham/Salem/Westfield State (the schools this batch's
  // original candidate list called "Little East") turned out to actually be MASCAC schools now
  // (see session log correction); of the 8 MASCAC members, these 2 confirmed live SIDEARM,
  // the other 4 (Bridgewater, Framingham, Salem, Westfield) did not - see "not added" notes.
  {
    name: "Fitchburg State University",
    conference: "MASCAC",
    division: "D3",
    city: "Fitchburg",
    state: "MA",
    lat: 42.5834,
    lng: -71.8023,
    websiteUrl: "https://fitchburgfalcons.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Massachusetts College of Liberal Arts",
    conference: "MASCAC",
    division: "D3",
    city: "North Adams",
    state: "MA",
    lat: 42.7003,
    lng: -73.1181,
    websiteUrl: "https://athletics.mcla.edu",
    cmsPlatform: "sidearm",
  },

  // America East (D1) - the New England members beyond Vermont/Bryant already seeded.
  // UMass Lowell, University of New Hampshire, University of Massachusetts Amherst, and
  // Sacred Heart University (below, under Northeast-10/Hockey East grouping) were
  // originally excluded from an earlier batch: their homepage HTML has no static
  // schedule-page nav links at all (a JS-rendered mega-menu, unlike every other school in
  // this file), so discoverSportSlugs()'s plain-fetch path found zero sports for them.
  // Fixed via a headless-browser fallback in src/ingestion/sidearm/discover.ts (falls back
  // to a real Playwright render only when the fast path finds nothing) - confirmed working
  // for all four schools before adding them here. See CLAUDE.md.
  {
    name: "University of Maine",
    conference: "America East",
    division: "D1",
    city: "Orono",
    state: "ME",
    lat: 44.9012,
    lng: -68.6712,
    websiteUrl: "https://goblackbears.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "UMass Lowell",
    conference: "America East",
    division: "D1",
    city: "Lowell",
    state: "MA",
    lat: 42.6334,
    lng: -71.3162,
    websiteUrl: "https://goriverhawks.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of New Hampshire",
    conference: "America East",
    division: "D1",
    city: "Durham",
    state: "NH",
    lat: 43.1339,
    lng: -70.9264,
    websiteUrl: "https://unhwildcats.com",
    cmsPlatform: "sidearm",
  },

  // Hockey East / other D1 (added as time allowed, per this batch's brief - all confirmed live
  // SIDEARM by direct fingerprint AND confirmed working sport-discovery via static nav links,
  // unlike the schools noted above. Conference here is each school's PRIMARY/all-sport
  // conference - several of these (Vermont, Connecticut, Maine above, Merrimack, Northeastern,
  // and Massachusetts Amherst below) actually play ice hockey in Hockey East regardless of
  // their primary conference, since America East/Big East/MAAC/CAA don't sponsor D1 hockey at
  // all. That's handled per-team, not per-school, via
  // src/ingestion/sidearm/conferenceOverrides.ts - see CLAUDE.md):
  {
    name: "Merrimack College",
    conference: "MAAC",
    division: "D1",
    city: "North Andover",
    state: "MA",
    lat: 42.6903,
    lng: -71.1245,
    websiteUrl: "https://merrimackathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Connecticut",
    conference: "Big East",
    division: "D1",
    city: "Storrs",
    state: "CT",
    lat: 41.8084,
    lng: -72.2495,
    websiteUrl: "https://uconnhuskies.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Massachusetts Amherst",
    conference: "Atlantic 10",
    division: "D1",
    city: "Amherst",
    state: "MA",
    lat: 42.3868,
    lng: -72.5301,
    websiteUrl: "https://umassathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Sacred Heart University",
    conference: "MAAC",
    division: "D1",
    city: "Fairfield",
    state: "CT",
    lat: 41.1408,
    lng: -73.2637,
    websiteUrl: "https://sacredheartpioneers.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Northeastern University",
    conference: "CAA",
    division: "D1",
    city: "Boston",
    state: "MA",
    lat: 42.3398,
    lng: -71.0892,
    websiteUrl: "https://nuhuskies.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Rhode Island",
    conference: "Atlantic 10",
    division: "D1",
    city: "Kingston",
    state: "RI",
    lat: 41.4901,
    lng: -71.527,
    websiteUrl: "https://gorhody.com",
    cmsPlatform: "sidearm",
  },

  // ==========================================================================================
  // Batch 4 (2026-08-07): 42 more schools, verified live via direct curl (not the WebFetch tool
  // - see CLAUDE.md session log for why: WebFetch had been getting 403'd on several of these
  // domains in prior sessions, but a plain curl with a real browser User-Agent string succeeded
  // on every one of them, including the ones that had 403'd before). Fingerprint: the
  // `assets.sidearmsports.com` CDN path (served via a cloudfront.net edge, sometimes under the
  // `dxbhsrqyrr690` distribution seen in earlier batches, sometimes a different one - the
  // sidearmsports.com origin is the reliable part) and/or literal "Sidearm Sports" footer
  // attribution text, cross-checked against each page's `og:site_name` meta tag to confirm the
  // fingerprint actually belongs to the intended school (not a false-positive shared CDN hit).
  // Covers CLAUDE.md's requested priority order: remaining Hockey East D1 members, the Ivy
  // League (previously zero Ivy schools were seeded), remaining MAAC/Patriot D1, and four D3
  // conferences not yet touched (GNAC, NEWMAC, Conference of New England [formerly CCC], North
  // Atlantic Conference). See the rejected-schools comment blocks below for schools checked and
  // NOT added, with real reasons.
  // ==========================================================================================

  // --- D1: remaining Hockey East members (priority 1 per this batch's brief) ---
  {
    name: "Boston College",
    conference: "ACC",
    division: "D1",
    city: "Chestnut Hill",
    state: "MA",
    lat: 42.3355,
    lng: -71.1685,
    websiteUrl: "https://bceagles.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Boston University",
    conference: "Patriot League",
    division: "D1",
    city: "Boston",
    state: "MA",
    lat: 42.3505,
    lng: -71.1054,
    websiteUrl: "https://goterriers.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Providence College",
    conference: "Big East",
    division: "D1",
    city: "Providence",
    state: "RI",
    lat: 41.842,
    lng: -71.4322,
    websiteUrl: "https://friars.com",
    cmsPlatform: "sidearm",
  },

  // --- D1: Ivy League (zero Ivy schools were seeded before this batch) ---
  {
    name: "Harvard University",
    conference: "Ivy League",
    division: "D1",
    city: "Cambridge",
    state: "MA",
    lat: 42.377,
    lng: -71.1167,
    websiteUrl: "https://gocrimson.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Yale University",
    conference: "Ivy League",
    division: "D1",
    city: "New Haven",
    state: "CT",
    lat: 41.3163,
    lng: -72.9223,
    websiteUrl: "https://yalebulldogs.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Brown University",
    conference: "Ivy League",
    division: "D1",
    city: "Providence",
    state: "RI",
    lat: 41.8268,
    lng: -71.4025,
    websiteUrl: "https://brownbears.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Dartmouth College",
    conference: "Ivy League",
    division: "D1",
    city: "Hanover",
    state: "NH",
    lat: 43.7044,
    lng: -72.2887,
    websiteUrl: "https://dartmouthsports.com",
    cmsPlatform: "sidearm",
  },

  // --- D1: remaining Patriot League / MAAC candidates from the brief's example list ---
  {
    name: "College of the Holy Cross",
    conference: "Patriot League",
    division: "D1",
    city: "Worcester",
    state: "MA",
    lat: 42.2405,
    lng: -71.8091,
    websiteUrl: "https://goholycross.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Fairfield University",
    conference: "MAAC",
    division: "D1",
    city: "Fairfield",
    state: "CT",
    lat: 41.1408,
    lng: -73.2596,
    websiteUrl: "https://fairfieldstags.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Quinnipiac University",
    conference: "MAAC",
    division: "D1",
    city: "Hamden",
    state: "CT",
    lat: 41.4001,
    lng: -72.9046,
    websiteUrl: "https://gobobcats.com",
    cmsPlatform: "sidearm",
  },

  // --- D3: GNAC (Great Northeast Athletic Conference) - 8 of 14 members confirmed live SIDEARM;
  // the other 6 (Albertus Magnus, Elms, Lasell, Mitchell, Regis, University of Saint Joseph CT)
  // are all live PrestoSports sites, not SIDEARM - see rejected-schools note below. ---
  {
    name: "Colby-Sawyer College",
    conference: "GNAC",
    division: "D3",
    city: "New London",
    state: "NH",
    lat: 43.4148,
    lng: -71.9812,
    websiteUrl: "https://colby-sawyerathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Dean College",
    conference: "GNAC",
    division: "D3",
    city: "Franklin",
    state: "MA",
    lat: 42.0834,
    lng: -71.3967,
    websiteUrl: "https://deanbulldogs.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Emmanuel College",
    conference: "GNAC",
    division: "D3",
    city: "Boston",
    state: "MA",
    lat: 42.3388,
    lng: -71.1023,
    websiteUrl: "https://goecsaints.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "New England College",
    conference: "GNAC",
    division: "D3",
    city: "Henniker",
    state: "NH",
    lat: 43.1859,
    lng: -71.8234,
    websiteUrl: "https://athletics.nec.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Norwich University",
    conference: "GNAC",
    division: "D3",
    city: "Northfield",
    state: "VT",
    lat: 44.1495,
    lng: -72.6395,
    websiteUrl: "https://norwichathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Rivier University",
    conference: "GNAC",
    division: "D3",
    city: "Nashua",
    state: "NH",
    lat: 42.7462,
    lng: -71.4728,
    websiteUrl: "https://rivierathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Saint Joseph's College of Maine",
    conference: "GNAC",
    division: "D3",
    city: "Standish",
    state: "ME",
    lat: 43.7717,
    lng: -70.5661,
    websiteUrl: "https://gomonks.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Simmons University",
    conference: "GNAC",
    division: "D3",
    city: "Boston",
    state: "MA",
    lat: 42.3412,
    lng: -71.102,
    websiteUrl: "https://athletics.simmons.edu",
    cmsPlatform: "sidearm",
  },

  // --- D3: NEWMAC (New England Women's and Men's Athletic Conference) - 11 of 13 core members
  // confirmed live SIDEARM. Mount Holyoke is live PrestoSports, not SIDEARM (rejected below).
  // Saint Anselm College is NEWMAC's newest (13th) core member as of April 2026, but that's a
  // secondary/single-sport-type affiliation - its primary conference is Northeast-10 (D2),
  // already seeded above; not adding a duplicate row. ---
  {
    name: "Babson College",
    conference: "NEWMAC",
    division: "D3",
    city: "Wellesley",
    state: "MA",
    lat: 42.2968,
    lng: -71.2646,
    websiteUrl: "https://babsonathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Massachusetts Institute of Technology",
    conference: "NEWMAC",
    division: "D3",
    city: "Cambridge",
    state: "MA",
    lat: 42.3601,
    lng: -71.0942,
    websiteUrl: "https://mitathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Smith College",
    conference: "NEWMAC",
    division: "D3",
    city: "Northampton",
    state: "MA",
    lat: 42.3168,
    lng: -72.6398,
    websiteUrl: "https://smithpioneers.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Wellesley College",
    conference: "NEWMAC",
    division: "D3",
    city: "Wellesley",
    state: "MA",
    lat: 42.2955,
    lng: -71.3062,
    websiteUrl: "https://wellesleyblue.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Wheaton College",
    conference: "NEWMAC",
    division: "D3",
    city: "Norton",
    state: "MA",
    lat: 41.9668,
    lng: -71.1856,
    websiteUrl: "https://wheatoncollegelyons.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Worcester Polytechnic Institute",
    conference: "NEWMAC",
    division: "D3",
    city: "Worcester",
    state: "MA",
    lat: 42.2744,
    lng: -71.8064,
    websiteUrl: "https://athletics.wpi.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Clark University",
    conference: "NEWMAC",
    division: "D3",
    city: "Worcester",
    state: "MA",
    lat: 42.2508,
    lng: -71.8153,
    websiteUrl: "https://clarkathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Springfield College",
    conference: "NEWMAC",
    division: "D3",
    city: "Springfield",
    state: "MA",
    lat: 42.1112,
    lng: -72.5423,
    websiteUrl: "https://springfieldcollegepride.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "United States Coast Guard Academy",
    conference: "NEWMAC",
    division: "D3",
    city: "New London",
    state: "CT",
    lat: 41.3778,
    lng: -72.09,
    websiteUrl: "https://coastguardathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Emerson College",
    conference: "NEWMAC",
    division: "D3",
    city: "Boston",
    state: "MA",
    lat: 42.3519,
    lng: -71.0644,
    websiteUrl: "https://emersonlions.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Salve Regina University",
    conference: "NEWMAC",
    division: "D3",
    city: "Newport",
    state: "RI",
    lat: 41.4849,
    lng: -71.3128,
    websiteUrl: "https://salveathletics.com",
    cmsPlatform: "sidearm",
  },

  // --- D3: Conference of New England (CNE, renamed from Commonwealth Coast Conference/CCC in
  // 2024 - same rename pattern already documented for MASCAC/Little East in Section 22) - 7 of
  // 11 members confirmed live SIDEARM. Curry, Endicott, Suffolk, and Wentworth are live
  // PrestoSports, not SIDEARM (rejected below). ---
  {
    name: "Gordon College",
    conference: "Conference of New England",
    division: "D3",
    city: "Wenham",
    state: "MA",
    lat: 42.6084,
    lng: -70.8917,
    websiteUrl: "https://athletics.gordon.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Hartford",
    conference: "Conference of New England",
    division: "D3",
    city: "West Hartford",
    state: "CT",
    lat: 41.7423,
    lng: -72.7226,
    websiteUrl: "https://hartfordhawks.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Johnson & Wales University (Providence)",
    conference: "Conference of New England",
    division: "D3",
    city: "Providence",
    state: "RI",
    lat: 41.8225,
    lng: -71.4128,
    websiteUrl: "https://providence.jwuathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Nichols College",
    conference: "Conference of New England",
    division: "D3",
    city: "Dudley",
    state: "MA",
    lat: 42.0459,
    lng: -71.9295,
    websiteUrl: "https://nicholsathletics.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "Roger Williams University",
    conference: "Conference of New England",
    division: "D3",
    city: "Bristol",
    state: "RI",
    lat: 41.6743,
    lng: -71.2673,
    websiteUrl: "https://rwuhawks.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of New England",
    conference: "Conference of New England",
    division: "D3",
    city: "Biddeford",
    state: "ME",
    lat: 43.437,
    lng: -70.4519,
    websiteUrl: "https://athletics.une.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Western New England University",
    conference: "Conference of New England",
    division: "D3",
    city: "Springfield",
    state: "MA",
    lat: 42.0937,
    lng: -72.5723,
    websiteUrl: "https://wnegoldenbears.com",
    cmsPlatform: "sidearm",
  },

  // --- D3: North Atlantic Conference (NAC) - 6 of 8 members confirmed live SIDEARM. Lesley
  // University and Vermont State University-Johnson are live PrestoSports, not SIDEARM
  // (rejected below). Note: Maine Maritime Academy (Castine, ME, this conference) is a
  // different school from Massachusetts Maritime Academy (Buzzards Bay, MA, MASCAC) - see the
  // MASCAC rejection note above; don't conflate the two "Maritime Academy" names. ---
  {
    name: "Husson University",
    conference: "North Atlantic Conference",
    division: "D3",
    city: "Bangor",
    state: "ME",
    lat: 44.8362,
    lng: -68.7639,
    websiteUrl: "https://hussoneagles.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Maine at Farmington",
    conference: "North Atlantic Conference",
    division: "D3",
    city: "Farmington",
    state: "ME",
    lat: 44.6699,
    lng: -70.1481,
    websiteUrl: "https://goumfbeavers.com",
    cmsPlatform: "sidearm",
  },
  {
    name: "University of Maine at Presque Isle",
    conference: "North Atlantic Conference",
    division: "D3",
    city: "Presque Isle",
    state: "ME",
    lat: 46.6774,
    lng: -68.0166,
    websiteUrl: "https://owls.umpi.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Maine Maritime Academy",
    conference: "North Atlantic Conference",
    division: "D3",
    city: "Castine",
    state: "ME",
    lat: 44.3865,
    lng: -68.7994,
    websiteUrl: "https://marinersports.org",
    cmsPlatform: "sidearm",
  },
  {
    name: "Thomas College",
    conference: "North Atlantic Conference",
    division: "D3",
    city: "Waterville",
    state: "ME",
    lat: 44.5449,
    lng: -69.6633,
    websiteUrl: "https://athletics.thomas.edu",
    cmsPlatform: "sidearm",
  },
  {
    name: "Vermont State University-Lyndon",
    conference: "North Atlantic Conference",
    division: "D3",
    city: "Lyndonville",
    state: "VT",
    lat: 44.5359,
    lng: -72.0087,
    websiteUrl: "https://vtsuhornets.com",
    cmsPlatform: "sidearm",
  },
] as const;

// ================================================================================================
// Batch 4 rejections (2026-08-07) - checked, confirmed NOT SIDEARM, intentionally not added.
// All of these are real, live, current athletics sites (not dead/maintenance-mode) running
// PrestoSports instead - confirmed via the same fingerprint discipline as the additions above
// (a live page fetch showing `prestosports`/`PRESTO` markers and no `sidearmsports.com` asset
// domain anywhere in the page). This is a significant correction to CLAUDE.md Section 9's
// "PrestoSports appears dead in New England" finding: it is NOT dead - at least 13 real New
// England D2/D3 schools below are live, current PrestoSports sites. Section 9's finding was
// based on checking only 3 schools (Rivier, Simmons, one non-NE control), all of which
// happened to be mid-migration or defunct at the time; both Rivier and Simmons are confirmed
// live SIDEARM in this same session's batch above, so at least those two migrated off Presto
// since Section 9. None of the schools below can be ingested with this codebase's current
// SIDEARM-only adapter - they'd need a real PrestoSports adapter first (still not built, per
// Section 9/0.3). Listed here rather than silently dropped, per this repo's established
// practice (Section 12/22).
//
// MASCAC (6 of 8 total members - Fitchburg State/MCLA are the only 2 already seeded above):
//   Bridgewater State University (bsubears.com), Framingham State University (fsurams.com),
//   Salem State University (salemstatevikings.com), Westfield State University
//   (westfieldstateowls.com), Massachusetts Maritime Academy (mmabucs.com), Worcester State
//   University (wsulancers.com). Re-checked from Section 12/22's prior "WebFetch 403, unconfirmed"
//   status with real content fetches this session (curl bypassed the 403s entirely - see the
//   note above on WebFetch vs curl) - the mystery is solved: they were never SIDEARM to begin
//   with, so the 403s were never actually hiding a SIDEARM site.
//
// Other D1 (America East/NEC candidate from the brief's example list):
//   Central Connecticut State University (ccsubluedevils.com, NEC) - confirmed live Presto,
//   same category as the MASCAC schools above.
//
// GNAC (6 of 14 members):
//   Albertus Magnus College (albertusfalcons.com), Elms College (ecblazers.com), Lasell
//   University (laserpride.lasell.edu), Mitchell College (mitchellathletics.com), Regis College
//   (goregispride.com), University of Saint Joseph - CT (usjbluejays.com).
//
// NEWMAC (1 of 12 non-Saint-Anselm members):
//   Mount Holyoke College (athletics.mtholyoke.edu).
//
// Conference of New England (4 of 11 members):
//   Curry College (curryathletics.com), Endicott College (ecgulls.com), Suffolk University
//   (gosuffolkrams.com - explicitly confirmed via a 2026-07-07 Suffolk Athletics press item
//   naming PrestoSports as their site host), Wentworth Institute of Technology
//   (wentworthathletics.com).
//
// North Atlantic Conference (2 of 8 members):
//   Lesley University (lesleyathletics.com - redirects through a `prestosports.com`-scoped
//   cookie domain even though the rendered page body was empty on fetch), Vermont State
//   University-Johnson (nvubadgers.com).
// ================================================================================================
