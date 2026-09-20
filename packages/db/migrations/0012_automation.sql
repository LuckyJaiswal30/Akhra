CREATE TABLE "analytics_snapshots" (
	"key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "duplicate_candidates" jsonb;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "escalated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "reminder_sent_at" timestamp with time zone;