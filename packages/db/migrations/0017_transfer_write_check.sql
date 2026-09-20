DROP POLICY IF EXISTS problems_update ON problems;--> statement-breakpoint

CREATE POLICY problems_update ON problems FOR UPDATE
  USING (
    akhra_handles_problem(district_code, assigned_org_id)
    OR EXISTS (
      SELECT 1 FROM problem_routings r
      WHERE r.problem_id = problems.id AND r.organization_id = akhra_current_org_id()
    )
  )
  WITH CHECK (
    akhra_is_admin()
    OR (akhra_current_role() = 'dept_officer' AND assigned_org_id = akhra_current_org_id())
    OR EXISTS (
      SELECT 1 FROM problem_routings r
      WHERE r.problem_id = problems.id AND r.organization_id = akhra_current_org_id()
    )
  );
