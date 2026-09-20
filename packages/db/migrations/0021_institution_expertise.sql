CREATE TYPE "public"."academic_discipline" AS ENUM('agricultural_sciences', 'veterinary_animal_sciences', 'civil_engineering', 'water_engineering', 'environmental_science', 'mining_geology', 'electrical_engineering', 'mechanical_engineering', 'electronics_communication', 'computer_science', 'medicine_public_health', 'nursing_paramedical', 'pharmacy_biotechnology', 'education', 'social_work_sociology', 'economics_management', 'public_policy_law', 'architecture_planning');--> statement-breakpoint
CREATE TYPE "public"."institution_facility" AS ENUM('research_centre', 'innovation_centre', 'incubation_centre', 'testing_lab', 'field_station');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "disciplines" "academic_discipline"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "facilities" "institution_facility"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specialisation" text;--> statement-breakpoint

-- Discipline was free text. Keep what people wrote as their specialisation, then map the wording
-- onto the fixed list; anything that does not map is left for their institution to set.
UPDATE "users" SET "specialisation" = "discipline" WHERE "discipline" IS NOT NULL;--> statement-breakpoint
UPDATE "users" SET "discipline" = CASE
  WHEN "discipline" ~* 'agronom|soil|agricult|crop|horticult' THEN 'agricultural_sciences'
  WHEN "discipline" ~* 'veterinar|animal|dairy|fisher' THEN 'veterinary_animal_sciences'
  WHEN "discipline" ~* 'water|hydro' THEN 'water_engineering'
  WHEN "discipline" ~* 'environment|ecolog|forest' THEN 'environmental_science'
  WHEN "discipline" ~* 'civil|structur' THEN 'civil_engineering'
  WHEN "discipline" ~* 'mining|geolog' THEN 'mining_geology'
  WHEN "discipline" ~* 'electrical|power' THEN 'electrical_engineering'
  WHEN "discipline" ~* 'mechanical' THEN 'mechanical_engineering'
  WHEN "discipline" ~* 'electronic|communication' THEN 'electronics_communication'
  WHEN "discipline" ~* 'computer|software|data|information' THEN 'computer_science'
  WHEN "discipline" ~* 'medic|health|clinic' THEN 'medicine_public_health'
  WHEN "discipline" ~* 'nurs|paramedic' THEN 'nursing_paramedical'
  WHEN "discipline" ~* 'pharma|biotech' THEN 'pharmacy_biotechnology'
  WHEN "discipline" ~* 'educat|teach' THEN 'education'
  WHEN "discipline" ~* 'social|sociolog' THEN 'social_work_sociology'
  WHEN "discipline" ~* 'econom|manage|commerce' THEN 'economics_management'
  WHEN "discipline" ~* 'law|policy|public admin' THEN 'public_policy_law'
  WHEN "discipline" ~* 'architect|planning|urban' THEN 'architecture_planning'
END
WHERE "discipline" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "discipline" SET DATA TYPE "public"."academic_discipline" USING "discipline"::"public"."academic_discipline";
