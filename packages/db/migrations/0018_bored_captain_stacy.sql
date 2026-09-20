ALTER TABLE "problems" ADD COLUMN "content_fingerprint" text;--> statement-breakpoint
CREATE INDEX "problems_fingerprint_idx" ON "problems" USING btree ("content_fingerprint");