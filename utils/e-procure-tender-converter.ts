import { ScrapedTenderData } from "@/interface/tender.interface";
import { TenderDetail } from "@/lib/scraper/providers/e-procure-scraper";
import { createHash } from "crypto";

/**
 * Converts EProcure tender data to ScrapedTender format compatible with Prisma schema
 * @param tenderDetail The tender detail object from EProcureScraper
 * @param sessionId Optional scraping session ID
 * @returns Formatted ScrapedTenderData object
 */
export function convertToScrapedTenderData(
	tenderDetail: TenderDetail,
	sessionId?: string
): ScrapedTenderData {
	// Extract basic tender information
	const {
		serialNumber,
		ePublishedDate,
		closingDate,
		openingDate,
		title,
		referenceNumber,
		organizationChain,
		tenderLink,
		detailedData,
	} = tenderDetail;

	// Parse dates safely
	const parseDate = (dateStr: string): Date | undefined => {
		try {
			const date = new Date(dateStr);
			return isNaN(date.getTime()) ? undefined : date;
		} catch {
			return undefined;
		}
	};

	// Extract organization name from chain
	const organisation = organizationChain.split("||").pop()?.trim() || "";

	// Extract detailed data fields
	const basicDetails = detailedData?.basicDetails || {};
	const tenderFeeDetails = detailedData?.tenderFeeDetails || {};
	const emdFeeDetails = detailedData?.emdFeeDetails || {};
	const workItemDetails = detailedData?.workItemDetails || {};
	const criticalDates = detailedData?.criticalDates || {};
	const tenderInvitingAuthority = detailedData?.tenderInvitingAuthority || {};

	// Generate data hash for deduplication
	const dataString = JSON.stringify({
		serialNumber,
		referenceNumber,
		title,
		organizationChain,
		detailedData,
	});
	const dataHash = createHash("md5").update(dataString).digest("hex");

	// Map to ScrapedTender schema
	const scrapedTender: ScrapedTenderData = {
		tenderId: basicDetails?.tenderId,
		tenderRefNo: basicDetails?.tenderReferenceNumber,
		version: 1,
		isLatest: true,
		tenderValue: parseFloat(basicDetails.tenderValue || "0") || undefined,
		workDescription: workItemDetails.workDescription || title,
		preBidMeetingDate: parseDate(criticalDates.preBidMeetingDate || ""),
		preBidMeetingAddress:
			tenderInvitingAuthority.address ||
			tenderInvitingAuthority.preBidMeetingAddress,
		preBidMeetingPlace: tenderInvitingAuthority.preBidMeetingPlace,
		periodOfWork: workItemDetails.contractPeriod,
		organisationChain: organizationChain,
		organisation,
		tenderInvitingAuthorityName: tenderInvitingAuthority.name,
		tenderInvitingAuthorityAddress: tenderInvitingAuthority.address,
		emdAmount: parseFloat(emdFeeDetails.emdAmount || "0") || undefined,
		emdFeeType: emdFeeDetails.emdFeeType,
		emdExceptionAllowed: emdFeeDetails.emdExemptionAllowed === "Yes",
		emdPercentage:
			parseFloat(emdFeeDetails.emdPercentage || "0") || undefined,
		emdPayableTo: emdFeeDetails.emdPayableTo,
		emdPayableAt: emdFeeDetails.emdPayableAt,
		principal: basicDetails.principal,
		location: workItemDetails.location,
		pincode: workItemDetails.pincode,
		publishedDate: parseDate(ePublishedDate) || new Date(),
		bidOpeningDate: parseDate(openingDate),
		bidSubmissionStartDate: parseDate(
			criticalDates.bidSubmissionStartDate || ""
		),
		bidSubmissionEndDate: parseDate(closingDate),
		isSuretyBondAllowed: false, // Not available in eProcure data
		sourceOfTender: basicDetails.sourceOfTender,
		compressedTenderDocumentsURI: undefined, // Not available in eProcure data
		provider: "EPROCURE",
		sourceUrl: tenderLink,
		scrapedAt: new Date(),
		dataHash,
		sessionId,
	};

	return scrapedTender;
}
