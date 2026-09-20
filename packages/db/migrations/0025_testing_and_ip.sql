CREATE TYPE "public"."ip_status" AS ENUM('filed', 'published', 'granted');--> statement-breakpoint
CREATE TYPE "public"."test_result" AS ENUM('passed', 'failed', 'inconclusive');--> statement-breakpoint
CREATE TABLE "project_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"milestone_id" uuid,
	"title" text NOT NULL,
	"method" text NOT NULL,
	"result" "test_result" NOT NULL,
	"findings" text NOT NULL,
	"conducted_on" date NOT NULL,
	"recorded_by_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "outcomes" ADD COLUMN "ip_status" "ip_status";--> statement-breakpoint
ALTER TABLE "project_tests" ADD CONSTRAINT "project_tests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tests" ADD CONSTRAINT "project_tests_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tests" ADD CONSTRAINT "project_tests_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_tests_project_idx" ON "project_tests" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_ip_status_patent_only" CHECK ("outcomes"."ip_status" is null or "outcomes"."outcome_type" = 'patent');--> statement-breakpoint

-- Test records follow the same rule as milestones: anyone may read, the team and the district's officer write.
ALTER TABLE "project_tests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY project_tests_select ON project_tests FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY project_tests_write ON project_tests FOR ALL
  USING (akhra_on_project_team(project_id) OR akhra_oversees_project(project_id))
  WITH CHECK (akhra_on_project_team(project_id) OR akhra_oversees_project(project_id));
