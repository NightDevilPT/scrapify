// app/api/scrape/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ScraperFactory } from "@/lib/scraper/scraper-factory";
import { ScrapingProvider } from "@prisma/client";
import { ScraperProviderURL } from "@/interface/active-scraper-session.interface";
import { ApiResponse } from "@/interface/api.interface";

export async function POST(request: NextRequest) {
	try {
		const { provider } = await request.json();

		if (!provider) {
			const response: ApiResponse<null> = {
				success: false,
				data: null,
				message: "Validation failed",
				error: "Provider is required",
			};
			return NextResponse.json(response, { status: 400 });
		}

		// Create scraper based on provider
		const scraper = ScraperFactory.createScraper(
			provider as ScrapingProvider
		);

		// Get the URL for the provider
		const providerUrl = ScraperProviderURL[provider as ScrapingProvider];
		if (!providerUrl) {
			const response: ApiResponse<null> = {
				success: false,
				data: null,
				message: "Configuration error",
				error: `No URL configured for provider: ${provider}`,
			};
			return NextResponse.json(response, { status: 400 });
		}

		// Execute scraping
		const result = await scraper.getOrganizations(providerUrl);

		if (result === null) {
			const response: ApiResponse<null> = {
				success: false,
				data: null,
				message: "Scraping failed",
				error: "Failed to scrape organizations data",
			};
			return NextResponse.json(response, { status: 500 });
		}

		const response: ApiResponse<typeof result> = {
			success: true,
			data: result,
			message: `Successfully scraped ${result.length} organizations`,
			error: null,
		};

		return NextResponse.json(response);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		const response: ApiResponse<null> = {
			success: false,
			data: null,
			message: "Scraping failed",
			error: errorMessage,
		};

		return NextResponse.json(response, { status: 500 });
	}
}
