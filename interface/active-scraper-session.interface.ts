// lib/session-manager.ts
import { ElementType } from "react";
import { ScrapingProvider, SessionStatus } from "@prisma/client";

export const ScraperProviderURL: Record<
	ScrapingProvider,
	{
		url: string;
		label: string;
		icon?: ElementType;
		description?: string;
	}
> = {
	[ScrapingProvider.EPROCURE]: {
		url: "https://eprocure.gov.in/eprocure/app?page=FrontEndTendersByOrganisation&service=page",
		label: "E-Procure",
	},
	[ScrapingProvider.GEM]: {
		url: "https://etenders.gov.in/eprocure/app?page=FrontEndTendersByOrganisation&service=page",
		label: "Gem",
	},
	[ScrapingProvider.CPP_PORTAL]: {
		url: "https://eprocure.gov.in/cppp/resultoftendersnew/cpppdata",
		label: "CPP Portal",
	},
	[ScrapingProvider.CUSTOM]: {
		url: "",
		label: "Custom",
	},
};

export interface IActiveSessionData {
	id: string;
	name?: string;
	description?: string;

	provider: ScrapingProvider;
	baseUrl: string;

	status: SessionStatus;
	progress: number;

	organizationsFound: number;
	organizationsScraped: number;
	tendersFound: number;
	tenderScraped: number;
	tendersSaved: number;
	pagesNavigated: number;
	pagesPerMinute: number;
	avgResponseTime: number;

	currentOrganization?: string;
	currentStage?: string;

	startedAt: Date;
	completedAt?: Date;
	lastActivityAt: Date;

	errorMessage?: string; // Added for failed sessions
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
