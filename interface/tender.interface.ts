import { ScrapingProvider } from "@prisma/client";

export interface ScrapedTenderData {
	tenderId: string;
	tenderRefNo: string;
	version: number;
	isLatest?: boolean;
	tenderValue?: number;
	workDescription: string;
	preBidMeetingDate?: Date;
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
	publishedDate: Date;
	bidOpeningDate?: Date;
	bidSubmissionStartDate?: Date;
	bidSubmissionEndDate?: Date;
	isSuretyBondAllowed: boolean;
	sourceOfTender?: string;
	compressedTenderDocumentsURI?: string;
	provider: ScrapingProvider;
	sourceUrl: string;
	scrapedAt: Date;
	dataHash: string;
	sessionId?: string;
}
