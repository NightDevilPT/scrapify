// components/tender-dashboard.tsx
"use client";

import {
	Activity,
	Database,
	ChartBar,
	TrendingUp,
	Building2,
	RefreshCw,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	SummaryCard,
	SummaryCardProps,
} from "@/components/shared/summary-card";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import apiService from "@/lib/api-service/api.service";
import { ApiResponse } from "@/interface/api.interface";
import { ActiveSessionCard } from "@/components/shared/active-session";
import { TenderDashboardSkeleton } from "./tender-dashboard-skeleton";

interface TenderDashboardProps {
	tenderType: string;
}

interface TenderSessionOverview {
	summary: {
		totalSessions: number;
		activeSessions: number;
		completedSessions: number;
		failedSessions: number;
		successRate: number;
		totalTendersSaved: number;
		totalPagesNavigated: number;
		totalOrganizationsScraped: number;
		tenderType: string;
	};
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
		name: string;
		provider: string;
		progress: number;
		currentOrganization: string;
		currentStage: string;
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
	};
	timestamp: string;
}

/**
 * TenderDashboard component displays overview for a specific tender type
 * Fetches and updates data periodically for the given tender type
 */
export function TenderDashboard({ tenderType }: TenderDashboardProps) {
	const [overviewData, setOverviewData] =
		useState<TenderSessionOverview | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTenderOverview = async () => {
		try {
			const response: ApiResponse<TenderSessionOverview> =
				await apiService.get(`/api/sessions/overview/${tenderType}`);

			if (response.success && response.data) {
				setOverviewData(response.data);
				setError(null);
			} else {
				setError(
					response.error ||
						response.message ||
						`Failed to fetch data for ${tenderType}`
				);
			}
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to connect to server";
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (tenderType) {
			fetchTenderOverview();
			const intervalId = setInterval(fetchTenderOverview, 5000);
			return () => clearInterval(intervalId);
		}
	}, [tenderType]);

	if (isLoading) {
		return <TenderDashboardSkeleton />;
	}

	if (error) {
		return (
			<div className="space-y-4">
				<Card className="border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Error Loading {tenderType} Dashboard
						</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={fetchTenderOverview}
							variant="outline"
							className="flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Retry
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!overviewData) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Data Available</CardTitle>
					<CardDescription>
						No session data found for {tenderType}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const {
		summary,
		statusDistribution,
		recentActivity,
		activeSessions,
		performance,
		systemHealth,
	} = overviewData;

	const summaryCards: SummaryCardProps[] = [
		{
			title: "Total Sessions",
			value: summary.totalSessions,
			description: `${tenderType} sessions`,
			trend: summary.totalSessions > 0 ? "positive" : "neutral",
			icon: <Database className="h-4 w-4" />,
		},
		{
			title: "Active Sessions",
			value: summary.activeSessions,
			description: "Currently running",
			trend: summary.activeSessions > 0 ? "positive" : "neutral",
			icon: <Activity className="h-4 w-4" />,
		},
		{
			title: "Success Rate",
			value: `${summary.successRate}%`,
			description: "Completion rate",
			trend:
				summary.successRate > 90
					? "positive"
					: summary.successRate > 70
					? "warning"
					: "negative",
			icon: <TrendingUp className="h-4 w-4" />,
		},
		{
			title: "Tenders Saved",
			value: summary.totalTendersSaved.toLocaleString(),
			description: "Total processed",
			trend: "positive",
			icon: <ChartBar className="h-4 w-4" />,
		},
		{
			title: "Pages Navigated",
			value: summary.totalPagesNavigated.toLocaleString(),
			description: "Total pages processed",
			trend: "positive",
			icon: <TrendingUp className="h-4 w-4" />,
		},
		{
			title: "Organizations",
			value: summary.totalOrganizationsScraped.toLocaleString(),
			description: "Total organizations scraped",
			trend: "positive",
			icon: <Building2 className="h-4 w-4" />,
		},
	];

	// const healthMetrics: HealthMetricProps[] = [
	// 	{
	// 		label: "Average Duration",
	// 		value: `${systemHealth.averageDuration}m`,
	// 		description: "Average session duration",
	// 		status:
	// 			systemHealth.averageDuration > 60
	// 				? "critical"
	// 				: systemHealth.averageDuration > 30
	// 				? "warning"
	// 				: "healthy",
	// 	},
	// 	{
	// 		label: "Average Response Time",
	// 		value: `${performance.averageResponseTime}s`,
	// 		description: "Page load time",
	// 		status:
	// 			performance.averageResponseTime > 5
	// 				? "critical"
	// 				: performance.averageResponseTime > 3
	// 				? "warning"
	// 				: "healthy",
	// 	},
	// 	{
	// 		label: "Pages per Minute",
	// 		value: performance.averagePagesPerMinute.toFixed(1),
	// 		description: "Scraping speed",
	// 		status:
	// 			performance.averagePagesPerMinute > 10
	// 				? "positive"
	// 				: performance.averagePagesPerMinute > 5
	// 				? "warning"
	// 				: "critical",
	// 	},
	// 	{
	// 		label: "Overall Progress",
	// 		value: `${performance.averageProgress}%`,
	// 		description: "Average session progress",
	// 		status:
	// 			performance.averageProgress > 80
	// 				? "positive"
	// 				: performance.averageProgress > 50
	// 				? "warning"
	// 				: "critical",
	// 	},
	// ];

	// const getStatusColor = (status: string) => {
	// 	switch (status) {
	// 		case "COMPLETED":
	// 			return "bg-green-100 text-green-800 border-green-200";
	// 		case "RUNNING":
	// 			return "bg-blue-100 text-blue-800 border-blue-200";
	// 		case "FAILED":
	// 			return "bg-red-100 text-red-800 border-red-200";
	// 		case "STOPPED":
	// 			return "bg-yellow-100 text-yellow-800 border-yellow-200";
	// 		case "PAUSED":
	// 			return "bg-orange-100 text-orange-800 border-orange-200";
	// 		default:
	// 			return "bg-gray-100 text-gray-800 border-gray-200";
	// 	}
	// };

	return (
		<div className="space-y-6">
			{/* Summary Metrics */}
			<div className="grid grid-cols-3 max-xl:grid-cols-2 gap-4">
				{summaryCards.map((card, index) => (
					<SummaryCard
						key={index}
						title={card.title}
						value={card.value}
						description={card.description}
						trend={card.trend}
						icon={card.icon}
					/>
				))}
			</div>

			{/* Status Distribution */}
			{/* <Card>
				<CardHeader>
					<CardTitle>Session Status Distribution</CardTitle>
					<CardDescription>
						Breakdown of session statuses for {tenderType}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						{statusDistribution
							.filter((status) => status.count > 0)
							.map((status) => (
								<div
									key={status.status}
									className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${getStatusColor(
										status.status
									)}`}
								>
									<span className="text-2xl font-bold">
										{status.count}
									</span>
									<span className="text-sm font-medium capitalize">
										{status.status.toLowerCase()}
									</span>
									<span className="text-xs text-muted-foreground">
										{status.percentage}%
									</span>
								</div>
							))}
					</div>
				</CardContent>
			</Card> */}

			{/* Active Sessions */}
			<Card>
				<CardHeader>
					<CardTitle>Active {tenderType} Sessions</CardTitle>
					<CardDescription>
						{activeSessions.length} session
						{activeSessions.length !== 1 ? "s" : ""} currently
						running
					</CardDescription>
				</CardHeader>
				<CardContent>
					{activeSessions.length > 0 ? (
						<div className="space-y-4">
							{activeSessions.map((session) => (
								<ActiveSessionCard
									key={session.id}
									session={session}
								/>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							<Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No active {tenderType} sessions</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Performance and Recent Activity */}
			{/* <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Performance Metrics</CardTitle>
						<CardDescription>
							{tenderType} scraping performance
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{healthMetrics.map((metric, index) => (
							<HealthMetric
								key={index}
								label={metric.label}
								value={metric.value}
								description={metric.description}
								status={metric.status}
							/>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>
							Last 24 hours activity for {tenderType}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
								<span className="font-medium">
									Total Sessions
								</span>
								<Badge variant="secondary">
									{recentActivity.last24Hours}
								</Badge>
							</div>
							<div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
								<span className="font-medium">
									New Sessions
								</span>
								<Badge variant="secondary">
									{recentActivity.newSessionsLast24Hours}
								</Badge>
							</div>
							<div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
								<span className="font-medium">
									Success Rate
								</span>
								<Badge variant="secondary">
									{systemHealth.successRate}%
								</Badge>
							</div>
							<div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
								<span className="font-medium">
									Tenders Processed
								</span>
								<Badge variant="secondary">
									{performance.totalTendersProcessed.toLocaleString()}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			</div> */}
		</div>
	);
}
