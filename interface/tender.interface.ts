import { ScrapingProvider } from "@prisma/client";

export interface ScrapedTenderData {
	tenderId: string;
	tenderRefNo: string;
	version: number;
	isLatest?: boolean;
	tenderValue?: number;
	tenderType?: string;
	workDescription: string;
	contractDate?: string;
	completionInfo?: string;
	preBidMeetingDate?: string;
	preBidMeetingAddress?: string;
	preBidMeetingPlace?: string;
	periodOfWork?: string;
	organisationChain: string;
	organisation: string;
	tenderInvitingAuthorityName?: string;
	tenderInvitingAuthorityAddress?: string;
	emdAmount?: number;
	emdFeeType?: string;
	emdExceptionAllowed: boolean;
	emdPercentage?: number;
	emdPayableTo?: string;
	emdPayableAt?: string;
	principal?: string;
	location?: string;
	pincode?: string;
	publishedDate: string;
	bidOpeningDate?: string;
	bidSubmissionStartDate?: string;
	bidSubmissionEndDate?: string;
	isSuretyBondAllowed: boolean;
	sourceOfTender?: string;
	compressedTenderDocumentsURI?: string;
	// CPP-specific additions
	selectedBidders?: string[];
	numberOfBidsReceived?: number;
	numberOfBidderSelected?: number;
	selectedBiddersAddress?: string;
	selectedBiddersCsv?: string;
	provider: ScrapingProvider;
	sourceUrl: string;
	scrapedAt: Date;
	dataHash: string;
	sessionId?: string;
}
