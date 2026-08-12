DROP INDEX "fan_alert_log_fan_event_idx";--> statement-breakpoint
ALTER TABLE "fan_alert_log" ADD COLUMN "channel" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "fans" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "fans" ADD COLUMN "sms_consented_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fans" ADD COLUMN "sms_unsubscribed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "fan_alert_log_fan_event_channel_idx" ON "fan_alert_log" USING btree ("fan_id","event_id","channel");