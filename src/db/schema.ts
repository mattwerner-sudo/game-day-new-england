import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  doublePrecision,
  uniqueIndex,
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

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  city: text("city"),
  state: text("state"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  address: text("address"),
});

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
    venueId: uuid("venue_id").references(() => venues.id),
    startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
    endDatetime: timestamp("end_datetime", { withTimezone: true }),
    status: text("status").notNull().default("scheduled"), // scheduled|postponed|cancelled|final
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
  (table) => [uniqueIndex("events_dedupe_key_idx").on(table.dedupeKey)]
);

// Fan-graph MVP (CLAUDE.md Section 0.8): stateless double opt-in, school-level follows only.
export const fans = pgTable("fans", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(), // always stored trim().toLowerCase()
  manageToken: text("manage_token").notNull().unique(), // powers both /confirm and /manage links
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
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
  action: text("action").notNull(), // "registered" | "confirmed" | "unsubscribed"
  schoolIds: uuid("school_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Dedup guard so scripts/send-alerts.ts is safe to re-run without double-emailing a game.
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
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fan_alert_log_fan_event_idx").on(table.fanId, table.eventId)]
);
