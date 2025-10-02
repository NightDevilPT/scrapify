// lib/session-manager.ts
import { ScrapingProvider, SessionStatus } from "@prisma/client";

export const ScraperProviderURL: Record<ScrapingProvider, string> = {
	[ScrapingProvider.EPROCURE]:
		"https://eprocure.gov.in/eprocure/app?page=FrontEndTendersByOrganisation&service=page",
	[ScrapingProvider.GEM]:
		"https://etenders.gov.in/eprocure/app?page=FrontEndTendersByOrganisation&service=page",
	[ScrapingProvider.CPP_PORTAL]:
		"https://eprocure.gov.in/cppp/resultoftendersnew/cpppdata",
	[ScrapingProvider.CUSTOM]: "",
};

export interface IActiveSessionData {
	id: string;
	name?: string;
	description?: string;
	provider: ScrapingProvider;
	baseUrl: string;
	status: SessionStatus;
	progress: number;
	organizationsDiscovered: number;
	organizationsScraped: number;
	tendersFound: number;
	tendersSaved: number;
	pagesNavigated: number;
	pagesPerMinute: number;
	avgResponseTime: number;
	currentOrganization?: string;
	currentStage?: string;
	startedAt: Date;
	completedAt?: Date;
	lastActivityAt: Date;
}

export interface ISessionStats {
	totalSessions: number;
	activeSessions: number;
	completedSessions: number;
	failedSessions: number;
	totalPagesNavigated: number;
	totalTendersSaved: number;
	totalOrganizationsScraped: number;
	successRate: number;
	averageDuration: number;
}
