-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN "openingTime" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "SystemSettings" ADD COLUMN "closingTime" TEXT NOT NULL DEFAULT '20:00';
