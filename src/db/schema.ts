import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  doublePrecision,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  conference: text("conference").notNull(),
  division: text("division").notNull(), // "D1" | "D2" | "D3"
  city: text("city").notNull(),
  state: text("state").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  websiteUrl: text("website_url").notNull(),
  cmsPlatform: text("cms_platform").notNull(), // "sidearm" | "presto" | "other"
});

export const sports = pgTable("sports", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  typicalSeason: text("typical_season").notNull(), // "fall" | "winter" | "spring"
});

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    schoolId: uuid("school_id").references(() => schools.id),
    city: text("city"),
    state: text("state"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    address: text("address"),
  },
  // Every read query filters on this unconditionally (New England scope, CLAUDE.md
  // Section 1/2/3) plus optionally by the State dropdown - a full table scan on every
  // page load otherwise.
  (table) => [index("venues_state_idx").on(table.state)]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    sport: text("sport").notNull(),
    gender: text("gender").notNull(), // "mens" | "womens" | "coed"
    // Overrides the school's own conference/division for this specific sport - real,
    // common case in New England: several schools field a D1 hockey program in a
    // dedicated hockey conference (Hockey East, Atlantic Hockey America) while every
    // other sport plays in a different, often lower-division, conference (e.g. Bentley
    // and American International College are D2/Northeast-10 overall but D1/Atlantic
    // Hockey America for men's ice hockey specifically). Null means "same as the
    // school" - most teams never need this set.
    conference: text("conference"),
    division: text("division"),
  },
  (table) => [
    uniqueIndex("teams_school_sport_gender_idx").on(
      table.schoolId,
      table.sport,
      table.gender
    ),
  ]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // "game" | "special_event"
    sport: text("sport").notNull(),
    gender: text("gender").notNull(), // "mens" | "womens" | "coed"
    season: text("season").notNull(), // "fall" | "winter" | "spring"
    division: text("division"), // null/spans multiple for special_event
    homeTeamId: uuid("home_team_id").references(() => teams.id),
    awayTeamId: uuid("away_team_id").references(() => teams.id),
    participatingSchoolIds: uuid("participating_school_ids").array(),
    eventName: text("event_name"),
    // The opponent's name as text, straight from the source feed - set only when the
    // opponent doesn't resolve to a seeded New England school (homeTeamId/awayTeamId stays
    // null on that side in that case). Without this, an out-of-region opponent's identity
    // was silently discarded and the UI fell back to a literal "TBD" - confirmed real via a
    // founder report (UConn men's/women's soccer showing "TBD at University of Connecticut"
    // when the actual opponents, Syracuse/Rutgers, were present in the raw feed all along).
    opponentNameRaw: text("opponent_name_raw"),
    venueId: uuid("venue_id").references(() => venues.id),
    startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
    endDatetime: timestamp("end_datetime", { withTimezone: true }),
    status: text("status").notNull().default("scheduled"), // scheduled|postponed|cancelled|final
    // A game *type* (still "scheduled" like any other game), not a status - a postponed
    // exhibition game needs to represent both facts at once, which overloading `status`
    // couldn't do. Confirmed real, two distinct SIDEARM summary formats (UConn men's vs
    // women's basketball feeds): "vs Syracuse - Hall of Fame Exhibition" (suffix) and
    // "vs Syracuse (exh.)" (parenthetical) - previously silently dropped/left baked into the
    // opponent name rather than surfaced as a real, filterable fact about the game.
    isExhibition: boolean("is_exhibition").notNull().default(false),
    ticketUrl: text("ticket_url"),
    isFree: boolean("is_free"),
    sourceUrl: text("source_url"), // home school's own game-detail page - always-available
    // fallback deep link when there's no direct ticket URL (e.g. free D3 games)
    tvNetwork: text("tv_network"), // e.g. "ESPN+" - label only, shown alongside streamingVideoUrl
    streamingVideoUrl: text("streaming_video_url"),
    radioNetwork: text("radio_network"), // e.g. "WVMT" - label only, shown alongside streamingAudioUrl
    streamingAudioUrl: text("streaming_audio_url"),
    source: text("source").notNull(), // "sidearm" | "presto" | "conference" | "manual"
    sourceEventId: text("source_event_id").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("events_dedupe_key_idx").on(table.dedupeKey),
    // The homepage's every request filters/sorts on startDatetime (date-range WHERE +
    // ORDER BY, every query in queries.ts) and optionally on sport/division - none of
    // these had an index, meaning every page load was a full table scan against ~32K
    // rows (growing) and climbing. homeTeamId/awayTeamId/venueId are FK join columns
    // Postgres doesn't index automatically - every query's LEFT JOIN was doing the same.
    index("events_start_datetime_idx").on(table.startDatetime),
    index("events_sport_idx").on(table.sport),
    index("events_division_idx").on(table.division),
    index("events_home_team_id_idx").on(table.homeTeamId),
    index("events_away_team_id_idx").on(table.awayTeamId),
    index("events_venue_id_idx").on(table.venueId),
  ]
);

// Real accounts (Better Auth - src/auth/auth.ts), replacing the old stateless/anonymous `fans`
// table (CLAUDE.md Section 20's original fan-graph MVP). There were 0 real fan rows at the time
// of this change, so this was a clean cut, not a data migration.
//
// Schema shape for id/timestamp columns on this table and sessions/accounts/verifications below
// deliberately does NOT follow this file's usual uuid()/withTimezone conventions - confirmed via
// Better Auth's own schema generator (`npx @better-auth/cli generate`) against the actual
// installed version that it emits plain text ids (no DB-level default; `advanced.database.
// generateId: false` does not add one, so forcing uuid()/defaultRandom() here would leave
// inserts with no id) and plain timestamp (no tz) columns, which is what the library's own
// internal expiry/session comparisons are written against. These four tables are treated as
// library-owned schema, matched to the generator's real output rather than this project's own
// house style.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  // Better Auth's phoneNumber plugin - proves the user owns this number for LOGIN purposes
  // only. Deliberately a separate fact from smsAlertsPhone/smsConsentedAt below: signing in via
  // phone OTP is not TCPA consent to receive SMS game-alert marketing, the same distinction the
  // old fans table drew between confirmedAt (email ownership) and unsubscribedAt (marketing
  // consent).
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),

  // additionalFields (src/auth/auth.ts's `user.additionalFields`), carried over 1:1 from the
  // old fans table's equivalent columns - kept nullable, matching Better Auth's own generated
  // shape for these, rather than forcing NOT NULL against a library that partially updates this
  // row outside this app's own control.
  manageToken: text("manage_token").unique(), // powers /manage + /api/unsubscribe, no login
  // required; always populated on user creation via databaseHooks.user.create.before.
  emailAlertsUnsubscribedAt: timestamp("email_alerts_unsubscribed_at"),
  smsAlertsPhone: text("sms_alerts_phone"), // E.164, separate from the login phoneNumber above
  smsConsentedAt: timestamp("sms_consented_at"),
  smsUnsubscribedAt: timestamp("sms_unsubscribed_at"),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(), // provider's own user id ("credential" for password)
    providerId: text("provider_id").notNull(), // "credential" | "google"
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"), // hashed - only set for providerId="credential"
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)]
);

// Stores email-OTP and phone-OTP codes (both plugins share this one table, keyed by
// `identifier`) plus email-verification/password-reset tokens - all of Better Auth's short-lived
// verification records, not just one plugin's.
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

export const fanFollows = pgTable(
  "fan_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fan_follows_user_school_idx").on(table.userId, table.schoolId)]
);

export const teamFollows = pgTable(
  "team_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // cascade on both FKs (not just userId) - this project has repeatedly bulk-deleted teams
    // rows during cleanup passes (Sections 21, 32/33); without cascade, the next such cleanup
    // hits an FK violation the moment it touches a followed team.
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("team_follows_user_team_idx").on(table.userId, table.teamId)]
);

// No FK - "league" is plain text everywhere in this app (see EventFilters.league,
// getFilterOptions().leagues - there is no leagues table, just schools.conference/
// teams.conference reconciled at query time). Values must only ever come from already-resolved
// query output (getFilterOptions().leagues, or an event's own coalesced league text) - never
// free text - so a stored value is guaranteed to match something real.
export const leagueFollows = pgTable(
  "league_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    league: text("league").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("league_follows_user_league_idx").on(table.userId, table.league)]
);

// No FK either, and deliberately not venues.id - see src/db/specialVenues.ts's comment for why
// (the same real venue is fragmented across multiple venues rows, one per hosting school's own
// feed spelling). Stores the CANONICAL name from SPECIAL_VENUES, resolved at write time from
// whichever underlying venue row the user was actually looking at - never a raw venue id.
export const specialVenueFollows = pgTable(
  "special_venue_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    venueName: text("venue_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("special_venue_follows_user_venue_idx").on(table.userId, table.venueName)]
);

export const gameFollows = pgTable(
  "game_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // cascade - same reasoning as team_follows.teamId; events get bulk-deleted routinely
    // (Sections 34/35/44).
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("game_follows_user_event_idx").on(table.userId, table.eventId)]
);

// Append-only consent ledger - never update/delete existing rows. schoolIds/subjectIds snapshot
// what was selected/affected at the moment of each action so a row is self-contained evidence
// even if the follow tables change later.
export const consentEvents = pgTable("consent_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // "registered" | "onboarded" | "unsubscribed" | "sms_registered" | "sms_unsubscribed" |
  // "followed_{school|team|league|venue|game}" | "unfollowed_{school|team|league|venue|game}"
  action: text("action").notNull(),
  schoolIds: uuid("school_ids").array(), // used by the 5 original actions above, unchanged
  // Used by the new followed_*/unfollowed_* actions - schoolIds can't hold league/venue name
  // strings (it's uuid[]), so these carry the equivalent for every subject type including
  // schools going forward, via logFollowConsentEvent (src/fans/queries.ts).
  subjectType: text("subject_type"), // "school" | "team" | "league" | "venue" | "game"
  subjectIds: text("subject_ids").array(), // uuids or league/venue name strings, per subjectType
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per (school, sport) ingestion history - the thing that lets a human glance at what's
// actually broken instead of re-reading raw ingest.ts console output after every run.
// Ingestion is human-triggered, not cron'd (CLAUDE.md Section 0.3), so this doesn't detect
// breakage in real time - it's what makes accumulated breakage visible the next time
// someone does run it, rather than invisible indefinitely. See scripts/feed-health-report.ts.
export const feedHealth = pgTable(
  "feed_health",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sportSlug: text("sport_slug").notNull(),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }).notNull(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    // Resets to 0 on any success; increments on each consecutive failed attempt. A single
    // transient blip (this session saw plenty - 504s, dropped connections) isn't worth
    // surfacing; a feed still broken after several real runs is.
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  },
  (table) => [uniqueIndex("feed_health_school_sport_idx").on(table.schoolId, table.sportSlug)]
);

// Dedup guard so scripts/send-alerts.ts is safe to re-run without double-sending a game alert.
// channel is part of the identity, not just metadata - email and SMS are independent
// deliveries to the same fan for the same event, so one channel being sent must not block the
// other (a plain (fanId, eventId) key would have silently done exactly that once SMS shared
// this table with email).
export const fanAlertLog = pgTable(
  "fan_alert_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"), // "email" | "sms"
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fan_alert_log_user_event_channel_idx").on(table.userId, table.eventId, table.channel)]
);
