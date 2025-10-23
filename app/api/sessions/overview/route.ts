// app/api/sessions/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, ScrapingProvider, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
	try {
		// Get all sessions from database
		const allSessions = await prisma.scrapingSession.findMany({
			orderBy: {
				lastActivityAt: "desc",
			},
		});

		// Calculate summary statistics
		const totalSessions = allSessions.length;
		const activeSessions = allSessions.filter(
			(s) => s.status === "RUNNING"
		).length;
		const completedSessions = allSessions.filter(
			(s) => s.status === "COMPLETED"
		).length;
		const failedSessions = allSessions.filter(
			(s) => s.status === "FAILED"
		).length;

		const completedAndFailed = completedSessions + failedSessions;
		const successRate =
			completedAndFailed > 0
				? (completedSessions / completedAndFailed) * 100
				: 0;

		const totalTendersSaved = allSessions.reduce(
			(sum, session) => sum + session.tendersSaved,
			0
		);
		const totalPagesNavigated = allSessions.reduce(
			(sum, session) => sum + session.pagesNavigated,
			0
		);
		const totalOrganizationsScraped = allSessions.reduce(
			(sum, session) => sum + session.organizationsScraped,
			0
		);

		// Calculate provider-specific statistics
		const providerStats = await Promise.all(
			Object.values(ScrapingProvider).map(async (provider) => {
				const providerSessions = allSessions.filter(
					(session) => session.provider === provider
				);
				const providerActiveSessions = providerSessions.filter(
					(s) => s.status === "RUNNING"
				);
				const providerCompletedSessions = providerSessions.filter(
					(s) => s.status === "COMPLETED"
				);
				const providerFailedSessions = providerSessions.filter(
					(s) => s.status === "FAILED"
				);

				const providerCompletedAndFailed =
					providerCompletedSessions.length +
					providerFailedSessions.length;
				const providerSuccessRate =
					providerCompletedAndFailed > 0
						? (providerCompletedSessions.length /
								providerCompletedAndFailed) *
						  100
						: 0;

				return {
					provider,
					totalSessions: providerSessions.length,
					activeSessions: providerActiveSessions.length,
					completedSessions: providerCompletedSessions.length,
					failedSessions: providerFailedSessions.length,
					successRate: parseFloat(providerSuccessRate.toFixed(2)),
					totalTendersSaved: providerSessions.reduce(
						(sum, session) => sum + session.tendersSaved,
						0
					),
					totalPagesNavigated: providerSessions.reduce(
						(sum, session) => sum + session.pagesNavigated,
						0
					),
				};
			})
		);

		// Calculate status distribution
		const statusDistribution = Object.values(SessionStatus).map(
			(status) => {
				const statusSessions = allSessions.filter(
					(session) => session.status === status
				);
				return {
					status,
					count: statusSessions.length,
					percentage:
						totalSessions > 0
							? parseFloat(
									(
										(statusSessions.length /
											totalSessions) *
										100
									).toFixed(2)
							  )
							: 0,
				};
			}
		);

		// Recent activity (last 24 hours)
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentSessions = allSessions.filter(
			(session) => session.lastActivityAt >= twentyFourHoursAgo
		);

		// Current active sessions with progress details
		const activeSessionsData = allSessions
			.filter((session) => session.status === "RUNNING")
			.map((session) => {
				const sessionData = {
					id: session.id,
					name: session.name,
					provider: session.provider,
					progress: session.progress,
					currentOrganization: session.currentOrganization,
					currentStage: session.currentStage,
					startedAt: session.startedAt.toISOString(),
					lastActivityAt: session.lastActivityAt.toISOString(),
					organizationsScraped: session.organizationsScraped,
					organizationsFound: session.organizationsFound,
					tendersFound: session.tendersFound,
					tenderScraped: session.tenderScraped,
					// Include estimated time fields from database
					estimatedCompletionTime: session.estimatedCompletionTime?.toISOString(),
					estimatedTimeRemaining: session.estimatedTimeRemaining,
					estimatedTimeRemainingFormatted: session.estimatedTimeRemainingFormatted,
					scrapingRate: session.scrapingRate,
					timePerTender: session.timePerTender,
				};
				
				// Debug log for estimated time fields
				console.log(`Session ${session.id} estimated time data from database:`, {
					estimatedCompletionTime: session.estimatedCompletionTime,
					estimatedTimeRemaining: session.estimatedTimeRemaining,
					estimatedTimeRemainingFormatted: session.estimatedTimeRemainingFormatted,
					scrapingRate: session.scrapingRate,
					timePerTender: session.timePerTender,
					tenderScraped: session.tenderScraped,
					progress: session.progress
				});
				
				return sessionData;
			})
			.sort(
				(a, b) =>
					new Date(b.lastActivityAt).getTime() -
					new Date(a.lastActivityAt).getTime()
			);

		// Performance metrics
		const completedSessionsData = allSessions.filter(
			(s) => s.status === "COMPLETED"
		);
		const performanceMetrics = {
			averageProgress:
				totalSessions > 0
					? parseFloat(
							(
								allSessions.reduce(
									(sum, session) => sum + session.progress,
									0
								) / totalSessions
							).toFixed(2)
					  )
					: 0,
			averagePagesPerMinute:
				completedSessionsData.length > 0
					? parseFloat(
							(
								completedSessionsData.reduce(
									(sum, session) =>
										sum + session.pagesPerMinute,
									0
								) / completedSessionsData.length
							).toFixed(2)
					  )
					: 0,
			averageResponseTime:
				completedSessionsData.length > 0
					? parseFloat(
							(
								completedSessionsData.reduce(
									(sum, session) =>
										sum + session.avgResponseTime,
									0
								) / completedSessionsData.length
							).toFixed(2)
					  )
					: 0,
			totalTendersProcessed: allSessions.reduce(
				(sum, session) => sum + session.tenderScraped,
				0
			),
			totalOrganizationsProcessed: allSessions.reduce(
				(sum, session) => sum + session.organizationsScraped,
				0
			),
		};

		// System health
		const systemHealth = {
			totalSessions,
			activeSessions,
			successRate: parseFloat(successRate.toFixed(2)),
			averageDuration:
				completedSessionsData.length > 0
					? parseFloat(
							(
								completedSessionsData.reduce((sum, session) => {
									const duration = session.completedAt
										? session.completedAt.getTime() -
										  session.startedAt.getTime()
										: 0;
									return sum + duration;
								}, 0) /
								completedSessionsData.length /
								(1000 * 60)
							).toFixed(2)
					  ) // Convert to minutes
					: 0,
			uptime: process.uptime(), // Node.js process uptime in seconds
			memoryUsage: {
				used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
				total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
				percentage: parseFloat(
					(
						(process.memoryUsage().heapUsed /
							process.memoryUsage().heapTotal) *
						100
					).toFixed(2)
				),
			},
		};

		const overviewData = {
			summary: {
				totalSessions,
				activeSessions,
				completedSessions,
				failedSessions,
				successRate: parseFloat(successRate.toFixed(2)),
				totalTendersSaved,
				totalPagesNavigated,
				totalOrganizationsScraped,
			},
			providerBreakdown: providerStats,
			statusDistribution,
			recentActivity: {
				last24Hours: recentSessions.length,
				newSessionsLast24Hours: recentSessions.filter(
					(s) => s.startedAt >= twentyFourHoursAgo
				).length,
			},
			activeSessions: activeSessionsData,
			performance: performanceMetrics,
			systemHealth,
			timestamp: new Date().toISOString(),
		};

		return NextResponse.json({
			success: true,
			data: overviewData,
			message: "Sessions overview retrieved successfully",
			error: null,
		});
	} catch (error) {
		console.error("Error fetching sessions overview:", error);
		return NextResponse.json(
			{
				success: false,
				data: null,
				message: "Internal server error",
				error: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}
