// app/api/scrape/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ScraperFactory } from "@/lib/scraper/scraper-factory";
import { ScrapingProvider } from "@prisma/client";
import { ScraperProviderURL } from "@/interface/active-scraper-session.interface";

// Store active scraping tasks (in production, use Redis or database)
const activeTasks = new Map();

export async function POST(request: NextRequest) {
	try {
		const { provider } = await request.json();

		if (!provider) {
			return NextResponse.json(
				{ error: "Provider is required" },
				{ status: 400 }
			);
		}

		console.log(`🚀 Starting ASYNC scraping for provider: ${provider}`);

		// Create scraper based on provider
		const scraper = ScraperFactory.createScraper(
			provider as ScrapingProvider
		);

		// Get session ID before starting (if available)
		const sessionId = crypto.randomUUID();

		// Start scraping asynchronously (don't await)
		const scrapingPromise = await scraper.execute(ScraperProviderURL[provider as ScrapingProvider]);

		console.log(`📡 Async scraping started for session: ${sessionId}`);

		// Return immediately with session info
		return NextResponse.json({ 
			success: true,
			message: "Scraping started asynchronously",
			sessionId: sessionId,
			data: scrapingPromise,
			startedAt: new Date().toISOString()
		});

	} catch (error) {
		console.error("❌ Scraping API error:", error);
		
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Scraping failed to start",
				sessionId: null
			},
			{ status: 500 }
		);
	}
}
