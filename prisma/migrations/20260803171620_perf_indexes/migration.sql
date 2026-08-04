-- DropIndex
DROP INDEX "attachments_messageId_idx";

-- CreateIndex
CREATE INDEX "event_registrations_eventId_checkedInAt_idx" ON "event_registrations"("eventId", "checkedInAt");
