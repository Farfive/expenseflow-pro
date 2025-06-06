-- User Analytics and Feedback System Migration

-- User Events Tracking
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "companyId" TEXT,
    "eventType" TEXT NOT NULL, -- page_view, feature_usage, click, form_submit, etc.
    "eventName" TEXT NOT NULL,
    "page" TEXT,
    "feature" TEXT,
    "metadata" TEXT, -- JSON string for additional data
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- User Sessions
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page" TEXT,
    "feature" TEXT,
    "metadata" TEXT, -- JSON string
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- Page Performance Metrics
CREATE TABLE "PagePerformance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "page" TEXT NOT NULL,
    "loadTime" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "domContentLoaded" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "firstContentfulPaint" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "timeToInteractive" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagePerformance_pkey" PRIMARY KEY ("id")
);

-- Feature Adoption Tracking
CREATE TABLE "FeatureAdoption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "firstUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successfulUses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeatureAdoption_pkey" PRIMARY KEY ("id")
);

-- Onboarding Progress
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "stepsCompleted" INTEGER[],
    "totalSteps" INTEGER NOT NULL DEFAULT 10,
    "completionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0, -- in seconds
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- Error Tracking
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorStack" TEXT,
    "page" TEXT,
    "feature" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'error', -- info, warning, error, critical
    "metadata" TEXT, -- JSON string
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- Error Alerts
CREATE TABLE "ErrorAlert" (
    "id" TEXT NOT NULL,
    "errorLogId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    "status" TEXT NOT NULL DEFAULT 'open', -- open, acknowledged, resolved
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ErrorAlert_pkey" PRIMARY KEY ("id")
);

-- User Feedback
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL, -- feedback, rating, survey, bug_report, feature_request
    "content" TEXT NOT NULL,
    "rating" INTEGER, -- 1-5 star rating
    "page" TEXT,
    "feature" TEXT,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    "sentiment" TEXT, -- positive, neutral, negative
    "sentimentScore" DECIMAL(3,2), -- -1.0 to 1.0
    "metadata" TEXT, -- JSON string
    "status" TEXT NOT NULL DEFAULT 'open', -- open, reviewed, resolved, closed
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- A/B Testing Framework
CREATE TABLE "ABTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hypothesis" TEXT,
    "variants" TEXT NOT NULL, -- JSON array of variants with percentages
    "targetAudience" TEXT, -- JSON criteria for target audience
    "successMetrics" TEXT, -- JSON array of success metrics
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ABTest_pkey" PRIMARY KEY ("id")
);

-- A/B Test Assignments
CREATE TABLE "ABTestAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ABTestAssignment_pkey" PRIMARY KEY ("id")
);

-- A/B Test Conversions
CREATE TABLE "ABTestConversion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "metadata" TEXT, -- JSON string
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ABTestConversion_pkey" PRIMARY KEY ("id")
);

-- Customer Satisfaction Surveys
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" TEXT NOT NULL, -- JSON array of questions
    "targetAudience" TEXT, -- JSON criteria for target audience
    "triggerConditions" TEXT, -- JSON conditions for when to show survey
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "totalResponses" INTEGER NOT NULL DEFAULT 0,
    "npsScore" INTEGER, -- Net Promoter Score
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- Survey Responses
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "surveyId" TEXT NOT NULL,
    "responses" TEXT NOT NULL, -- JSON object with question_id: answer
    "npsScore" INTEGER, -- 0-10 NPS score if applicable
    "metadata" TEXT, -- JSON string
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- Support Tickets
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    "category" TEXT NOT NULL DEFAULT 'general', -- general, technical, billing, feature_request
    "status" TEXT NOT NULL DEFAULT 'open', -- open, in_progress, waiting_customer, resolved, closed
    "source" TEXT NOT NULL DEFAULT 'manual', -- manual, feedback, survey, error
    "assignedTo" TEXT,
    "attachments" TEXT, -- JSON array of file paths
    "metadata" TEXT, -- JSON string
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- Ticket Responses
CREATE TABLE "TicketResponse" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT, -- JSON array of file paths
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketResponse_pkey" PRIMARY KEY ("id")
);

-- Feedback Reports
CREATE TABLE "FeedbackReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL, -- weekly, monthly, quarterly
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reportData" TEXT NOT NULL, -- JSON report data
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "FeedbackReport_pkey" PRIMARY KEY ("id")
);

-- Performance Monitoring
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DECIMAL(10,4) NOT NULL,
    "metricUnit" TEXT NOT NULL, -- ms, percent, count, etc.
    "page" TEXT,
    "feature" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT, -- JSON string

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- Performance Alerts
CREATE TABLE "PerformanceAlert" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL, -- threshold_exceeded, performance_degradation, error_spike
    "metricName" TEXT NOT NULL,
    "threshold" DECIMAL(10,4) NOT NULL,
    "actualValue" DECIMAL(10,4) NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open', -- open, acknowledged, resolved
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PerformanceAlert_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX "UserEvent_userId_idx" ON "UserEvent"("userId");
CREATE INDEX "UserEvent_companyId_idx" ON "UserEvent"("companyId");
CREATE INDEX "UserEvent_eventType_idx" ON "UserEvent"("eventType");
CREATE INDEX "UserEvent_timestamp_idx" ON "UserEvent"("timestamp");
CREATE INDEX "UserEvent_page_idx" ON "UserEvent"("page");
CREATE INDEX "UserEvent_feature_idx" ON "UserEvent"("feature");

CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_sessionId_idx" ON "UserSession"("sessionId");

CREATE INDEX "PagePerformance_userId_idx" ON "PagePerformance"("userId");
CREATE INDEX "PagePerformance_page_idx" ON "PagePerformance"("page");
CREATE INDEX "PagePerformance_timestamp_idx" ON "PagePerformance"("timestamp");

CREATE INDEX "FeatureAdoption_userId_idx" ON "FeatureAdoption"("userId");
CREATE INDEX "FeatureAdoption_feature_idx" ON "FeatureAdoption"("feature");
CREATE UNIQUE INDEX "FeatureAdoption_userId_feature_key" ON "FeatureAdoption"("userId", "feature");

CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");

CREATE INDEX "ErrorLog_userId_idx" ON "ErrorLog"("userId");
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");
CREATE INDEX "ErrorLog_timestamp_idx" ON "ErrorLog"("timestamp");
CREATE INDEX "ErrorLog_status_idx" ON "ErrorLog"("status");

CREATE INDEX "ErrorAlert_errorLogId_idx" ON "ErrorAlert"("errorLogId");
CREATE INDEX "ErrorAlert_severity_idx" ON "ErrorAlert"("severity");
CREATE INDEX "ErrorAlert_status_idx" ON "ErrorAlert"("status");

CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");
CREATE INDEX "UserFeedback_type_idx" ON "UserFeedback"("type");
CREATE INDEX "UserFeedback_createdAt_idx" ON "UserFeedback"("createdAt");
CREATE INDEX "UserFeedback_status_idx" ON "UserFeedback"("status");

CREATE INDEX "ABTest_name_idx" ON "ABTest"("name");
CREATE INDEX "ABTest_isActive_idx" ON "ABTest"("isActive");

CREATE INDEX "ABTestAssignment_userId_idx" ON "ABTestAssignment"("userId");
CREATE INDEX "ABTestAssignment_testName_idx" ON "ABTestAssignment"("testName");
CREATE UNIQUE INDEX "ABTestAssignment_userId_testName_key" ON "ABTestAssignment"("userId", "testName");

CREATE INDEX "ABTestConversion_assignmentId_idx" ON "ABTestConversion"("assignmentId");
CREATE INDEX "ABTestConversion_eventType_idx" ON "ABTestConversion"("eventType");

CREATE INDEX "Survey_isActive_idx" ON "Survey"("isActive");
CREATE INDEX "Survey_validFrom_idx" ON "Survey"("validFrom");
CREATE INDEX "Survey_validTo_idx" ON "Survey"("validTo");

CREATE INDEX "SurveyResponse_userId_idx" ON "SurveyResponse"("userId");
CREATE INDEX "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");
CREATE INDEX "SurveyResponse_submittedAt_idx" ON "SurveyResponse"("submittedAt");

CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX "SupportTicket_ticketNumber_idx" ON "SupportTicket"("ticketNumber");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE INDEX "TicketResponse_ticketId_idx" ON "TicketResponse"("ticketId");
CREATE INDEX "TicketResponse_responderId_idx" ON "TicketResponse"("responderId");

CREATE INDEX "FeedbackReport_companyId_idx" ON "FeedbackReport"("companyId");
CREATE INDEX "FeedbackReport_reportType_idx" ON "FeedbackReport"("reportType");
CREATE INDEX "FeedbackReport_periodStart_idx" ON "FeedbackReport"("periodStart");

CREATE INDEX "PerformanceMetric_metricName_idx" ON "PerformanceMetric"("metricName");
CREATE INDEX "PerformanceMetric_timestamp_idx" ON "PerformanceMetric"("timestamp");
CREATE INDEX "PerformanceMetric_page_idx" ON "PerformanceMetric"("page");

CREATE INDEX "PerformanceAlert_alertType_idx" ON "PerformanceAlert"("alertType");
CREATE INDEX "PerformanceAlert_severity_idx" ON "PerformanceAlert"("severity");
CREATE INDEX "PerformanceAlert_status_idx" ON "PerformanceAlert"("status");

-- Add foreign key constraints
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PagePerformance" ADD CONSTRAINT "PagePerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureAdoption" ADD CONSTRAINT "FeatureAdoption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ErrorAlert" ADD CONSTRAINT "ErrorAlert_errorLogId_fkey" FOREIGN KEY ("errorLogId") REFERENCES "ErrorLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ABTestAssignment" ADD CONSTRAINT "ABTestAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ABTestConversion" ADD CONSTRAINT "ABTestConversion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ABTestAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketResponse" ADD CONSTRAINT "TicketResponse_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketResponse" ADD CONSTRAINT "TicketResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; 