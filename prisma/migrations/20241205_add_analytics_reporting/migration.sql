-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'expense_report',
    "format" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER DEFAULT 0,
    "filters" JSONB,
    "period" JSONB,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "recipients" JSONB NOT NULL,
    "reportOptions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunDate" TIMESTAMP(3),
    "lastRunDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExecutionLog" (
    "id" TEXT NOT NULL,
    "scheduledReportId" TEXT NOT NULL,
    "reportId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "recipients" JSONB,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsCache" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "previousValue" DECIMAL(15,2),
    "changePercentage" DECIMAL(5,2),
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseTrend" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "averageAmount" DECIMAL(15,2) NOT NULL,
    "categoryBreakdown" JSONB,
    "period" TEXT NOT NULL DEFAULT 'daily',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseTrend_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Key Constraints
ALTER TABLE "Report" ADD CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExecutionLog" ADD CONSTRAINT "ReportExecutionLog_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "ScheduledReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExecutionLog" ADD CONSTRAINT "ReportExecutionLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Budget" ADD CONSTRAINT "Budget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalyticsCache" ADD CONSTRAINT "AnalyticsCache_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KPIMetric" ADD CONSTRAINT "KPIMetric_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseTrend" ADD CONSTRAINT "ExpenseTrend_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Indexes for Performance
CREATE INDEX "Report_companyId_idx" ON "Report"("companyId");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_type_format_idx" ON "Report"("type", "format");

CREATE INDEX "ScheduledReport_companyId_idx" ON "ScheduledReport"("companyId");
CREATE INDEX "ScheduledReport_nextRunDate_idx" ON "ScheduledReport"("nextRunDate");
CREATE INDEX "ScheduledReport_isActive_idx" ON "ScheduledReport"("isActive");

CREATE INDEX "ReportExecutionLog_scheduledReportId_idx" ON "ReportExecutionLog"("scheduledReportId");
CREATE INDEX "ReportExecutionLog_executedAt_idx" ON "ReportExecutionLog"("executedAt");

CREATE INDEX "Budget_companyId_idx" ON "Budget"("companyId");
CREATE INDEX "Budget_categoryName_idx" ON "Budget"("categoryName");
CREATE INDEX "Budget_period_idx" ON "Budget"("startDate", "endDate");
CREATE INDEX "Budget_isActive_idx" ON "Budget"("isActive");

CREATE INDEX "AnalyticsCache_companyId_idx" ON "AnalyticsCache"("companyId");
CREATE INDEX "AnalyticsCache_cacheKey_idx" ON "AnalyticsCache"("cacheKey");
CREATE INDEX "AnalyticsCache_expiresAt_idx" ON "AnalyticsCache"("expiresAt");

CREATE UNIQUE INDEX "AnalyticsCache_companyId_cacheKey_key" ON "AnalyticsCache"("companyId", "cacheKey");

CREATE INDEX "KPIMetric_companyId_idx" ON "KPIMetric"("companyId");
CREATE INDEX "KPIMetric_metricName_idx" ON "KPIMetric"("metricName");
CREATE INDEX "KPIMetric_date_idx" ON "KPIMetric"("date");
CREATE INDEX "KPIMetric_period_idx" ON "KPIMetric"("period");

CREATE UNIQUE INDEX "KPIMetric_companyId_metricName_date_period_key" ON "KPIMetric"("companyId", "metricName", "date", "period");

CREATE INDEX "ExpenseTrend_companyId_idx" ON "ExpenseTrend"("companyId");
CREATE INDEX "ExpenseTrend_date_idx" ON "ExpenseTrend"("date");
CREATE INDEX "ExpenseTrend_period_idx" ON "ExpenseTrend"("period");

CREATE UNIQUE INDEX "ExpenseTrend_companyId_date_period_key" ON "ExpenseTrend"("companyId", "date", "period"); 