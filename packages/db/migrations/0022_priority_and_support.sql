CREATE TYPE "public"."affected_scale" AS ENUM('household', 'neighbourhood', 'village', 'block_or_town');--> statement-breakpoint
CREATE TYPE "public"."priority_level" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."priority_reason" AS ENUM('safety_risk', 'urgent_language', 'wide_reach', 'essential_service', 'many_supporters', 'reported_repeatedly', 'long_wait');--> statement-breakpoint
CREATE TABLE "problem_supports" (
	"problem_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_supports_problem_id_user_id_pk" PRIMARY KEY("problem_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "affected_scale" "affected_scale";--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "safety_risk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "support_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "priority_score" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "priority" "priority_level" DEFAULT 'low' NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "priority_reasons" "priority_reason"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "problem_supports" ADD CONSTRAINT "problem_supports_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_supports" ADD CONSTRAINT "problem_supports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_supports_user_idx" ON "problem_supports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "problems_priority_idx" ON "problems" USING btree ("priority_score");--> statement-breakpoint

-- Anyone may see how many people back a report; each person adds or withdraws only their own.
ALTER TABLE "problem_supports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY problem_supports_select ON problem_supports FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY problem_supports_insert ON problem_supports FOR INSERT
  WITH CHECK (user_id = akhra_current_user_id());--> statement-breakpoint
CREATE POLICY problem_supports_delete ON problem_supports FOR DELETE
  USING (user_id = akhra_current_user_id());
