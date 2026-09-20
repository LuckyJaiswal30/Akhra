UPDATE "users" SET "role" = 'dept_officer'
  WHERE "role" = 'gov_admin' AND "organization_id" IS NOT NULL AND "jurisdiction_code" IS NULL;--> statement-breakpoint

UPDATE "users" SET "organization_id" = NULL WHERE "role" = 'gov_admin';--> statement-breakpoint

ALTER TABLE "users" DROP CONSTRAINT "users_org_role_needs_org";--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_org_role_needs_org" CHECK ("users"."role" not in ('university_admin', 'faculty', 'industry_admin', 'industry_partner', 'dept_officer') or "users"."organization_id" is not null);--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_district_officer_has_no_department" CHECK ("users"."role" <> 'gov_admin' or "users"."organization_id" is null);--> statement-breakpoint

ALTER TABLE "problems" ADD COLUMN "transferred_from_code" text;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "transferred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "transferred_by_id" uuid;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "transfer_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_transferred_by_id_users_id_fk" FOREIGN KEY ("transferred_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_current_jurisdiction() RETURNS text AS $$
  SELECT jurisdiction_code FROM users WHERE id = akhra_current_user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_can_reach_district(district text) RETURNS boolean AS $$
  SELECT CASE akhra_current_role()
    WHEN 'super_admin' THEN true
    WHEN 'gov_admin' THEN
      akhra_current_jurisdiction() IS NULL OR akhra_current_jurisdiction() = district
    ELSE false
  END;
$$ LANGUAGE sql STABLE;--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_handles_problem(district text, assigned_org uuid) RETURNS boolean AS $$
  SELECT akhra_can_reach_district(district)
    OR (akhra_current_role() = 'dept_officer'
        AND assigned_org IS NOT NULL
        AND assigned_org = akhra_current_org_id());
$$ LANGUAGE sql STABLE;--> statement-breakpoint

DROP POLICY IF EXISTS problems_select ON problems;--> statement-breakpoint

CREATE POLICY problems_select ON problems FOR SELECT
  USING (
    is_public = true
    OR akhra_handles_problem(district_code, assigned_org_id)
    OR submitter_id = akhra_current_user_id()
    OR EXISTS (
      SELECT 1 FROM problem_routings r
      WHERE r.problem_id = problems.id AND r.organization_id = akhra_current_org_id()
    )
  );--> statement-breakpoint

DROP POLICY IF EXISTS problems_update ON problems;--> statement-breakpoint

CREATE POLICY problems_update ON problems FOR UPDATE
  USING (
    akhra_handles_problem(district_code, assigned_org_id)
    OR EXISTS (
      SELECT 1 FROM problem_routings r
      WHERE r.problem_id = problems.id AND r.organization_id = akhra_current_org_id()
    )
  );--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_guard_access_columns() RETURNS trigger AS $$
BEGIN
  IF current_user = 'akhra_app' AND (
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.jurisdiction_code IS DISTINCT FROM OLD.jurisdiction_code
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    RAISE EXCEPTION 'role, district and department are set by appointment, not by the account holder'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS users_access_columns_locked ON users;--> statement-breakpoint

CREATE TRIGGER users_access_columns_locked
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION akhra_guard_access_columns();
