CREATE TYPE "public"."partner_kind" AS ENUM('corporate', 'startup', 'msme', 'csr_foundation', 'research_lab', 'innovation_hub');--> statement-breakpoint
ALTER TYPE "public"."offer_type" ADD VALUE 'co_development' BEFORE 'prototyping';--> statement-breakpoint
ALTER TYPE "public"."offer_type" ADD VALUE 'testing' BEFORE 'data_access';--> statement-breakpoint
ALTER TYPE "public"."offer_type" ADD VALUE 'technology_transfer' BEFORE 'internship';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "partner_kind" "partner_kind";--> statement-breakpoint
-- Partners onboarded before kinds existed are recorded as corporate until an administrator corrects it.
UPDATE "organizations" SET "partner_kind" = 'corporate' WHERE "type" = 'industry';--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_partner_kind_industry_only" CHECK (("organizations"."type" = 'industry') = ("organizations"."partner_kind" is not null));