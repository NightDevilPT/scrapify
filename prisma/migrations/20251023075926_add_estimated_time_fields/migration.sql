-- AlterTable
ALTER TABLE "ScrapingSession" ADD COLUMN     "estimatedCompletionTime" TIMESTAMP(3),
ADD COLUMN     "estimatedTimeRemaining" INTEGER,
ADD COLUMN     "estimatedTimeRemainingFormatted" TEXT,
ADD COLUMN     "scrapingRate" DOUBLE PRECISION,
ADD COLUMN     "timePerTender" INTEGER;
