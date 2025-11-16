-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "completionInfo" TEXT,
ADD COLUMN     "contractDate" TEXT,
ADD COLUMN     "numberOfBidderSelected" INTEGER,
ADD COLUMN     "numberOfBidsReceived" INTEGER,
ADD COLUMN     "selectedBiddersAddress" TEXT,
ADD COLUMN     "selectedBiddersCsv" TEXT,
ADD COLUMN     "tenderType" TEXT;
