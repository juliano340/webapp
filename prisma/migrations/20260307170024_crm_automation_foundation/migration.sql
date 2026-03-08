-- CreateTable
CREATE TABLE "CrmAutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "daysAfterService" INTEGER,
    "template" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrmReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dedupeKey" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" DATETIME NOT NULL,
    "messageSnapshot" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmReminder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrmReminderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmReminderEvent_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "CrmReminder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmReminderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmAutomationRule_type_key" ON "CrmAutomationRule"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CrmReminder_dedupeKey_key" ON "CrmReminder"("dedupeKey");

-- CreateIndex
CREATE INDEX "CrmReminder_scheduledFor_idx" ON "CrmReminder"("scheduledFor");

-- CreateIndex
CREATE INDEX "CrmReminder_status_scheduledFor_idx" ON "CrmReminder"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrmReminder_type_scheduledFor_idx" ON "CrmReminder"("type", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrmReminder_clientId_scheduledFor_idx" ON "CrmReminder"("clientId", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrmReminderEvent_reminderId_createdAt_idx" ON "CrmReminderEvent"("reminderId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmReminderEvent_createdAt_idx" ON "CrmReminderEvent"("createdAt");
