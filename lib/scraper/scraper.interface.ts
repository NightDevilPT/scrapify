export interface ScrapingResult {
	success: boolean;
	data: any;
	metadata: {
		provider: string;
		pagesScraped: number;
		dataPoints: number;
		duration: number;
	};
	error?: string;
}

export interface ScraperProvider {
	execute(url: string): Promise<ScrapingResult>;
}

export enum ScraperProviderType {
	EPROCURE = "eprocure",
}
