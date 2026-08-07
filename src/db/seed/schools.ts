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
  // UMass Lowell, University of New Hampshire, and University of Massachusetts Amherst
  // were researched and confirmed live SIDEARM but deliberately NOT added here: their
  // homepage HTML has no static /sports/<slug>/schedule nav links at all (likely a
  // JS-rendered mega-menu, unlike every other school in this file) - discoverSportSlugs()
  // would silently find zero sports for them, which would show up as a school with
  // permanently 0 games rather than a real coverage gap. Confirmed their sport pages do
  // exist at the standard URL when guessed directly (e.g. /sports/mens-ice-hockey/schedule
  // returns 200), so this is a real, fixable adapter limitation for schools with a
  // JS-driven nav, not a data problem - needs either a headless-browser-based discovery
  // fallback or manual per-school sport-slug curation before adding them. Same finding for
  // Sacred Heart University (sacredheartpioneers.com).
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

  // Hockey East / other D1 (added as time allowed, per this batch's brief - all confirmed live
  // SIDEARM by direct fingerprint AND confirmed working sport-discovery via static nav links,
  // unlike the three schools noted above. Conference here is each school's PRIMARY/all-sport
  // conference - several of these (Vermont, Connecticut, Maine above, Merrimack, Northeastern)
  // actually play ice hockey in Hockey East regardless of their primary conference, since
  // America East/Big East/MAAC/CAA don't sponsor D1 hockey at all. That's handled per-team,
  // not per-school, via src/ingestion/sidearm/conferenceOverrides.ts - see CLAUDE.md):
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
] as const;
