-- Project work is overseen by the district its report came from, not by every officer in the state.
-- Until now a project could be written by any government officer, and proposals, milestones and
-- outcomes had no row-level security at all: every check lived only in application code.

CREATE OR REPLACE FUNCTION akhra_oversees_project(project uuid) RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT akhra_can_reach_district(pr.district_code)
       FROM projects p JOIN problems pr ON pr.id = p.problem_id
      WHERE p.id = project),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_on_project_team(project uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
     WHERE p.id = project AND p.organization_id = akhra_current_org_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
--> statement-breakpoint

DROP POLICY IF EXISTS projects_write ON projects;
--> statement-breakpoint

CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (organization_id = akhra_current_org_id());
--> statement-breakpoint

CREATE POLICY projects_update ON projects FOR UPDATE
  USING (organization_id = akhra_current_org_id() OR akhra_oversees_project(id))
  WITH CHECK (organization_id = akhra_current_org_id() OR akhra_oversees_project(id));
--> statement-breakpoint

CREATE POLICY projects_delete ON projects FOR DELETE
  USING (akhra_oversees_project(id));
--> statement-breakpoint

-- Proposals: the team writes versions, only as a draft or submitted; the district officer decides.
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY proposals_select ON proposals FOR SELECT USING (true);
--> statement-breakpoint

CREATE POLICY proposals_insert ON proposals FOR INSERT
  WITH CHECK (akhra_on_project_team(project_id) AND status IN ('draft', 'submitted'));
--> statement-breakpoint

CREATE POLICY proposals_update ON proposals FOR UPDATE
  USING (akhra_oversees_project(project_id))
  WITH CHECK (akhra_oversees_project(project_id));
--> statement-breakpoint

-- Milestones and outcomes: written by the team, and by the officer overseeing the district.
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY milestones_select ON milestones FOR SELECT USING (true);
--> statement-breakpoint

CREATE POLICY milestones_write ON milestones FOR ALL
  USING (akhra_on_project_team(project_id) OR akhra_oversees_project(project_id))
  WITH CHECK (akhra_on_project_team(project_id) OR akhra_oversees_project(project_id));
--> statement-breakpoint

ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY outcomes_select ON outcomes FOR SELECT USING (true);
--> statement-breakpoint

CREATE POLICY outcomes_write ON outcomes FOR ALL
  USING (akhra_on_project_team(project_id) OR akhra_oversees_project(project_id))
  WITH CHECK (akhra_on_project_team(project_id) OR akhra_oversees_project(project_id));
--> statement-breakpoint

-- Documents and internal thread notes were readable by any government officer in the state.
CREATE OR REPLACE FUNCTION akhra_oversees_problem(problem uuid) RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT akhra_can_reach_district(pr.district_code) FROM problems pr WHERE pr.id = problem),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
--> statement-breakpoint

DROP POLICY IF EXISTS documents_access ON documents;
--> statement-breakpoint

CREATE POLICY documents_access ON documents FOR ALL
  USING (
    akhra_oversees_project(documents.project_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = documents.project_id
        AND (
          p.organization_id = akhra_current_org_id()
          OR EXISTS (
            SELECT 1 FROM project_members m
            WHERE m.project_id = p.id AND m.user_id = akhra_current_user_id()
          )
          OR EXISTS (
            SELECT 1 FROM industry_interests i
            WHERE i.project_id = p.id
              AND i.organization_id = akhra_current_org_id()
              AND i.status = 'accepted'
          )
        )
    )
  );
--> statement-breakpoint

DROP POLICY IF EXISTS messages_select ON messages;
--> statement-breakpoint

CREATE POLICY messages_select ON messages FOR SELECT
  USING (
    visibility = 'public'
    OR author_id = akhra_current_user_id()
    OR akhra_oversees_problem(messages.problem_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = messages.project_id AND p.organization_id = akhra_current_org_id()
    )
  );
