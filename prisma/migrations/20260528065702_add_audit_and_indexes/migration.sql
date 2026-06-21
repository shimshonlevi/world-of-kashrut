-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responsible" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "importer" TEXT NOT NULL,
    "importerPhone" TEXT,
    "importerEmail" TEXT,
    "country" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "kosherBody" TEXT NOT NULL,
    "supervisor" TEXT NOT NULL,
    "supervisorPhone" TEXT,
    "factoryName" TEXT NOT NULL,
    "factoryAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "reportReceived" BOOLEAN NOT NULL DEFAULT false,
    "reportPhoto" TEXT,
    "sentToChaim" BOOLEAN NOT NULL DEFAULT false,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "profitDaily" INTEGER NOT NULL,
    "kosherFee" INTEGER NOT NULL,
    "submissionFee" INTEGER NOT NULL,
    "actualExpenses" INTEGER,
    "quotedPrice" INTEGER,
    "driveLink" TEXT NOT NULL,
    "daysDelayed" INTEGER,
    "timeline" TEXT NOT NULL,
    "documents" TEXT NOT NULL,
    "chatHistory" TEXT NOT NULL,
    "flight" TEXT NOT NULL,
    "hotel" TEXT NOT NULL,
    "needsFlightBooking" BOOLEAN NOT NULL DEFAULT false,
    "clientAwaitingResponse" BOOLEAN NOT NULL DEFAULT false,
    "productionDetails" TEXT,
    "approvers" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "performedBy" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Project_responsible_idx" ON "Project"("responsible");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_currentStage_idx" ON "Project"("currentStage");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
