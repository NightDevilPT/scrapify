import { ScrapingProvider } from "@prisma/client";
import { ApiResponse } from "@/interface/api.interface";
import { NextRequest, NextResponse } from "next/server";
import { ScraperFactory } from "@/lib/scraper/scraper-factory";
import { sessionManager } from "@/lib/session-manager/session-manager.service";
import { ScraperProviderURL } from "@/interface/active-scraper-session.interface";

export async function POST(request: NextRequest) {
	try {
		const {
			provider,
			organizations,
			dateRange,
			isTenderPerOrganizationLimited,
			tendersPerOrganization,
		} = await request.json();

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
		const providerUrl =
			ScraperProviderURL[provider as ScrapingProvider].url;
		if (!providerUrl) {
			const response: ApiResponse<null> = {
				success: false,
				data: null,
				message: "Configuration error",
				error: `No URL configured for provider: ${provider}`,
			};
			return NextResponse.json(response, { status: 400 });
		}

		const activeSession = await sessionManager.createSession({
			id: crypto.randomUUID(),
			name: provider,
			provider: provider,
			description: "",
			baseUrl: providerUrl,
		});

		// Execute scraping with session support
		scraper.execute(
			providerUrl,
			organizations,
			dateRange,
			tendersPerOrganization,
			isTenderPerOrganizationLimited,
			activeSession.id
		);

		const response: ApiResponse<string> = {
			success: true,
			data: activeSession.id,
			message: `Scrapping started.`,
			error: null,
		};

		return NextResponse.json(response);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		console.log(errorMessage);
		const response: ApiResponse<null> = {
			success: false,
			data: null,
			message: "Scraping failed",
			error: errorMessage,
		};

		return NextResponse.json(response, { status: 500 });
	}
}
