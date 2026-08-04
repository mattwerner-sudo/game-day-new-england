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
  name: text("name").notNull(),
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
    source: text("source").notNull(), // "sidearm" | "presto" | "conference" | "manual"
    sourceEventId: text("source_event_id").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("events_dedupe_key_idx").on(table.dedupeKey)]
);
