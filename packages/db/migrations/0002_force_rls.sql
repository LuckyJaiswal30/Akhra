-- Postgres exempts a table's owner from its own RLS policies unless FORCE is set.
-- Without this the policies in 0001 are inert for any connection using the owner
-- role, which is exactly how the application connects.
--
-- Migrations and the seed script escape deliberately with `SET LOCAL row_security = off`,
-- a statement only the table owner may issue. The application never issues it.

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE problems FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE industry_interests FORCE ROW LEVEL SECURITY;
