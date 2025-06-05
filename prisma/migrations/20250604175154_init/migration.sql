-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VENDOR', 'ADVOCATE', 'COLLECTIONS');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('IMMUNE', 'NEURO');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('SUBMITTED', 'ADVOCATE_REVIEW', 'QUALIFIED', 'SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'COLLECTIONS', 'KIT_COMPLETED', 'RETURNED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('MBI_DUPLICATE', 'COMPLIANCE_ISSUE', 'DATA_QUALITY');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AdvocateDisposition" AS ENUM ('DOESNT_QUALIFY', 'COMPLIANCE_ISSUE', 'PATIENT_DECLINED', 'CALL_BACK', 'CONNECTED_TO_COMPLIANCE', 'CALL_DROPPED', 'DUPE');

-- CreateEnum
CREATE TYPE "CollectionsDisposition" AS ENUM ('NO_ANSWER', 'SCHEDULED_CALLBACK', 'KIT_COMPLETED');

-- CreateEnum
CREATE TYPE "DoctorApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "FileUploadType" AS ENUM ('DOCTOR_APPROVAL', 'SHIPPING_REPORT', 'KIT_RETURN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vendorId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "staticCode" TEXT NOT NULL,
    "parentVendorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "mbi" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "subVendorId" TEXT,
    "vendorCode" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL,
    "testType" "TestType",
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "hasActiveAlerts" BOOLEAN NOT NULL DEFAULT false,
    "advocateId" TEXT,
    "advocateDisposition" "AdvocateDisposition",
    "advocateNotes" TEXT,
    "advocateReviewedAt" TIMESTAMP(3),
    "collectionsAgentId" TEXT,
    "collectionsDisposition" "CollectionsDisposition",
    "contactAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastContactAttempt" TIMESTAMP(3),
    "nextCallbackDate" TIMESTAMP(3),
    "collectionsNotes" TEXT,
    "doctorApprovalStatus" "DoctorApprovalStatus",
    "doctorApprovalDate" TIMESTAMP(3),
    "consultDate" TIMESTAMP(3),
    "kitShippedDate" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "kitReturnedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceChecklist" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "verifyDobAddress" BOOLEAN NOT NULL,
    "patientConsent" BOOLEAN NOT NULL,
    "notInCareFacility" BOOLEAN NOT NULL,
    "makesMedicalDecisions" BOOLEAN NOT NULL,
    "understandsBilling" BOOLEAN NOT NULL,
    "noCognitiveImpairment" BOOLEAN NOT NULL,
    "agentNotMedicare" BOOLEAN NOT NULL,
    "noIncentives" BOOLEAN NOT NULL,
    "futureContactConsent" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactAttempt" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "attemptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Callback" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Callback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "type" "FileUploadType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalLeads" INTEGER NOT NULL,
    "qualifiedLeads" INTEGER NOT NULL,
    "approvedLeads" INTEGER NOT NULL,
    "shippedKits" INTEGER NOT NULL,
    "completedKits" INTEGER NOT NULL,
    "immuneLeads" INTEGER NOT NULL,
    "neuroLeads" INTEGER NOT NULL,
    "conversionData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAlert" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "relatedLeadId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_staticCode_key" ON "Vendor"("staticCode");

-- CreateIndex
CREATE INDEX "Vendor_code_idx" ON "Vendor"("code");

-- CreateIndex
CREATE INDEX "Vendor_staticCode_idx" ON "Vendor"("staticCode");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_mbi_key" ON "Lead"("mbi");

-- CreateIndex
CREATE INDEX "Lead_mbi_idx" ON "Lead"("mbi");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_vendorId_idx" ON "Lead"("vendorId");

-- CreateIndex
CREATE INDEX "Lead_advocateId_idx" ON "Lead"("advocateId");

-- CreateIndex
CREATE INDEX "Lead_collectionsAgentId_idx" ON "Lead"("collectionsAgentId");

-- CreateIndex
CREATE INDEX "Lead_isDuplicate_idx" ON "Lead"("isDuplicate");

-- CreateIndex
CREATE INDEX "Lead_hasActiveAlerts_idx" ON "Lead"("hasActiveAlerts");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceChecklist_leadId_key" ON "ComplianceChecklist"("leadId");

-- CreateIndex
CREATE INDEX "ContactAttempt_leadId_idx" ON "ContactAttempt"("leadId");

-- CreateIndex
CREATE INDEX "ContactAttempt_agentId_idx" ON "ContactAttempt"("agentId");

-- CreateIndex
CREATE INDEX "Callback_scheduledDate_idx" ON "Callback"("scheduledDate");

-- CreateIndex
CREATE INDEX "Callback_agentId_idx" ON "Callback"("agentId");

-- CreateIndex
CREATE INDEX "FileUpload_type_idx" ON "FileUpload"("type");

-- CreateIndex
CREATE INDEX "FileUpload_uploadedAt_idx" ON "FileUpload"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_date_key" ON "DailyMetrics"("date");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_idx" ON "DailyMetrics"("date");

-- CreateIndex
CREATE INDEX "LeadAlert_leadId_idx" ON "LeadAlert"("leadId");

-- CreateIndex
CREATE INDEX "LeadAlert_type_idx" ON "LeadAlert"("type");

-- CreateIndex
CREATE INDEX "LeadAlert_severity_idx" ON "LeadAlert"("severity");

-- CreateIndex
CREATE INDEX "LeadAlert_isAcknowledged_idx" ON "LeadAlert"("isAcknowledged");

-- CreateIndex
CREATE INDEX "LeadAlert_createdAt_idx" ON "LeadAlert"("createdAt");

-- CreateIndex
CREATE INDEX "LeadAlert_relatedLeadId_idx" ON "LeadAlert"("relatedLeadId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_parentVendorId_fkey" FOREIGN KEY ("parentVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_advocateId_fkey" FOREIGN KEY ("advocateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_collectionsAgentId_fkey" FOREIGN KEY ("collectionsAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceChecklist" ADD CONSTRAINT "ComplianceChecklist_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAttempt" ADD CONSTRAINT "ContactAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAttempt" ADD CONSTRAINT "ContactAttempt_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Callback" ADD CONSTRAINT "Callback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Callback" ADD CONSTRAINT "Callback_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAlert" ADD CONSTRAINT "LeadAlert_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
