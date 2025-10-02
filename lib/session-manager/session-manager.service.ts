import {
	IActiveSessionData,
	ISessionStats,
} from "@/interface/active-scraper-session.interface";
import { ScrapingProvider } from "@prisma/client";

class SessionManager {
	private static instance: SessionManager;
	private activeSessions: Map<string, IActiveSessionData> = new Map();

	private constructor() {
		// Cleanup completed sessions every hour
		setInterval(() => this.cleanupOldSessions(), 60 * 60 * 1000);
	}

	public static getInstance(): SessionManager {
		if (!SessionManager.instance) {
			SessionManager.instance = new SessionManager();
		}
		return SessionManager.instance;
	}

	/**
	 * Create a new active session
	 */
	public createSession(data: {
		id?: string;
		name?: string;
		description?: string;
		provider: ScrapingProvider;
		baseUrl: string;
	}): IActiveSessionData {
		const sessionId = data.id || `session_${Date.now()}`;

		const session: IActiveSessionData = {
			id: sessionId,
			name: data.name,
			description: data.description,
			provider: data.provider,
			baseUrl: data.baseUrl,
			status: "RUNNING",
			progress: 0,
			organizationsDiscovered: 0,
			organizationsScraped: 0,
			tendersFound: 0,
			tendersSaved: 0,
			pagesNavigated: 0,
			pagesPerMinute: 0,
			avgResponseTime: 0,
			startedAt: new Date(),
			lastActivityAt: new Date(),
		};

		this.activeSessions.set(sessionId, session);
		console.log(`🆕 Session created: ${sessionId} for ${data.provider}`);

		return session;
	}

	/**
	 * Get session by ID
	 */
	public getSession(sessionId: string): IActiveSessionData | undefined {
		return this.activeSessions.get(sessionId);
	}

	/**
	 * Update session progress and stats
	 */
	public updateSession(
		sessionId: string,
		updates: Partial<IActiveSessionData>
	): boolean {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			Object.assign(session, {
				...updates,
				lastActivityAt: new Date(),
			});
			return true;
		}
		return false;
	}

	/**
	 * Update session progress
	 */
	public updateProgress(sessionId: string, progress: number): boolean {
		return this.updateSession(sessionId, { progress });
	}

	/**
	 * Update session stats
	 */
	public updateStats(
		sessionId: string,
		stats: {
			organizationsDiscovered?: number;
			organizationsScraped?: number;
			tendersFound?: number;
			tendersSaved?: number;
			pagesNavigated?: number;
			pagesPerMinute?: number;
			avgResponseTime?: number;
		}
	): boolean {
		return this.updateSession(sessionId, stats);
	}

	/**
	 * Update current activity
	 */
	public updateCurrentActivity(
		sessionId: string,
		organization: string,
		stage: string
	): boolean {
		return this.updateSession(sessionId, {
			currentOrganization: organization,
			currentStage: stage,
		});
	}

	/**
	 * Complete session
	 */
	public completeSession(
		sessionId: string,
		finalStats?: Partial<IActiveSessionData>
	): boolean {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "COMPLETED";
			session.progress = 100;
			session.completedAt = new Date();

			if (finalStats) {
				Object.assign(session, finalStats);
			}

			// Store session in database
			this.storeSessionInDatabase(session);

			return true;
		}
		return false;
	}

	/**
	 * Mark session as failed
	 */
	public failSession(sessionId: string, error?: string): boolean {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "FAILED";
			session.completedAt = new Date();

			// Store session in database
			this.storeSessionInDatabase(session);

			return true;
		}
		return false;
	}

	/**
	 * Stop session
	 */
	public stopSession(sessionId: string): boolean {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "STOPPED";
			session.completedAt = new Date();

			// Store session in database
			this.storeSessionInDatabase(session);

			return true;
		}
		return false;
	}

	/**
	 * Pause session
	 */
	public pauseSession(sessionId: string): boolean {
		return this.updateSession(sessionId, { status: "PAUSED" });
	}

	/**
	 * Resume session
	 */
	public resumeSession(sessionId: string): boolean {
		return this.updateSession(sessionId, { status: "RUNNING" });
	}

	/**
	 * Get all active sessions
	 */
	public getActiveSessions(): IActiveSessionData[] {
		return Array.from(this.activeSessions.values()).filter(
			(session) => session.status === "RUNNING"
		);
	}

	/**
	 * Get all sessions
	 */
	public getAllSessions(): IActiveSessionData[] {
		return Array.from(this.activeSessions.values());
	}

	/**
	 * Get session statistics
	 */
	public getSessionStats(): ISessionStats {
		const sessions = this.getAllSessions();
		const totalSessions = sessions.length;
		const activeSessions = sessions.filter(
			(s) => s.status === "RUNNING"
		).length;
		const completedSessions = sessions.filter(
			(s) => s.status === "COMPLETED"
		).length;
		const failedSessions = sessions.filter(
			(s) => s.status === "FAILED"
		).length;

		const totalPagesNavigated = sessions.reduce(
			(sum, session) => sum + session.pagesNavigated,
			0
		);
		const totalTendersSaved = sessions.reduce(
			(sum, session) => sum + session.tendersSaved,
			0
		);
		const totalOrganizationsScraped = sessions.reduce(
			(sum, session) => sum + session.organizationsScraped,
			0
		);

		const completedAndFailed = completedSessions + failedSessions;
		const successRate =
			completedAndFailed > 0
				? (completedSessions / completedAndFailed) * 100
				: 0;

		const completedSessionsWithDuration = sessions.filter(
			(s) => s.completedAt
		);
		const totalDuration = completedSessionsWithDuration.reduce(
			(sum, session) => {
				return (
					sum +
					(session.completedAt!.getTime() -
						session.startedAt.getTime())
				);
			},
			0
		);
		const averageDuration =
			completedSessionsWithDuration.length > 0
				? totalDuration / completedSessionsWithDuration.length
				: 0;

		return {
			totalSessions,
			activeSessions,
			completedSessions,
			failedSessions,
			totalPagesNavigated,
			totalTendersSaved,
			totalOrganizationsScraped,
			successRate,
			averageDuration,
		};
	}

	/**
	 * Get sessions by provider
	 */
	public getSessionsByProvider(
		provider: ScrapingProvider
	): IActiveSessionData[] {
		return this.getAllSessions().filter(
			(session) => session.provider === provider
		);
	}

	/**
	 * Store session in database using Prisma
	 */
	private async storeSessionInDatabase(
		session: IActiveSessionData
	): Promise<void> {
		try {
			// Import Prisma client (you might need to adjust the import path)
			// const prisma = new PrismaClient();

			// await prisma.scrapingSession.create({
			//   data: {
			//     id: session.id,
			//     name: session.name,
			//     description: session.description,
			//     provider: session.provider,
			//     baseUrl: session.baseUrl,
			//     status: session.status,
			//     progress: session.progress,
			//     organizationsDiscovered: session.organizationsDiscovered,
			//     organizationsScraped: session.organizationsScraped,
			//     tendersFound: session.tendersFound,
			//     tendersSaved: session.tendersSaved,
			//     pagesNavigated: session.pagesNavigated,
			//     pagesPerMinute: session.pagesPerMinute,
			//     avgResponseTime: session.avgResponseTime,
			//     currentOrganization: session.currentOrganization,
			//     currentStage: session.currentStage,
			//     startedAt: session.startedAt,
			//     completedAt: session.completedAt,
			//     lastActivityAt: session.lastActivityAt,
			//   }
			// });

			console.log(`💾 Session stored in database: ${session.id}`);
		} catch (error) {
			console.error(
				`❌ Failed to store session ${session.id} in database:`,
				error
			);
		}
	}

	/**
	 * Cleanup old sessions (keep only last 1000 sessions)
	 */
	private cleanupOldSessions(): void {
		const sessions = this.getAllSessions();

		if (sessions.length > 1000) {
			// Sort by startedAt (oldest first) and remove excess
			const sortedSessions = sessions.sort(
				(a, b) => a.startedAt.getTime() - b.startedAt.getTime()
			);
			const sessionsToRemove = sortedSessions.slice(
				0,
				sessions.length - 1000
			);

			sessionsToRemove.forEach((session) => {
				this.activeSessions.delete(session.id);
			});

			console.log(
				`🧹 Cleaned up ${sessionsToRemove.length} old sessions`
			);
		}
	}
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
