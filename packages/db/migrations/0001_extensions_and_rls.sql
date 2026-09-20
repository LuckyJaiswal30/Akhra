-- Trigram similarity powers duplicate detection in the database tier.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS problems_text_trgm_idx
  ON problems USING gin ((title || ' ' || description) gin_trgm_ops);
--> statement-breakpoint

-- Self-reference declared here because Drizzle cannot express a circular FK inline.
ALTER TABLE problems
  ADD CONSTRAINT problems_duplicate_of_fk
  FOREIGN KEY (duplicate_of_id) REFERENCES problems(id) ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security.
--
-- These policies are defence in depth behind the API-layer checks in each
-- module's policy.ts, not a replacement for them. They read the identity that
-- withUserContext() stamps onto the transaction via set_config.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION akhra_current_user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('akhra.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_current_role() RETURNS text AS $$
  SELECT COALESCE(NULLIF(current_setting('akhra.role', true), ''), 'anonymous');
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION akhra_is_admin() RETURNS boolean AS $$
  SELECT akhra_current_role() IN ('gov_admin', 'super_admin');
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

-- The organization the current user belongs to, for org-scoped visibility.
CREATE OR REPLACE FUNCTION akhra_current_org_id() RETURNS uuid AS $$
  SELECT organization_id FROM users WHERE id = akhra_current_user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
--> statement-breakpoint

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Public reports are readable by anyone; private ones only by their submitter,
-- an institution they were routed to, or an administrator.
CREATE POLICY problems_select ON problems FOR SELECT
  USING (
    is_public = true
    OR akhra_is_admin()
    OR submitter_id = akhra_current_user_id()
    OR EXISTS (
      SELECT 1 FROM problem_routings r
      WHERE r.problem_id = problems.id AND r.organization_id = akhra_current_org_id()
    )
  );
--> statement-breakpoint

CREATE POLICY problems_insert ON problems FOR INSERT WITH CHECK (true);
--> statement-breakpoint

CREATE POLICY problems_update ON problems FOR UPDATE
  USING (
    akhra_is_admin()
    OR EXISTS (
      SELECT 1 FROM problem_routings r
      WHERE r.problem_id = problems.id AND r.organization_id = akhra_current_org_id()
    )
  );
--> statement-breakpoint

CREATE POLICY problems_delete ON problems FOR DELETE USING (akhra_is_admin());
--> statement-breakpoint

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Projects are discoverable so industry partners can browse vetted work.
CREATE POLICY projects_select ON projects FOR SELECT USING (true);
--> statement-breakpoint

CREATE POLICY projects_write ON projects FOR ALL
  USING (akhra_is_admin() OR organization_id = akhra_current_org_id())
  WITH CHECK (akhra_is_admin() OR organization_id = akhra_current_org_id());
--> statement-breakpoint

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY documents_access ON documents FOR ALL
  USING (
    akhra_is_admin()
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

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Internal notes stay inside the owning institution; public replies are visible
-- to the citizen who reported the problem.
CREATE POLICY messages_select ON messages FOR SELECT
  USING (
    akhra_is_admin()
    OR visibility = 'public'
    OR author_id = akhra_current_user_id()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = messages.project_id AND p.organization_id = akhra_current_org_id()
    )
  );
--> statement-breakpoint

CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (author_id = akhra_current_user_id() OR akhra_is_admin());
--> statement-breakpoint

CREATE POLICY messages_update ON messages FOR UPDATE
  USING (author_id = akhra_current_user_id() OR akhra_is_admin());
--> statement-breakpoint

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- A notification is only ever visible to its recipient.
CREATE POLICY notifications_own ON notifications FOR ALL
  USING (user_id = akhra_current_user_id())
  WITH CHECK (user_id = akhra_current_user_id());
--> statement-breakpoint

ALTER TABLE industry_interests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY industry_interests_select ON industry_interests FOR SELECT
  USING (
    akhra_is_admin()
    OR organization_id = akhra_current_org_id()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = industry_interests.project_id AND p.organization_id = akhra_current_org_id()
    )
  );
--> statement-breakpoint

CREATE POLICY industry_interests_insert ON industry_interests FOR INSERT
  WITH CHECK (organization_id = akhra_current_org_id());
--> statement-breakpoint

-- The offering partner may withdraw; the owning university may accept or decline.
CREATE POLICY industry_interests_update ON industry_interests FOR UPDATE
  USING (
    akhra_is_admin()
    OR organization_id = akhra_current_org_id()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = industry_interests.project_id AND p.organization_id = akhra_current_org_id()
    )
  );
