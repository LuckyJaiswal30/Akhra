CREATE TYPE "public"."resolution_track" AS ENUM('department', 'research');--> statement-breakpoint
ALTER TYPE "public"."problem_status" ADD VALUE 'assigned' BEFORE 'routed';--> statement-breakpoint
ALTER TYPE "public"."problem_status" ADD VALUE 'action_taken' BEFORE 'routed';--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "resolution_track" "resolution_track";--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "assigned_org_id" uuid;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "assigned_by_id" uuid;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "interim_update_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "interim_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "overdue_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "action_taken_note" text;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "action_taken_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "action_taken_by_id" uuid;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "reopened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "reopen_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "reporter_note" text;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_assigned_org_id_organizations_id_fk" FOREIGN KEY ("assigned_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_action_taken_by_id_users_id_fk" FOREIGN KEY ("action_taken_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problems_assigned_org_idx" ON "problems" USING btree ("assigned_org_id");--> statement-breakpoint
CREATE INDEX "problems_due_at_idx" ON "problems" USING btree ("due_at");