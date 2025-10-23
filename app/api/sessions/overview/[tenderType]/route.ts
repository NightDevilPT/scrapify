// app/api/sessions/overview/[tenderType]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, ScrapingProvider, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tenderType: string }> }
) {
	try {
		const tenderType = (await params).tenderType;

		if (!tenderType) {
			return NextResponse.json(
				{
					success: false,
					data: null,
					message: "Tender type is required",
					error: "MISSING_TENDER_TYPE",
				},
				{ status: 400 }
			);
		}

		// Get sessions filtered by tender type (provider)
		const filteredSessions = await prisma.scrapingSession.findMany({
			where: {
				provider: tenderType.toUpperCase() as ScrapingProvider,
			},
			orderBy: {
				lastActivityAt: "desc",
			},
		});

		// If no sessions found for this tender type
		if (filteredSessions.length === 0) {
			return NextResponse.json(
				{
					success: true,
					data: {
						summary: {
							totalSessions: 0,
							activeSessions: 0,
							completedSessions: 0,
							failedSessions: 0,
							successRate: 0,
							totalTendersSaved: 0,
							totalPagesNavigated: 0,
							totalOrganizationsScraped: 0,
						},
						statusDistribution: [],
						recentActivity: {
							last24Hours: 0,
							newSessionsLast24Hours: 0,
						},
						activeSessions: [],
						performance: {
							averageProgress: 0,
							averagePagesPerMinute: 0,
							averageResponseTime: 0,
							totalTendersProcessed: 0,
							totalOrganizationsProcessed: 0,
						},
						systemHealth: {
							totalSessions: 0,
							activeSessions: 0,
							successRate: 0,
							averageDuration: 0,
						},
					},
					message: `No sessions found for tender type: ${tenderType}`,
					error: null,
				},
				{ status: 200 }
			);
		}

		// Calculate summary statistics for the filtered sessions
		const totalSessions = filteredSessions.length;
		const activeSessions = filteredSessions.filter(
			(s) => s.status === "RUNNING"
		).length;
		const completedSessions = filteredSessions.filter(
			(s) => s.status === "COMPLETED"
		).length;
		const failedSessions = filteredSessions.filter(
			(s) => s.status === "FAILED"
		).length;

		const completedAndFailed = completedSessions + failedSessions;
		const successRate =
			completedAndFailed > 0
				? (completedSessions / completedAndFailed) * 100
				: 0;

		const totalTendersSaved = filteredSessions.reduce(
			(sum, session) => sum + session.tendersSaved,
			0
		);
		const totalPagesNavigated = filteredSessions.reduce(
			(sum, session) => sum + session.pagesNavigated,
			0
		);
		const totalOrganizationsScraped = filteredSessions.reduce(
			(sum, session) => sum + session.organizationsScraped,
			0
		);

		// Calculate status distribution for filtered sessions
		const statusDistribution = Object.values(SessionStatus).map(
			(status) => {
				const statusSessions = filteredSessions.filter(
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

		// Recent activity (last 24 hours) for filtered sessions
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentSessions = filteredSessions.filter(
			(session) => session.lastActivityAt >= twentyFourHoursAgo
		);

		// Current active sessions with progress details for filtered sessions
		const activeSessionsData = filteredSessions
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
				console.log(`Tender-specific session ${session.id} estimated time data from database:`, {
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

		// Performance metrics for filtered sessions
		const completedSessionsData = filteredSessions.filter(
			(s) => s.status === "COMPLETED"
		);
		const performanceMetrics = {
			averageProgress:
				totalSessions > 0
					? parseFloat(
							(
								filteredSessions.reduce(
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
			totalTendersProcessed: filteredSessions.reduce(
				(sum, session) => sum + session.tenderScraped,
				0
			),
			totalOrganizationsProcessed: filteredSessions.reduce(
				(sum, session) => sum + session.organizationsScraped,
				0
			),
		};

		// System health for filtered sessions
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
				tenderType: tenderType.toUpperCase(),
			},
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
			message: `Sessions overview for ${tenderType} retrieved successfully`,
			error: null,
		});
	} catch (error) {
		console.error(
			`Error fetching sessions overview for tender type:`,
			error
		);
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
