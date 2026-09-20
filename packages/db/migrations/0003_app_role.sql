-- Superusers and table owners bypass row-level security, so an application connecting as
-- either gets no protection from the policies in 0001 — silently, and differently across
-- environments (a local Docker superuser vs. a managed Postgres role).
--
-- withUserContext() therefore switches to this restricted role for the duration of each
-- transaction. It owns nothing and is not a superuser, so policies genuinely apply. The
-- switch is transaction-scoped and reverts on commit, so one connection string still works
-- for the application, migrations and seeding alike.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akhra_app') THEN
    CREATE ROLE akhra_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO akhra_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO akhra_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO akhra_app;
--> statement-breakpoint

-- Future tables created by later migrations inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO akhra_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO akhra_app;
--> statement-breakpoint

-- Required for the connecting role to be able to SET ROLE akhra_app.
GRANT akhra_app TO CURRENT_USER;
