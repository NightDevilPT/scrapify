import { ScrapingProvider } from "@prisma/client";

export interface OrganizationInfo {
	name: string;
	id: string;
	value: string;
}

export interface DateRange {
	startDate: Date | string;
	endDate: Date | string;
}

export interface ScraperProvider {
	getOrganizations(url: string): Promise<OrganizationInfo[] | null>;
	execute(
		url: string,
		organizations: string[],
		dateRange?: DateRange,
		tendersPerOrganization?: number,
		isTenderPerOrganizationLimited?: boolean,
		sessionId?: string,
		provider?: ScrapingProvider
	): Promise<any>;
}

export enum ScraperProviderType {
	EPROCURE = "eprocure",
}
