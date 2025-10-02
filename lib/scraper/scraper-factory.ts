// lib/scraper/scraper-factory.ts
import { ScrapingProvider } from "@prisma/client";
import { EProcureScraper } from "./providers/e-procure-scraper";
import { ScraperProvider } from "./scraper.interface";

export class ScraperFactory {
	static createScraper(provider: ScrapingProvider): ScraperProvider {
		switch (provider) {
			case ScrapingProvider.EPROCURE:
				return new EProcureScraper();
			default:
				throw new Error(`Unknown scraper provider: ${provider}`);
		}
	}
}
