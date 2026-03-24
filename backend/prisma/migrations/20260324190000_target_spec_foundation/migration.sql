-- Target SMS spec foundation (SafetyCase semantics on Report; Initial Review; notifications skeleton; mitigation display no; change details)

CREATE TYPE "CaseLifecycleStatus" AS ENUM ('DRAFT', 'OPEN', 'ACTION_OPEN', 'MONITORING', 'CLOSED');
CREATE TYPE "SafetyCaseKind" AS ENUM ('REPORT', 'CHANGE');

ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';

ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "linked_report_no" TEXT;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "mitigation_display_no" TEXT;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "title" TEXT;

ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "assumptions_validated" BOOLEAN;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "change_scope" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "change_subtype" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "cumulative_effect_note" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "go_live_decision" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "impact_on_existing_hazards" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "impact_on_previous_risk_assessments" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "post_implementation_review" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "stakeholders" TEXT;
ALTER TABLE "ChangeRecord" ADD COLUMN IF NOT EXISTS "training_competence_impact" TEXT;

ALTER TABLE "EffectivenessReview" ADD COLUMN IF NOT EXISTS "evidence_checked" BOOLEAN;
ALTER TABLE "EffectivenessReview" ADD COLUMN IF NOT EXISTS "residual_likelihood_code" INTEGER;
ALTER TABLE "EffectivenessReview" ADD COLUMN IF NOT EXISTS "residual_risk_index" TEXT;
ALTER TABLE "EffectivenessReview" ADD COLUMN IF NOT EXISTS "residual_risk_level" TEXT;
ALTER TABLE "EffectivenessReview" ADD COLUMN IF NOT EXISTS "residual_severity_code" TEXT;

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "lifecycle_status" "CaseLifecycleStatus";
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "linked_compliance_ref" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "location_id" INTEGER;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "safety_case_kind" "SafetyCaseKind";

ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "assumptions" TEXT;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "hazard_category_id" INTEGER;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "residual_likelihood_code" INTEGER;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "residual_risk_index" TEXT;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "residual_risk_level" TEXT;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "residual_severity_code" TEXT;

CREATE TABLE IF NOT EXISTS "Location" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Location_code_key" ON "Location"("code");

CREATE TABLE IF NOT EXISTS "CaseReview" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "duplicate_flag" BOOLEAN NOT NULL DEFAULT false,
    "requires_investigation" BOOLEAN NOT NULL DEFAULT false,
    "requires_risk_assessment" BOOLEAN NOT NULL DEFAULT true,
    "requires_immediate_action" BOOLEAN NOT NULL DEFAULT false,
    "case_type_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "reviewer_user_id" INTEGER NOT NULL,
    "review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CaseReview_report_id_key" ON "CaseReview"("report_id");

CREATE TABLE IF NOT EXISTS "ComplianceLink" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "external_compliance_ref" TEXT NOT NULL,
    "safety_impact_note" TEXT,
    CONSTRAINT "ComplianceLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_rules" (
    "id" SERIAL NOT NULL,
    "event_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "template_key" TEXT,
    "config" JSONB,
    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_rules_event_code_key" ON "notification_rules"("event_code");

CREATE TABLE IF NOT EXISTS "notification_queue" (
    "id" SERIAL NOT NULL,
    "event_code" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_log" (
    "id" SERIAL NOT NULL,
    "event_code" TEXT NOT NULL,
    "recipient" TEXT,
    "subject" TEXT,
    "body_preview" TEXT,
    "case_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Action_mitigation_display_no_key" ON "Action"("mitigation_display_no");

DO $$ BEGIN
  ALTER TABLE "Report" ADD CONSTRAINT "Report_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseReview" ADD CONSTRAINT "CaseReview_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CaseReview" ADD CONSTRAINT "CaseReview_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ComplianceLink" ADD CONSTRAINT "ComplianceLink_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_hazard_category_id_fkey" FOREIGN KEY ("hazard_category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
