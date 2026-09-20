CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "district_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locality" text;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD COLUMN "code_hash" text;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
-- Reset tokens are read only by owner-run code paths, never through the app role.
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE password_resets FORCE ROW LEVEL SECURITY;
