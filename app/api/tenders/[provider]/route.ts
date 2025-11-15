// app/api/tenders/[provider]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, ScrapingProvider, Tender } from "@prisma/client";
import { tenderService } from "@/lib/tender-service/tender.service";

const prisma = new PrismaClient();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> }
) {
	try {
		const provider = (await params).provider;

		if (!provider) {
			return NextResponse.json(
				{
					success: false,
					data: null,
					message: "Provider is required",
					error: "MISSING_PROVIDER",
				},
				{ status: 400 }
			);
		}

		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const allRecords = searchParams.get("all") === "true" || !searchParams.get("page");
		
		// Get total count
		const totalCount = await tenderService.getTenderCount({
			provider: provider.toUpperCase() as ScrapingProvider,
		});

		let tenders: Tender[];
		
		if (allRecords) {
			// Fetch all tenders without pagination - explicitly don't pass limit/offset
			tenders = await tenderService.getAllTenders({
				provider: provider.toUpperCase() as ScrapingProvider,
				// Don't pass limit or offset to get all records
			});
			
			console.log(`[API] Fetched all records for ${provider}: ${tenders.length} out of ${totalCount} total`);
			
			return NextResponse.json({
				success: true,
				data: tenders,
				totalCount,
				message: `Fetched ${tenders.length} tenders for ${provider}`,
				error: null,
			});
		} else {
			// Fetch with pagination (for backward compatibility)
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "10", 10);
			const offset = (page - 1) * limit;
			
			tenders = await tenderService.getAllTenders({
				provider: provider.toUpperCase() as ScrapingProvider,
				limit,
				offset,
			});

			const totalPages = Math.ceil(totalCount / limit);

			return NextResponse.json({
				success: true,
				data: tenders,
				pagination: {
					page,
					limit,
					totalCount,
					totalPages,
					hasNextPage: page < totalPages,
					hasPreviousPage: page > 1,
				},
				message: `Fetched ${tenders.length} tenders for ${provider}`,
				error: null,
			});
		}
	} catch (error) {
		console.error("Error fetching tenders:", error);
		return NextResponse.json(
			{
				success: false,
				data: null,
				message: "Internal server error",
				error: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}

