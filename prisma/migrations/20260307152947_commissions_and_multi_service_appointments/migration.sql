-- CreateTable
CREATE TABLE "CommissionSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "defaultRateBps" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BarberCommissionRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barberId" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BarberCommissionRate_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceCommissionRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceCommissionRate_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentExtraService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentExtraService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentExtraService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BarberCommissionRate_barberId_key" ON "BarberCommissionRate"("barberId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCommissionRate_serviceId_key" ON "ServiceCommissionRate"("serviceId");

-- CreateIndex
CREATE INDEX "AppointmentExtraService_appointmentId_idx" ON "AppointmentExtraService"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentExtraService_serviceId_idx" ON "AppointmentExtraService"("serviceId");
