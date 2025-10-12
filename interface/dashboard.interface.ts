// types/dashboard.types.ts
export interface SessionOverview {
	summary: {
		totalSessions: number;
		activeSessions: number;
		completedSessions: number;
		failedSessions: number;
		successRate: number;
		totalTendersSaved: number;
		totalPagesNavigated: number;
		totalOrganizationsScraped: number;
	};
	providerBreakdown: Array<{
		provider: string;
		totalSessions: number;
		activeSessions: number;
		completedSessions: number;
		failedSessions: number;
		successRate: number;
		totalTendersSaved: number;
		totalPagesNavigated: number;
	}>;
	statusDistribution: Array<{
		status: string;
		count: number;
		percentage: number;
	}>;
	recentActivity: {
		last24Hours: number;
		newSessionsLast24Hours: number;
	};
	activeSessions: Array<{
		id: string;
		name?: string;
		provider: string;
		progress: number;
		currentOrganization?: string;
		currentStage?: string;
		startedAt: string;
		lastActivityAt: string;
		organizationsScraped: number;
		organizationsFound: number;
		tendersFound: number;
		tenderScraped: number;
	}>;
	performance: {
		averageProgress: number;
		averagePagesPerMinute: number;
		averageResponseTime: number;
		totalTendersProcessed: number;
		totalOrganizationsProcessed: number;
	};
	systemHealth: {
		totalSessions: number;
		activeSessions: number;
		successRate: number;
		averageDuration: number;
		uptime: number;
		memoryUsage: {
			used: number;
			total: number;
			percentage: number;
		};
	};
	timestamp: string;
}
