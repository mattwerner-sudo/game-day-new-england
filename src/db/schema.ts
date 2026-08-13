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

// Fan-graph MVP (CLAUDE.md Section 0.8): stateless double opt-in, school-level follows only.
export const fans = pgTable("fans", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(), // always stored trim().toLowerCase()
  manageToken: text("manage_token").notNull().unique(), // powers both /confirm and /manage links
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  // SMS is a genuinely separate consent channel from email, not an extension of it - TCPA
  // requires distinct, explicit "prior express written consent" for text messages specifically
  // (can't be bundled into the email opt-in checkbox). phone is E.164-normalized
  // (src/fans/phone.ts). smsConsentedAt is set the moment the SMS checkbox is submitted (the
  // checkbox click itself IS the required consent - unlike email, there's no separate
  // click-to-confirm round trip; the immediate confirmation text serves as the required
  // disclosure receipt, not a consent gate). smsUnsubscribedAt is set either via the manage
  // page or a real inbound "STOP" text (src/app/api/sms/inbound/route.ts) - keeping this app's
  // own state in sync with Twilio's carrier-level opt-out handling, not just relying on Twilio
  // to silently block future sends.
  phone: text("phone"),
  smsConsentedAt: timestamp("sms_consented_at", { withTimezone: true }),
  smsUnsubscribedAt: timestamp("sms_unsubscribed_at", { withTimezone: true }),
});

export const fanFollows = pgTable(
  "fan_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fan_follows_fan_school_idx").on(table.fanId, table.schoolId)]
);

// Append-only consent ledger - never update/delete existing rows. schoolIds snapshots what was
// selected/affected at the moment of each action so a row is self-contained evidence even if
// fan_follows changes later.
export const consentEvents = pgTable("consent_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  fanId: uuid("fan_id")
    .notNull()
    .references(() => fans.id, { onDelete: "cascade" }),
  // "registered" | "confirmed" | "unsubscribed" | "sms_registered" | "sms_unsubscribed"
  action: text("action").notNull(),
  schoolIds: uuid("school_ids").array(),
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
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"), // "email" | "sms"
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fan_alert_log_fan_event_channel_idx").on(table.fanId, table.eventId, table.channel)]
);
