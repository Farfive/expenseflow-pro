-- Migration: Add Comprehensive Export System
-- Description: Adds tables for export logging, auditing, scheduling, and templates

-- Export Logs Table
CREATE TABLE "export_logs" (
    "id" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "result" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id")
);

-- Export Audits Table
CREATE TABLE "export_audits" (
    "id" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "recordCount" INTEGER,
    "fileSize" INTEGER,
    "fileName" TEXT,
    "filePath" TEXT,
    "options" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_audits_pkey" PRIMARY KEY ("id")
);

-- Export Schedules Table
CREATE TABLE "export_schedules" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schedule" TEXT NOT NULL,
    "exportConfig" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_schedules_pkey" PRIMARY KEY ("id")
);

-- Export Templates Table
CREATE TABLE "export_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateSource" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "export_audits_exportId_key" ON "export_audits"("exportId");
CREATE UNIQUE INDEX "export_schedules_taskId_key" ON "export_schedules"("taskId");
CREATE UNIQUE INDEX "export_templates_companyId_name_key" ON "export_templates"("companyId", "name");

-- Create indexes for performance
CREATE INDEX "export_logs_exportId_idx" ON "export_logs"("exportId");
CREATE INDEX "export_logs_timestamp_idx" ON "export_logs"("timestamp");
CREATE INDEX "export_audits_format_idx" ON "export_audits"("format");
CREATE INDEX "export_audits_createdAt_idx" ON "export_audits"("createdAt");
CREATE INDEX "export_schedules_companyId_enabled_idx" ON "export_schedules"("companyId", "enabled");
CREATE INDEX "export_schedules_nextRunAt_idx" ON "export_schedules"("nextRunAt");
CREATE INDEX "export_templates_category_isActive_idx" ON "export_templates"("category", "isActive");

-- Add foreign key constraints
ALTER TABLE "export_schedules" ADD CONSTRAINT "export_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_schedules" ADD CONSTRAINT "export_schedules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "export_templates" ADD CONSTRAINT "export_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_templates" ADD CONSTRAINT "export_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 