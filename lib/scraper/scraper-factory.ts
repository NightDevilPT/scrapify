// lib/scraper/scraper-factory.ts
import { ScrapingProvider } from "@prisma/client";
import { EProcureScraper } from "./providers/e-procure-scraper";
import { ScraperProvider } from "./scraper.interface";
import { EProcureCPPScraper } from "./providers/e-procure-cpp-scrapper";

export class ScraperFactory {
	static createScraper(provider: ScrapingProvider): ScraperProvider {
		switch (provider) {
			case ScrapingProvider.EPROCURE:
				return new EProcureScraper();
			case ScrapingProvider.EPROCURE_CPPP:
				return new EProcureCPPScraper();
			default:
				throw new Error(`Unknown scraper provider: ${provider}`);
		}
	}
}
