export interface OrganizationInfo {
	name: string;
	id: string;
	value: string;
}

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export interface ScraperProvider {
	getOrganizations(url: string): Promise<OrganizationInfo[] | null>;
	execute(
		url: string,
		organizations: string[],
		dateRange?: DateRange
	): Promise<any>;
}

export enum ScraperProviderType {
	EPROCURE = "eprocure",
}
