// lib/tender-service/tender.service.ts
import { PrismaClient, Tender } from "@prisma/client";
import { ScrapedTenderData } from "@/interface/tender.interface";
import { prisma } from "@/lib/prisma-service/prisma.service";
import { LoggerService } from "@/lib/logger-service/logger.service";

// Use global to persist across serverless functions (development only)
declare global {
	var _tenderService: TenderService | undefined;
}

class TenderService {
	private static instance: TenderService;
	private logger: LoggerService;

	private constructor() {
		this.logger = LoggerService.getInstance();
		this.logger.setContext(TenderService.name);
	}

	public static getInstance(): TenderService {
		// In development, use global to persist across hot reloads
		if (process.env.NODE_ENV === "development") {
			if (!global._tenderService) {
				global._tenderService = new TenderService();
			}
			return global._tenderService;
		}

		// In production, use singleton pattern
		if (!TenderService.instance) {
			TenderService.instance = new TenderService();
		}
		return TenderService.instance;
	}

	/**
	 * Check if tender already exists in database
	 * Returns the latest version if exists, null otherwise
	 */
	private async checkIfTenderExists(
		tenderId: string,
		tenderRefNo: string
	): Promise<Tender | null> {
		try {
			const existingTender = await prisma.tender.findFirst({
				where: {
					tenderId,
					tenderRefNo,
					isLatest: true,
				},
				orderBy: {
					version: "desc",
				},
			});

			return existingTender;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(
				`Error checking if tender exists: ${errorMessage}`
			);
			return null;
		}
	}

	/**
	 * Compare two tender data objects excluding metadata fields
	 * Only compares actual tender data fields, NOT: createdAt, scrapedAt, updatedAt, version, isLatest, id, sessionId, dataHash
	 * Returns true if data has changed, false if identical
	 */
	private compareTenderData(
		existing: Tender,
		newData: ScrapedTenderData
	): boolean {
		try {
			this.logger.info(`[COMPARISON] Starting comparison for tender ${newData.tenderId} (${newData.tenderRefNo}) - existing version: ${existing.version}, isLatest: ${existing.isLatest}`);
			
			// Helper to normalize values for comparison
			const normalizeForComparison = (value: any): any => {
				// Handle null/undefined
				if (value === null || value === undefined) return undefined;
				
				// Handle Date objects - convert to ISO string for comparison
				if (value instanceof Date) {
					return value.toISOString();
				}
				
				// Handle strings - trim and normalize "NA" values
				if (typeof value === "string") {
					const trimmed = value.trim();
					if (trimmed === "" || trimmed.toLowerCase() === "na" || trimmed === "N/A") {
						return undefined;
					}
					return trimmed;
				}
				
				// Handle numbers - ensure consistent type
				if (typeof value === "number") {
					return value;
				}
				
				// Handle booleans
				if (typeof value === "boolean") {
					return value;
				}
				
				return value;
			};

			// Define ONLY the fields we want to compare (whitelist approach)
			// These are the actual tender data fields, excluding all metadata
			const fieldsToCompare = [
				"tenderId",
				"tenderRefNo",
				"tenderValue",
				"tenderType",
				"workDescription",
				"contractDate",
				"completionInfo",
				"preBidMeetingDate",
				"preBidMeetingAddress",
				"preBidMeetingPlace",
				"periodOfWork",
				"organisationChain",
				"organisation",
				"tenderInvitingAuthorityName",
				"tenderInvitingAuthorityAddress",
				"emdAmount",
				"emdFeeType",
				"emdExceptionAllowed",
				"emdPercentage",
				"emdPayableTo",
				"emdPayableAt",
				"principal",
				"location",
				"pincode",
				"publishedDate",
				"bidOpeningDate",
				"bidSubmissionStartDate",
				"bidSubmissionEndDate",
				"isSuretyBondAllowed",
				"sourceOfTender",
				"compressedTenderDocumentsURI",
				"selectedBidders",
				"numberOfBidsReceived",
				"numberOfBidderSelected",
				"selectedBiddersAddress",
				"selectedBiddersCsv",
				"provider",
				"sourceUrl",
			];

			// Compare each field explicitly
			for (const key of fieldsToCompare) {
				const existingValue = existing[key as keyof Tender];
				const newValue = newData[key as keyof ScrapedTenderData];

				// Normalize both values
				const normalizedExisting = normalizeForComparison(existingValue);
				const normalizedNew = normalizeForComparison(newValue);

				// Both are null/undefined - consider them equal
				if (
					(normalizedExisting === null || normalizedExisting === undefined) &&
					(normalizedNew === null || normalizedNew === undefined)
				) {
					continue; // Both are null/undefined, skip comparison
				}

				// One is null/undefined, other is not - data changed
				if (
					(normalizedExisting === null || normalizedExisting === undefined) !==
					(normalizedNew === null || normalizedNew === undefined)
				) {
					this.logger.info(`[COMPARISON] Field '${key}' changed (null/undefined mismatch): existing='${existingValue}' (${typeof existingValue}) -> new='${newValue}' (${typeof newValue})`);
					return true; // Data changed (one is null, other is not)
				}
				
				// Both have values - compare them
				// First try strict equality
				if (normalizedExisting === normalizedNew) {
					continue; // Values are equal, move to next field
				}
				
				// Values are different - check if it's just a type mismatch
				// Convert to strings for comparison (handles number vs string, etc.)
				const existingStr = String(normalizedExisting);
				const newStr = String(normalizedNew);
				
				if (existingStr === newStr) {
					// Same value, different type - consider equal (e.g., 100000 vs "100000")
					continue;
				}
				
				// Values are actually different
				this.logger.info(`[COMPARISON] Field '${key}' changed: existing='${existingStr}' (type: ${typeof normalizedExisting}, original: ${JSON.stringify(existingValue)}) -> new='${newStr}' (type: ${typeof normalizedNew}, original: ${JSON.stringify(newValue)})`);
				return true; // Data changed
			}

			this.logger.info(`[COMPARISON] No changes detected for tender ${newData.tenderId}`);
			return false; // No changes detected
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error comparing tender data: ${errorMessage}`);
			// If comparison fails, assume data has changed to be safe
			return true;
		}
	}

	/**
	 * Save tender to database with versioning support
	 * If tender exists and data changed, creates new version
	 * If tender exists and data unchanged, returns existing tender
	 * If tender doesn't exist, creates new tender with version 1
	 */
	public async saveTender(
		tenderData: ScrapedTenderData
	): Promise<{ tender: Tender; isNew: boolean; isUpdated: boolean }> {
		try {
			// Check if tender already exists
			const existingTender = await this.checkIfTenderExists(
				tenderData.tenderId,
				tenderData.tenderRefNo
			);

			// If tender doesn't exist, create new one
			if (!existingTender) {
				this.logger.info(
					`Creating new tender: ${tenderData.tenderId} (${tenderData.tenderRefNo})`
				);

				const newTender = await prisma.tender.create({
					data: {
						tenderId: tenderData.tenderId,
						tenderRefNo: tenderData.tenderRefNo,
						version: 1,
						isLatest: true,
						tenderValue: tenderData.tenderValue,
						tenderType: tenderData.tenderType,
						workDescription: tenderData.workDescription,
						contractDate: tenderData.contractDate,
						completionInfo: tenderData.completionInfo,
						preBidMeetingDate: tenderData.preBidMeetingDate,
						preBidMeetingAddress: tenderData.preBidMeetingAddress,
						preBidMeetingPlace: tenderData.preBidMeetingPlace,
						periodOfWork: tenderData.periodOfWork,
						organisationChain: tenderData.organisationChain,
						organisation: tenderData.organisation,
						tenderInvitingAuthorityName:
							tenderData.tenderInvitingAuthorityName,
						tenderInvitingAuthorityAddress:
							tenderData.tenderInvitingAuthorityAddress,
						emdAmount: tenderData.emdAmount,
						emdFeeType: tenderData.emdFeeType,
						emdExceptionAllowed: tenderData.emdExceptionAllowed,
						emdPercentage: tenderData.emdPercentage,
						emdPayableTo: tenderData.emdPayableTo,
						emdPayableAt: tenderData.emdPayableAt,
						principal: tenderData.principal,
						location: tenderData.location,
						pincode: tenderData.pincode,
						publishedDate: tenderData.publishedDate,
						bidOpeningDate: tenderData.bidOpeningDate,
						bidSubmissionStartDate: tenderData.bidSubmissionStartDate,
						bidSubmissionEndDate: tenderData.bidSubmissionEndDate,
						isSuretyBondAllowed: tenderData.isSuretyBondAllowed,
						sourceOfTender: tenderData.sourceOfTender,
						compressedTenderDocumentsURI:
							tenderData.compressedTenderDocumentsURI,
						selectedBidders: tenderData.selectedBidders,
						numberOfBidsReceived: tenderData.numberOfBidsReceived,
						numberOfBidderSelected: tenderData.numberOfBidderSelected,
						selectedBiddersAddress: tenderData.selectedBiddersAddress,
						selectedBiddersCsv: tenderData.selectedBiddersCsv,
						provider: tenderData.provider,
						sourceUrl: tenderData.sourceUrl,
						scrapedAt: tenderData.scrapedAt,
						dataHash: tenderData.dataHash,
						sessionId: tenderData.sessionId,
					},
				});

				this.logger.success(
					`Tender created successfully: ${newTender.id} (version ${newTender.version})`
				);

				return {
					tender: newTender,
					isNew: true,
					isUpdated: false,
				};
			}

			// Tender exists, check if data has changed
			const hasChanged = this.compareTenderData(existingTender, tenderData);

			// If data hasn't changed, return existing tender
			if (!hasChanged) {
				this.logger.info(
					`Tender unchanged, skipping save: ${tenderData.tenderId} (version ${existingTender.version})`
				);
				return {
					tender: existingTender,
					isNew: false,
					isUpdated: false,
				};
			}

			// Data has changed, create new version
			this.logger.info(
				`Tender data changed, creating new version: ${tenderData.tenderId} (current version: ${existingTender.version})`
			);

			// Use transaction to update old version and create new one atomically
			const result = await prisma.$transaction(async (tx) => {
				// Mark existing tender as not latest
				await tx.tender.update({
					where: {
						id: existingTender.id,
					},
					data: {
						isLatest: false,
					},
				});

				// Create new version
				const newVersion = existingTender.version + 1;
				const newTender = await tx.tender.create({
					data: {
						tenderId: tenderData.tenderId,
						tenderRefNo: tenderData.tenderRefNo,
						version: newVersion,
						isLatest: true,
						tenderValue: tenderData.tenderValue,
						tenderType: tenderData.tenderType,
						workDescription: tenderData.workDescription,
						contractDate: tenderData.contractDate,
						completionInfo: tenderData.completionInfo,
						preBidMeetingDate: tenderData.preBidMeetingDate,
						preBidMeetingAddress: tenderData.preBidMeetingAddress,
						preBidMeetingPlace: tenderData.preBidMeetingPlace,
						periodOfWork: tenderData.periodOfWork,
						organisationChain: tenderData.organisationChain,
						organisation: tenderData.organisation,
						tenderInvitingAuthorityName:
							tenderData.tenderInvitingAuthorityName,
						tenderInvitingAuthorityAddress:
							tenderData.tenderInvitingAuthorityAddress,
						emdAmount: tenderData.emdAmount,
						emdFeeType: tenderData.emdFeeType,
						emdExceptionAllowed: tenderData.emdExceptionAllowed,
						emdPercentage: tenderData.emdPercentage,
						emdPayableTo: tenderData.emdPayableTo,
						emdPayableAt: tenderData.emdPayableAt,
						principal: tenderData.principal,
						location: tenderData.location,
						pincode: tenderData.pincode,
						publishedDate: tenderData.publishedDate,
						bidOpeningDate: tenderData.bidOpeningDate,
						bidSubmissionStartDate: tenderData.bidSubmissionStartDate,
						bidSubmissionEndDate: tenderData.bidSubmissionEndDate,
						isSuretyBondAllowed: tenderData.isSuretyBondAllowed,
						sourceOfTender: tenderData.sourceOfTender,
						compressedTenderDocumentsURI:
							tenderData.compressedTenderDocumentsURI,
						selectedBidders: tenderData.selectedBidders,
						numberOfBidsReceived: tenderData.numberOfBidsReceived,
						numberOfBidderSelected: tenderData.numberOfBidderSelected,
						selectedBiddersAddress: tenderData.selectedBiddersAddress,
						selectedBiddersCsv: tenderData.selectedBiddersCsv,
						provider: tenderData.provider,
						sourceUrl: tenderData.sourceUrl,
						scrapedAt: tenderData.scrapedAt,
						dataHash: tenderData.dataHash,
						sessionId: tenderData.sessionId,
					},
				});

				return newTender;
			});

			this.logger.success(
				`Tender version updated: ${result.id} (version ${result.version})`
			);

			return {
				tender: result,
				isNew: false,
				isUpdated: true,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error saving tender: ${errorMessage}`);
			throw error;
		}
	}

	/**
	 * Get tender by ID (returns only latest version)
	 */
	public async getTender(tenderId: string): Promise<Tender | null> {
		try {
			const tender = await prisma.tender.findFirst({
				where: {
					tenderId,
					isLatest: true,
				},
				orderBy: {
					version: "desc",
				},
			});

			return tender;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error getting tender: ${errorMessage}`);
			return null;
		}
	}

	/**
	 * Get tender by tenderId and tenderRefNo (returns only latest version)
	 */
	public async getTenderByRef(
		tenderId: string,
		tenderRefNo: string
	): Promise<Tender | null> {
		try {
			const tender = await prisma.tender.findFirst({
				where: {
					tenderId,
					tenderRefNo,
					isLatest: true,
				},
				orderBy: {
					version: "desc",
				},
			});

			return tender;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error getting tender by ref: ${errorMessage}`);
			return null;
		}
	}

	/**
	 * Get all tenders (returns only latest versions)
	 */
	public async getAllTenders(
		options?: {
			provider?: string;
			sessionId?: string;
			limit?: number;
			offset?: number;
		}
	): Promise<Tender[]> {
		try {
			const where: any = {
				isLatest: true,
			};

			if (options?.provider) {
				where.provider = options.provider;
			}

			if (options?.sessionId) {
				where.sessionId = options.sessionId;
			}

			// Build query options
			const queryOptions: any = {
				where,
				orderBy: {
					createdAt: "desc",
				},
			};

			// Only apply limit and offset if they are explicitly provided
			// This ensures we get ALL records when limit is not specified
			if (options?.limit !== undefined && options.limit !== null) {
				queryOptions.take = options.limit;
			}
			
			if (options?.offset !== undefined && options.offset !== null) {
				queryOptions.skip = options.offset;
			}

			const tenders = await prisma.tender.findMany(queryOptions);

			this.logger.info(
				`Fetched ${tenders.length} tenders${options?.limit ? ` (limited to ${options.limit})` : " (all records)"} for provider: ${options?.provider || "all"}`
			);

			return tenders;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error getting all tenders: ${errorMessage}`);
			return [];
		}
	}

	/**
	 * Get tender version history (all versions of a tender)
	 */
	public async getTenderHistory(
		tenderId: string,
		tenderRefNo: string
	): Promise<Tender[]> {
		try {
			const tenders = await prisma.tender.findMany({
				where: {
					tenderId,
					tenderRefNo,
				},
				orderBy: {
					version: "desc",
				},
			});

			return tenders;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error getting tender history: ${errorMessage}`);
			return [];
		}
	}

	/**
	 * Get count of tenders (only latest versions)
	 */
	public async getTenderCount(
		filters?: {
			provider?: string;
			sessionId?: string;
		}
	): Promise<number> {
		try {
			const where: any = {
				isLatest: true,
			};

			if (filters?.provider) {
				where.provider = filters.provider;
			}

			if (filters?.sessionId) {
				where.sessionId = filters.sessionId;
			}

			const count = await prisma.tender.count({
				where,
			});

			return count;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error getting tender count: ${errorMessage}`);
			return 0;
		}
	}

	/**
	 * Delete tender (soft delete by marking isLatest as false)
	 * Or hard delete all versions
	 */
	public async deleteTender(
		tenderId: string,
		tenderRefNo: string,
		hardDelete: boolean = false
	): Promise<boolean> {
		try {
			if (hardDelete) {
				// Hard delete all versions
				await prisma.tender.deleteMany({
					where: {
						tenderId,
						tenderRefNo,
					},
				});
				this.logger.info(
					`Tender hard deleted: ${tenderId} (${tenderRefNo})`
				);
			} else {
				// Soft delete by marking latest as not latest
				await prisma.tender.updateMany({
					where: {
						tenderId,
						tenderRefNo,
						isLatest: true,
					},
					data: {
						isLatest: false,
					},
				});
				this.logger.info(
					`Tender soft deleted: ${tenderId} (${tenderRefNo})`
				);
			}

			return true;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error deleting tender: ${errorMessage}`);
			return false;
		}
	}
}

// Export singleton instance
export const tenderService = TenderService.getInstance();

