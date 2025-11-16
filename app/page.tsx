"use client";

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
import { Badge } from "@/components/ui/badge";
import apiService from "@/lib/api-service/api.service";
import { ApiResponse } from "@/interface/api.interface";
import { ProviderCard } from "./_components/provider-card";
import { SessionOverview } from "@/interface/dashboard.interface";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { ActiveSessionCard } from "@/components/shared/active-session";
import { Activity, Database, ChartBar, TrendingUp } from "lucide-react";
import { StatusDistributionChart } from "./_components/status-distribution";
import { HealthMetric, HealthMetricProps } from "./_components/health-matrix";

/**
 * DashboardPage component displays an overview of scraping sessions and system performance.
 * Fetches and updates data periodically, handling loading and error states.
 */
export default function DashboardPage() {
	const [overviewData, setOverviewData] = useState<SessionOverview | null>(
		null
	);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response: ApiResponse<SessionOverview> =
					await apiService.get("/api/sessions/overview");

				if (response.success && response.data) {
					setOverviewData(response.data);
					setError(null);
				} else {
					setError(
						response.error ||
							response.message ||
							"Failed to fetch data"
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

		fetchData();
		const intervalId = setInterval(fetchData, 5000);
		return () => clearInterval(intervalId);
	}, []);

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	if (error) {
		return (
			<div className="container mx-auto p-6">
				<Card className="border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive">
							Error
						</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (!overviewData) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardHeader>
						<CardTitle>No Data Available</CardTitle>
						<CardDescription>No session data found</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const {
		summary,
		providerBreakdown,
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
			description: "All-time sessions",
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
	];

	const healthMetrics: HealthMetricProps[] = [
		{
			label: "Memory Usage",
			value: `${systemHealth.memoryUsage.percentage}%`,
			description: `${systemHealth.memoryUsage.used.toFixed(
				1
			)}MB / ${systemHealth.memoryUsage.total.toFixed(1)}MB`,
			status:
				systemHealth.memoryUsage.percentage > 80
					? "critical"
					: systemHealth.memoryUsage.percentage > 60
					? "warning"
					: "healthy",
		},
		{
			label: "Uptime",
			value: `${Math.floor(systemHealth.uptime / 3600)}h`,
			description: "System running time",
			status: "healthy",
		},
		{
			label: "Average Response Time",
			value: `${performance.averageResponseTime}s`,
			description: "Page load time",
			status:
				performance.averageResponseTime > 5
					? "critical"
					: performance.averageResponseTime > 3
					? "warning"
					: "healthy",
		},
		{
			label: "Pages per Minute",
			value: performance.averagePagesPerMinute.toFixed(1),
			description: "Scraping speed",
			status:
				performance.averagePagesPerMinute > 10
					? "positive"
					: performance.averagePagesPerMinute > 5
					? "warning"
					: "critical",
		},
	];

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header Section */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Scraping Dashboard
					</h1>
					<p className="text-muted-foreground">
						Overview of all scraping sessions and system performance
					</p>
				</div>
				<Badge variant="secondary" className="gap-2">
					<Activity className="h-4 w-4" />
					Last updated:{" "}
					{new Date(overviewData.timestamp).toLocaleTimeString()}
				</Badge>
			</div>

			{/* Summary Metrics */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

			<StatusDistributionChart
				statusDistribution={overviewData.statusDistribution}
			/>

			{/* Active Sessions */}
			<Card className="col-span-2">
				<CardHeader>
					<CardTitle>Active Sessions</CardTitle>
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
						<div className="text-center pb-8 text-muted-foreground">
							<Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No active sessions</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Provider and System Health */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Provider Breakdown</CardTitle>
						<CardDescription>
							Performance by scraping provider
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{providerBreakdown.map((provider) => (
							<ProviderCard
								key={provider.provider}
								provider={provider}
							/>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>System Health</CardTitle>
						<CardDescription>
							Current system performance metrics
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
			</div>
		</div>
	);
}
