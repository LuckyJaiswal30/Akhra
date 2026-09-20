-- A new enum label cannot be used in the transaction that adds it, so the constraint that names
-- 'student' waits for its own migration.
ALTER TABLE "users" DROP CONSTRAINT "users_org_role_needs_org";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_role_needs_org" CHECK ("users"."role" not in ('university_admin', 'faculty', 'student', 'industry_admin', 'industry_partner', 'dept_officer') or "users"."organization_id" is not null);
