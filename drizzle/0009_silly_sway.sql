CREATE INDEX "events_start_datetime_idx" ON "events" USING btree ("start_datetime");--> statement-breakpoint
CREATE INDEX "events_sport_idx" ON "events" USING btree ("sport");--> statement-breakpoint
CREATE INDEX "events_division_idx" ON "events" USING btree ("division");--> statement-breakpoint
CREATE INDEX "events_home_team_id_idx" ON "events" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "events_away_team_id_idx" ON "events" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "events_venue_id_idx" ON "events" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "venues_state_idx" ON "venues" USING btree ("state");