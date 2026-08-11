CREATE TABLE "feed_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"sport_slug" text NOT NULL,
	"last_attempted_at" timestamp with time zone NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_health" ADD CONSTRAINT "feed_health_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_health_school_sport_idx" ON "feed_health" USING btree ("school_id","sport_slug");