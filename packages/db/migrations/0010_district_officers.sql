ALTER TABLE "users" ADD COLUMN "jurisdiction_code" text;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "jurisdiction_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_jurisdiction_gov_only" CHECK ("users"."jurisdiction_code" is null or "users"."role" = 'gov_admin');