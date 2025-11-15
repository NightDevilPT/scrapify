-- CreateEnum
CREATE TYPE "ScrapingProvider" AS ENUM ('EPROCURE', 'ETENDER', 'EPROCURE_CPPP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'STOPPED', 'PAUSED');

-- CreateTable
CREATE TABLE "ScrapingSession" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "provider" "ScrapingProvider" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "organizationsFound" INTEGER NOT NULL DEFAULT 0,
    "organizationsScraped" INTEGER NOT NULL DEFAULT 0,
    "tendersFound" INTEGER NOT NULL DEFAULT 0,
    "tenderScraped" INTEGER NOT NULL DEFAULT 0,
    "tendersSaved" INTEGER NOT NULL DEFAULT 0,
    "pagesNavigated" INTEGER NOT NULL DEFAULT 0,
    "pagesPerMinute" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentOrganization" TEXT,
    "currentStage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "errorMessage" TEXT,
    "estimatedCompletionTime" TIMESTAMP(3),
    "estimatedTimeRemaining" INTEGER,
    "estimatedTimeRemainingFormatted" TEXT,
    "scrapingRate" DOUBLE PRECISION,
    "timePerTender" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "tenderRefNo" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "tenderValue" DOUBLE PRECISION,
    "workDescription" TEXT NOT NULL,
    "preBidMeetingDate" TIMESTAMP(3),
    "preBidMeetingAddress" TEXT,
    "preBidMeetingPlace" TEXT,
    "periodOfWork" TEXT,
    "organisationChain" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "tenderInvitingAuthorityName" TEXT,
    "tenderInvitingAuthorityAddress" TEXT,
    "emdAmount" DOUBLE PRECISION,
    "emdFeeType" TEXT,
    "emdExceptionAllowed" BOOLEAN NOT NULL DEFAULT false,
    "emdPercentage" DOUBLE PRECISION,
    "emdPayableTo" TEXT,
    "emdPayableAt" TEXT,
    "principal" TEXT,
    "location" TEXT,
    "pincode" TEXT,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "bidOpeningDate" TIMESTAMP(3),
    "bidSubmissionStartDate" TIMESTAMP(3),
    "bidSubmissionEndDate" TIMESTAMP(3),
    "isSuretyBondAllowed" BOOLEAN NOT NULL DEFAULT false,
    "sourceOfTender" TEXT,
    "compressedTenderDocumentsURI" TEXT,
    "provider" "ScrapingProvider" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "dataHash" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapingSession_provider_idx" ON "ScrapingSession"("provider");

-- CreateIndex
CREATE INDEX "ScrapingSession_status_idx" ON "ScrapingSession"("status");

-- CreateIndex
CREATE INDEX "ScrapingSession_startedAt_idx" ON "ScrapingSession"("startedAt");

-- CreateIndex
CREATE INDEX "ScrapingSession_lastActivityAt_idx" ON "ScrapingSession"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Tender_tenderId_idx" ON "Tender"("tenderId");

-- CreateIndex
CREATE INDEX "Tender_tenderRefNo_idx" ON "Tender"("tenderRefNo");

-- CreateIndex
CREATE INDEX "Tender_tenderId_tenderRefNo_isLatest_idx" ON "Tender"("tenderId", "tenderRefNo", "isLatest");

-- CreateIndex
CREATE INDEX "Tender_isLatest_idx" ON "Tender"("isLatest");

-- CreateIndex
CREATE INDEX "Tender_provider_idx" ON "Tender"("provider");

-- CreateIndex
CREATE INDEX "Tender_sessionId_idx" ON "Tender"("sessionId");

-- CreateIndex
CREATE INDEX "Tender_scrapedAt_idx" ON "Tender"("scrapedAt");

-- CreateIndex
CREATE INDEX "Tender_createdAt_idx" ON "Tender"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_tenderId_tenderRefNo_version_key" ON "Tender"("tenderId", "tenderRefNo", "version");

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScrapingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
