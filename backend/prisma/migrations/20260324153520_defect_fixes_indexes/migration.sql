-- CreateIndex
CREATE INDEX "Action_report_id_idx" ON "Action"("report_id");

-- CreateIndex
CREATE INDEX "Action_owner_user_id_idx" ON "Action"("owner_user_id");

-- CreateIndex
CREATE INDEX "Action_status_idx" ON "Action"("status");

-- CreateIndex
CREATE INDEX "Action_due_date_idx" ON "Action"("due_date");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "CaseApproval_report_id_idx" ON "CaseApproval"("report_id");

-- CreateIndex
CREATE INDEX "CaseApproval_approval_type_status_idx" ON "CaseApproval"("approval_type", "status");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_department_id_idx" ON "Report"("department_id");

-- CreateIndex
CREATE INDEX "Report_lifecycle_status_idx" ON "Report"("lifecycle_status");

-- CreateIndex
CREATE INDEX "Report_created_at_idx" ON "Report"("created_at");

-- CreateIndex
CREATE INDEX "Report_reported_by_user_id_idx" ON "Report"("reported_by_user_id");

-- CreateIndex
CREATE INDEX "notification_log_case_id_idx" ON "notification_log"("case_id");

-- CreateIndex
CREATE INDEX "notification_queue_status_created_at_idx" ON "notification_queue"("status", "created_at");

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
