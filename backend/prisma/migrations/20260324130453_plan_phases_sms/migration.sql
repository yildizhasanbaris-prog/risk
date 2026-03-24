-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "action_type_id" INTEGER;

-- AlterTable
ALTER TABLE "CaseApproval" ADD COLUMN     "action_id" INTEGER,
ADD COLUMN     "approval_route_id" INTEGER,
ADD COLUMN     "risk_assessment_id" INTEGER;

-- AlterTable
ALTER TABLE "ReportAttachment" ADD COLUMN     "action_id" INTEGER,
ADD COLUMN     "risk_assessment_id" INTEGER;

-- CreateTable
CREATE TABLE "ActionType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ActionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRoute" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ApprovalRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_acceptance_rules" (
    "id" SERIAL NOT NULL,
    "risk_level" TEXT NOT NULL,
    "accepting_role_name" TEXT NOT NULL,
    "response_time_hours" INTEGER,
    "secondary_approver_required" BOOLEAN NOT NULL DEFAULT false,
    "escalation_role_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "risk_acceptance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "template_key" TEXT NOT NULL,
    "subject_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipient_rules" (
    "id" SERIAL NOT NULL,
    "event_code" TEXT NOT NULL,
    "recipient_kind" TEXT NOT NULL,
    "config" JSONB,

    CONSTRAINT "notification_recipient_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hf_taxonomy" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hf_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_retention_rules" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "record_retention_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confidentiality_rules" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mask_subject" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "confidentiality_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionType_code_key" ON "ActionType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRoute_code_key" ON "ApprovalRoute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_template_key_key" ON "notification_templates"("template_key");

-- CreateIndex
CREATE INDEX "notification_recipient_rules_event_code_idx" ON "notification_recipient_rules"("event_code");

-- CreateIndex
CREATE UNIQUE INDEX "hf_taxonomy_code_key" ON "hf_taxonomy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "confidentiality_rules_code_key" ON "confidentiality_rules"("code");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_action_type_id_fkey" FOREIGN KEY ("action_type_id") REFERENCES "ActionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttachment" ADD CONSTRAINT "ReportAttachment_risk_assessment_id_fkey" FOREIGN KEY ("risk_assessment_id") REFERENCES "RiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttachment" ADD CONSTRAINT "ReportAttachment_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseApproval" ADD CONSTRAINT "CaseApproval_approval_route_id_fkey" FOREIGN KEY ("approval_route_id") REFERENCES "ApprovalRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseApproval" ADD CONSTRAINT "CaseApproval_risk_assessment_id_fkey" FOREIGN KEY ("risk_assessment_id") REFERENCES "RiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseApproval" ADD CONSTRAINT "CaseApproval_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;
