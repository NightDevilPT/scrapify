-- CreateEnum
CREATE TYPE "ScrapingProvider" AS ENUM ('EPROCURE', 'GEM', 'CPP_PORTAL', 'CUSTOM');

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapingSession_provider_idx" ON "ScrapingSession"("provider");

-- CreateIndex
CREATE INDEX "ScrapingSession_status_idx" ON "ScrapingSession"("status");

-- CreateIndex
CREATE INDEX "ScrapingSession_startedAt_idx" ON "ScrapingSession"("startedAt");

-- CreateIndex
CREATE INDEX "ScrapingSession_lastActivityAt_idx" ON "ScrapingSession"("lastActivityAt");
