-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "selectedBidders" TEXT[] DEFAULT ARRAY[]::TEXT[];
