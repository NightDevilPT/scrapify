import { NextResponse } from "next/server";
import prisma from "@/lib/prisma-service/prisma.service";
import { ScrapingProvider } from "@prisma/client";

// In some Next.js versions, dynamic route params are provided as a Promise and must be awaited.
export async function GET(
	req: Request,
	ctx: { params: Promise<{ provider: string }> } | { params: { provider: string } }
) {
	try {
		const { searchParams } = new URL(req.url);
		const all = searchParams.get("all") === "true";
		const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
		const pageSize = Math.max(1, Math.min(500, parseInt(searchParams.get("pageSize") || "20", 10)));
		const since = searchParams.get("since"); // optional ISO date
		// Resolve dynamic params across Next.js versions
		const resolvedParams =
			"then" in (ctx as any).params ? await (ctx as any).params : (ctx as any).params;
		const providerParam = (resolvedParams?.provider || "").toUpperCase();
		// Validate provider (fallback: no filter if invalid)
		const providerFilter = Object.values(ScrapingProvider).includes(providerParam as ScrapingProvider)
			? (providerParam as ScrapingProvider)
			: undefined;

		const whereClause: any = {};
		if (providerFilter) {
			whereClause.provider = providerFilter;
		}
		if (since) {
			const sinceDate = new Date(since);
			if (!isNaN(sinceDate.getTime())) {
				whereClause.scrapedAt = { gte: sinceDate };
			}
		}

		const totalCount = await prisma.tender.count({ where: whereClause });

		if (all) {
			const data = await prisma.tender.findMany({
				where: whereClause,
				orderBy: { scrapedAt: "desc" },
			});
			return NextResponse.json({ success: true, data, totalCount });
		}

		// Paginated response
		const data = await prisma.tender.findMany({
			where: whereClause,
			orderBy: { scrapedAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
		});
		const totalPages = Math.ceil(totalCount / pageSize);

		return NextResponse.json({
			success: true,
			data,
			totalCount,
			page,
			pageSize,
			totalPages,
		});
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error?.message || "Failed to fetch tenders" },
			{ status: 500 }
		);
	}
}
