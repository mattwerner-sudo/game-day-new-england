ALTER TABLE "fans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- The 3 FK constraints referencing fans.id (consent_events, fan_alert_log, fan_follows) are
-- dropped implicitly by CASCADE below, so the explicit DROP CONSTRAINT statements drizzle-kit
-- generated for them were removed here - they failed with "constraint does not exist" since
-- CASCADE had already removed them by the time those statements ran (verified: this migration
-- rolled back cleanly on that failure, so fixing in place rather than regenerating was safe).
DROP TABLE "fans" CASCADE;--> statement-breakpoint
DROP INDEX "fan_alert_log_fan_event_channel_idx";--> statement-breakpoint
DROP INDEX "fan_follows_fan_school_idx";--> statement-breakpoint
ALTER TABLE "consent_events" DROP COLUMN "fan_id";--> statement-breakpoint
ALTER TABLE "fan_alert_log" DROP COLUMN "fan_id";--> statement-breakpoint
ALTER TABLE "fan_follows" DROP COLUMN "fan_id";