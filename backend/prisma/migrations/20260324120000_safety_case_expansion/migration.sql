-- Extend ReportStatus enum (PostgreSQL: one ADD VALUE per statement)
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'UNDER_SCREENING';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'AWAITING_IMMEDIATE_ACTION';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'UNDER_INVESTIGATION';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'AWAITING_RISK_ASSESSMENT';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'AWAITING_APPROVAL';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'MITIGATION_IN_PROGRESS';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'DUPLICATE';

-- New enums
CREATE TYPE "ActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "MandatoryVoluntary" AS ENUM ('MANDATORY', 'VOLUNTARY');
CREATE TYPE "OccurrenceClassification" AS ENUM ('OCCURRENCE', 'HAZARD', 'NEAR_MISS', 'OBSERVATION', 'HF_ISSUE', 'PROCEDURAL_DEVIATION', 'SUBCONTRACTOR_SAFETY', 'AUDIT_CONCERN', 'CHANGE_RELATED', 'OTHER');
CREATE TYPE "ApprovalType" AS ENUM ('SCREENING', 'RISK_ACCEPTANCE', 'MITIGATION_VERIFICATION', 'EFFECTIVENESS', 'CLOSURE');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');
CREATE TYPE "ChangeCaseStatus" AS ENUM ('DRAFT', 'ASSESSMENT', 'APPROVAL', 'IMPLEMENTATION', 'CLOSED');

-- CaseType lookup
CREATE TABLE "CaseType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CaseType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CaseType_code_key" ON "CaseType"("code");

-- Report: new columns
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "case_type_id" INTEGER;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "work_order_ref" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "task_ref" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "customer_ref" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "subcontractor_ref" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "event_date" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "persons_informed" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "linked_case_id" INTEGER;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "confidential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "anonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "mandatory_voluntary" "MandatoryVoluntary";
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "occurrence_classification" "OccurrenceClassification";
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "immediate_containment_required" BOOLEAN;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "investigation_required" BOOLEAN;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "risk_assessment_required" BOOLEAN;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "external_reporting_required" BOOLEAN;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "screening_comment" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "screened_by_user_id" INTEGER;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "screened_at" TIMESTAMP(3);

-- Hazard
CREATE TABLE "Hazard" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "statement" TEXT NOT NULL,
    "top_event" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hazard_pkey" PRIMARY KEY ("id")
);

-- RiskAssessment extensions
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "hazard_id" INTEGER;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "risk_owner_user_id" INTEGER;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "acceptance_level" TEXT;
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "review_due_date" TIMESTAMP(3);
ALTER TABLE "RiskAssessment" ADD COLUMN IF NOT EXISTS "risk_owner_user_id" INTEGER;

-- Action extensions
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "support_department_id" INTEGER;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "revised_due_date" TIMESTAMP(3);
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "evidence_ref" TEXT;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "escalation" TEXT;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "verification_method" TEXT;
ALTER TABLE "Action" ADD COLUMN IF NOT EXISTS "sms_manager_sign_off" BOOLEAN NOT NULL DEFAULT false;

-- ReportAttachment version
ALTER TABLE "ReportAttachment" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Investigation
CREATE TABLE "Investigation" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "chronology" TEXT,
    "contributory_factors" TEXT,
    "hf_factors" TEXT,
    "organisational_factors" TEXT,
    "subcontractor_factors" TEXT,
    "root_cause" TEXT,
    "lessons_learned" TEXT,
    "lead_user_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Investigation_report_id_key" ON "Investigation"("report_id");

-- EffectivenessReview
CREATE TABLE "EffectivenessReview" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "implementation_verified" BOOLEAN,
    "control_effective" BOOLEAN,
    "repeat_event" BOOLEAN,
    "spi_trend_note" TEXT,
    "residual_risk_reduced" BOOLEAN,
    "further_action_required" BOOLEAN,
    "reviewer_comment" TEXT,
    "reviewed_by_user_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    CONSTRAINT "EffectivenessReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EffectivenessReview_report_id_key" ON "EffectivenessReview"("report_id");

-- CaseApproval
CREATE TABLE "CaseApproval" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "approval_type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "required_role_hint" TEXT,
    "signed_by_user_id" INTEGER,
    "signed_at" TIMESTAMP(3),
    "comment" TEXT,
    CONSTRAINT "CaseApproval_pkey" PRIMARY KEY ("id")
);

-- CaseComment
CREATE TABLE "CaseComment" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseComment_pkey" PRIMARY KEY ("id")
);

-- ChangeRecord
CREATE TABLE "ChangeRecord" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "change_type" TEXT NOT NULL,
    "description" TEXT,
    "status" "ChangeCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "transitional_risk_note" TEXT,
    CONSTRAINT "ChangeRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChangeRecord_report_id_key" ON "ChangeRecord"("report_id");

-- ComplianceFinding
CREATE TABLE "ComplianceFinding" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "safety_impact" BOOLEAN NOT NULL DEFAULT false,
    "linked_report_id" INTEGER,
    "description" TEXT,
    CONSTRAINT "ComplianceFinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ComplianceFinding_code_key" ON "ComplianceFinding"("code");

-- LessonLearned
CREATE TABLE "LessonLearned" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT,
    "promoted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonLearned_pkey" PRIMARY KEY ("id")
);

-- FKs
ALTER TABLE "Report" ADD CONSTRAINT "Report_case_type_id_fkey" FOREIGN KEY ("case_type_id") REFERENCES "CaseType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_linked_case_id_fkey" FOREIGN KEY ("linked_case_id") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_screened_by_user_id_fkey" FOREIGN KEY ("screened_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "Hazard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_risk_owner_user_id_fkey" FOREIGN KEY ("risk_owner_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Action" ADD CONSTRAINT "Action_support_department_id_fkey" FOREIGN KEY ("support_department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_lead_user_id_fkey" FOREIGN KEY ("lead_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EffectivenessReview" ADD CONSTRAINT "EffectivenessReview_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EffectivenessReview" ADD CONSTRAINT "EffectivenessReview_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseApproval" ADD CONSTRAINT "CaseApproval_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseApproval" ADD CONSTRAINT "CaseApproval_signed_by_user_id_fkey" FOREIGN KEY ("signed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChangeRecord" ADD CONSTRAINT "ChangeRecord_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceFinding" ADD CONSTRAINT "ComplianceFinding_linked_report_id_fkey" FOREIGN KEY ("linked_report_id") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LessonLearned" ADD CONSTRAINT "LessonLearned_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
