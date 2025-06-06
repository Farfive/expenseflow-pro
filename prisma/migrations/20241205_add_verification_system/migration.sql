-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ValidationRuleType" AS ENUM ('REQUIRED', 'FORMAT', 'RANGE', 'PATTERN');

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "validationRules" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationRule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "fieldId" TEXT,
    "ruleType" "ValidationRuleType" NOT NULL,
    "ruleValue" JSONB,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCorrection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "corrections" JSONB NOT NULL,
    "confidence" DECIMAL(3,2),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleValue" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVerificationSession" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "DocumentPriority" NOT NULL DEFAULT 'MEDIUM',
    "qualityScore" INTEGER,
    "confidenceScore" DECIMAL(3,2),
    "extractedFields" INTEGER,
    "completedFields" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVerificationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldSuggestion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldSuggestion_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX "DocumentTemplate_companyId_idx" ON "DocumentTemplate"("companyId");
CREATE INDEX "DocumentTemplate_documentType_idx" ON "DocumentTemplate"("documentType");
CREATE INDEX "TemplateField_templateId_idx" ON "TemplateField"("templateId");
CREATE INDEX "ValidationRule_templateId_idx" ON "ValidationRule"("templateId");
CREATE INDEX "ValidationRule_fieldId_idx" ON "ValidationRule"("fieldId");
CREATE INDEX "VerificationCorrection_documentId_idx" ON "VerificationCorrection"("documentId");
CREATE INDEX "VerificationCorrection_userId_idx" ON "VerificationCorrection"("userId");
CREATE INDEX "BusinessRule_companyId_idx" ON "BusinessRule"("companyId");
CREATE INDEX "DocumentVerificationSession_documentId_idx" ON "DocumentVerificationSession"("documentId");
CREATE INDEX "DocumentVerificationSession_userId_idx" ON "DocumentVerificationSession"("userId");
CREATE INDEX "DocumentVerificationSession_status_idx" ON "DocumentVerificationSession"("status");
CREATE INDEX "FieldSuggestion_companyId_fieldType_idx" ON "FieldSuggestion"("companyId", "fieldType");
CREATE INDEX "FieldSuggestion_frequency_idx" ON "FieldSuggestion"("frequency" DESC);

-- Add foreign key constraints
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationRule" ADD CONSTRAINT "ValidationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationCorrection" ADD CONSTRAINT "VerificationCorrection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationCorrection" ADD CONSTRAINT "VerificationCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVerificationSession" ADD CONSTRAINT "DocumentVerificationSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVerificationSession" ADD CONSTRAINT "DocumentVerificationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldSuggestion" ADD CONSTRAINT "FieldSuggestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE; 