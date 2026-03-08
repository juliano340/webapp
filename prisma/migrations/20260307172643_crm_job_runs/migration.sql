-- CreateTable
CREATE TABLE "CrmJobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "triggeredById" TEXT,
    "triggeredByEmail" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "generatedPostService" INTEGER NOT NULL DEFAULT 0,
    "generatedBirthday" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "CrmJobRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CrmJobRun_startedAt_idx" ON "CrmJobRun"("startedAt");

-- CreateIndex
CREATE INDEX "CrmJobRun_success_startedAt_idx" ON "CrmJobRun"("success", "startedAt");
