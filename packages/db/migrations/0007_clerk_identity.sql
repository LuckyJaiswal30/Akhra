ALTER TABLE "email_verifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_resets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "email_verifications" CASCADE;--> statement-breakpoint
DROP TABLE "password_resets" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
-- Clerk verifies an address before Akhra links it, so unconfirmed sign-ups carry nothing worth keeping pending.
UPDATE "users" SET "status" = 'active' WHERE "status" = 'pending_verification';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
DROP TYPE "public"."user_status";--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."user_status";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE "public"."user_status" USING "status"::"public"."user_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "clerk_invitation_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_unique" ON "users" USING btree ("clerk_user_id");