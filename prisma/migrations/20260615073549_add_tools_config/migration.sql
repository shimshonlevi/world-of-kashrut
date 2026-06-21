-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
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
    "templateId" TEXT,
    "stages" TEXT NOT NULL DEFAULT '[]',
    "enabledTools" TEXT NOT NULL DEFAULT '[]',
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
INSERT INTO "new_Project" ("actualExpenses", "approvers", "chatHistory", "clientAwaitingResponse", "country", "createdAt", "currentStage", "daysDelayed", "documents", "driveLink", "endDate", "factoryAddress", "factoryName", "flight", "hotel", "id", "importer", "importerEmail", "importerPhone", "kosherBody", "kosherFee", "needsFlightBooking", "paid", "productionDetails", "profitDaily", "projectName", "quotedPrice", "reportPhoto", "reportReceived", "responsible", "sentToChaim", "stages", "startDate", "status", "submissionFee", "supervisor", "supervisorPhone", "templateId", "timeline", "updatedAt") SELECT "actualExpenses", "approvers", "chatHistory", "clientAwaitingResponse", "country", "createdAt", "currentStage", "daysDelayed", "documents", "driveLink", "endDate", "factoryAddress", "factoryName", "flight", "hotel", "id", "importer", "importerEmail", "importerPhone", "kosherBody", "kosherFee", "needsFlightBooking", "paid", "productionDetails", "profitDaily", "projectName", "quotedPrice", "reportPhoto", "reportReceived", "responsible", "sentToChaim", "stages", "startDate", "status", "submissionFee", "supervisor", "supervisorPhone", "templateId", "timeline", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_responsible_idx" ON "Project"("responsible");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_currentStage_idx" ON "Project"("currentStage");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'FileText',
    "color" TEXT NOT NULL DEFAULT 'bg-slate-50 border-slate-200 text-slate-700',
    "category" TEXT NOT NULL DEFAULT '',
    "stages" TEXT NOT NULL DEFAULT '[]',
    "tools" TEXT NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Template" ("category", "color", "createdAt", "description", "icon", "id", "isArchived", "isDefault", "name", "stages", "updatedAt", "usageCount") SELECT "category", "color", "createdAt", "description", "icon", "id", "isArchived", "isDefault", "name", "stages", "updatedAt", "usageCount" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_isArchived_idx" ON "Template"("isArchived");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
