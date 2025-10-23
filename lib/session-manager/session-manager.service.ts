import {
	IActiveSessionData,
	ISessionStats,
} from "@/interface/active-scraper-session.interface";
import { ScrapingProvider, PrismaClient } from "@prisma/client";

// Use global to persist across serverless functions (development only)
declare global {
	var _sessionManager: SessionManager | undefined;
}

class SessionManager {
	private static instance: SessionManager;
	private activeSessions: Map<string, IActiveSessionData> = new Map();
	private prisma: PrismaClient;

	// Debouncing mechanism
	private pendingUpdates: Map<string, NodeJS.Timeout> = new Map();
	private batchUpdateQueue: Map<string, IActiveSessionData> = new Map();
	private batchTimeout: NodeJS.Timeout | null = null;
	private readonly BATCH_DELAY = 5000; // 5 seconds

	private constructor() {
		// Initialize Prisma client
		this.prisma = new PrismaClient();

		// Cleanup completed sessions every hour
		setInterval(() => this.cleanupOldSessions(), 60 * 60 * 1000);
	}

	public static getInstance(): SessionManager {
		// In development, use global to persist across hot reloads
		if (process.env.NODE_ENV === "development") {
			if (!global._sessionManager) {
				global._sessionManager = new SessionManager();
			}
			return global._sessionManager;
		}

		// In production, use singleton pattern
		if (!SessionManager.instance) {
			SessionManager.instance = new SessionManager();
		}
		return SessionManager.instance;
	}

	/**
	 * Create a new active session
	 */
	public async createSession(data: {
		id?: string;
		name?: string;
		description?: string;
		provider: ScrapingProvider;
		baseUrl: string;
	}): Promise<IActiveSessionData> {
		// Use the provided ID or generate one
		const sessionId =
			data.id ||
			`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const session: IActiveSessionData = {
			id: sessionId, // This will be used as the database ID
			name: data.name,
			description: data.description,
			provider: data.provider,
			baseUrl: data.baseUrl,
			status: "RUNNING",
			progress: 0,
			organizationsFound: 0,
			organizationsScraped: 0,
			tendersFound: 0,
			tendersSaved: 0,
			pagesNavigated: 0,
			pagesPerMinute: 0,
			avgResponseTime: 0,
			startedAt: new Date(),
			lastActivityAt: new Date(),
			tenderScraped: 0,
			errorMessage: undefined,
			// Initialize estimated time fields
			estimatedCompletionTime: undefined,
			estimatedTimeRemaining: undefined,
			estimatedTimeRemainingFormatted: undefined,
			scrapingRate: undefined,
			timePerTender: undefined,
		};

		this.activeSessions.set(sessionId, session);

		if (data.id) {
			console.log(
				`Session created with provided ID: ${sessionId} for ${data.provider}`
			);
		} else {
			console.log(
				`Session created with generated ID: ${sessionId} for ${data.provider}`
			);
		}

		// Immediate save for new sessions
		await this.storeSessionInDatabase(session);

		return session;
	}

	/**
	 * Get session by ID
	 */
	public getSession(sessionId: string): IActiveSessionData | undefined {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			// Recalculate estimated time to ensure it's up to date
			this.calculateEstimatedTime(session);
		}
		return session;
	}

	/**
	 * Update session progress and stats
	 */
	public async updateSession(
		sessionId: string,
		updates: Partial<IActiveSessionData>
	): Promise<boolean> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			Object.assign(session, {
				...updates,
				lastActivityAt: new Date(),
			});

			// Calculate estimated time if relevant fields are updated
			if (updates.tenderScraped !== undefined || updates.tendersFound !== undefined || updates.progress !== undefined || updates.organizationsScraped !== undefined) {
				this.calculateEstimatedTime(session);
				
				// Force immediate update for estimated time fields to ensure they're saved
				console.log(`Forcing immediate update for session ${sessionId} with estimated time data`);
				await this.storeSessionInDatabase(session);
			}

			// Debounced database update
			this.scheduleSessionUpdate(sessionId, session);
			return true;
		}
		return false;
	}

	/**
	 * Update session progress
	 */
	public async updateProgress(
		sessionId: string,
		progress: number
	): Promise<boolean> {
		return await this.updateSession(sessionId, { progress });
	}

	/**
	 * Update session stats
	 */
	public async updateStats(
		sessionId: string,
		stats: {
			organizationsFound?: number;
			organizationsScraped?: number;
			tendersFound?: number;
			tenderScraped?: number;
			tendersSaved?: number;
			pagesNavigated?: number;
			pagesPerMinute?: number;
			avgResponseTime?: number;
		}
	): Promise<boolean> {
		return await this.updateSession(sessionId, stats);
	}

	/**
	 * Update current activity
	 */
	public async updateCurrentActivity(
		sessionId: string,
		organization: string,
		stage: string
	): Promise<boolean> {
		return await this.updateSession(sessionId, {
			currentOrganization: organization,
			currentStage: stage,
		});
	}

	/**
	 * Complete session
	 */
	public async completeSession(
		sessionId: string,
		finalStats?: Partial<IActiveSessionData>
	): Promise<boolean> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "COMPLETED";
			session.progress = 100;
			session.completedAt = new Date();

			if (finalStats) {
				Object.assign(session, finalStats);
			}

			// Clear any pending updates and save immediately
			this.clearPendingUpdate(sessionId);
			await this.storeSessionInDatabase(session);
			this.activeSessions.delete(sessionId);
			return true;
		}
		return false;
	}

	/**
	 * Mark session as failed
	 */
	public async failSession(
		sessionId: string,
		error?: string
	): Promise<boolean> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "FAILED";
			session.completedAt = new Date();

			if (error) {
				session.errorMessage = error;
			}

			// Clear any pending updates and save immediately
			this.clearPendingUpdate(sessionId);
			await this.storeSessionInDatabase(session);
			this.activeSessions.delete(sessionId)
			return true;
		}
		return false;
	}

	/**
	 * Stop session
	 */
	public async stopSession(sessionId: string): Promise<boolean> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "STOPPED";
			session.completedAt = new Date();

			// Clear any pending updates and save immediately
			this.clearPendingUpdate(sessionId);
			await this.storeSessionInDatabase(session);

			return true;
		}
		return false;
	}

	/**
	 * Pause session
	 */
	public async pauseSession(sessionId: string): Promise<boolean> {
		return await this.updateSession(sessionId, { status: "PAUSED" });
	}

	/**
	 * Resume session
	 */
	public async resumeSession(sessionId: string): Promise<boolean> {
		return await this.updateSession(sessionId, { status: "RUNNING" });
	}

	/**
	 * Schedule debounced session update
	 */
	private scheduleSessionUpdate(
		sessionId: string,
		session: IActiveSessionData
	): void {
		// Clear existing timeout for this session
		this.clearPendingUpdate(sessionId);

		// Add to batch queue
		this.batchUpdateQueue.set(sessionId, { ...session });

		// Set batch timeout if not already set
		if (!this.batchTimeout) {
			this.batchTimeout = setTimeout(() => {
				this.processBatchUpdates();
			}, this.BATCH_DELAY);
		}
	}

	/**
	 * Clear pending update for a session
	 */
	private clearPendingUpdate(sessionId: string): void {
		const timeout = this.pendingUpdates.get(sessionId);
		if (timeout) {
			clearTimeout(timeout);
			this.pendingUpdates.delete(sessionId);
		}
		this.batchUpdateQueue.delete(sessionId);
	}

	/**
	 * Process batched updates
	 */
	private async processBatchUpdates(): Promise<void> {
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}

		if (this.batchUpdateQueue.size === 0) {
			return;
		}

		const sessionsToUpdate = Array.from(this.batchUpdateQueue.values());
		this.batchUpdateQueue.clear();

		try {
			// Use transaction for batch update
			await this.prisma.$transaction(async (tx) => {
				for (const session of sessionsToUpdate) {
					await this.upsertSessionInDatabase(tx, session);
				}
			});

			console.log(`Batch updated ${sessionsToUpdate.length} sessions`);
		} catch (error) {
			console.error(`Failed to batch update sessions:`, error);

			// Retry individual updates for failed sessions
			for (const session of sessionsToUpdate) {
				try {
					await this.storeSessionInDatabase(session);
				} catch (individualError) {
					console.error(
						`❌ Failed to update session ${session.id}:`,
						individualError
					);
				}
			}
		}
	}

	/**
	 * Store session in database using Prisma
	 */
	private async storeSessionInDatabase(
		session: IActiveSessionData
	): Promise<void> {
		try {
			await this.upsertSessionInDatabase(this.prisma, session);
			console.log(`Session stored/updated in database: ${session.id}`);
		} catch (error) {
			console.error(
				`Failed to store session ${session.id} in database:`,
				error
			);
		}
	}

	/**
	 * Upsert session in database (helper method)
	 */
	private async upsertSessionInDatabase(
		prisma: any, // Can be PrismaClient or transaction
		session: IActiveSessionData
	): Promise<void> {
		// Check if session already exists in database
		const existingSession = await prisma.scrapingSession.findUnique({
			where: { id: session.id }, // Use session.id as the primary key
		});

		if (existingSession) {
			// Update existing session
			await prisma.scrapingSession.update({
				where: { id: session.id }, // Use session.id as the primary key
				data: {
					name: session.name,
					description: session.description,
					provider: session.provider,
					baseUrl: session.baseUrl,
					status: session.status,
					progress: session.progress,
					organizationsFound: session.organizationsFound,
					organizationsScraped: session.organizationsScraped,
					tendersFound: session.tendersFound,
					tenderScraped: session.tenderScraped,
					tendersSaved: session.tendersSaved,
					pagesNavigated: session.pagesNavigated,
					pagesPerMinute: session.pagesPerMinute,
					avgResponseTime: session.avgResponseTime,
					currentOrganization: session.currentOrganization,
					currentStage: session.currentStage,
					startedAt: session.startedAt,
					completedAt: session.completedAt,
					lastActivityAt: session.lastActivityAt,
					errorMessage: session.errorMessage,
					estimatedCompletionTime: session.estimatedCompletionTime,
					estimatedTimeRemaining: session.estimatedTimeRemaining,
					estimatedTimeRemainingFormatted: session.estimatedTimeRemainingFormatted,
					scrapingRate: session.scrapingRate,
					timePerTender: session.timePerTender,
				},
			});
		} else {
			// Create new session with the provided/generated ID as primary key
			await prisma.scrapingSession.create({
				data: {
					id: session.id, // This uses the sessionId as the primary key
					name: session.name,
					description: session.description,
					provider: session.provider,
					baseUrl: session.baseUrl,
					status: session.status,
					progress: session.progress,
					organizationsFound: session.organizationsFound,
					organizationsScraped: session.organizationsScraped,
					tendersFound: session.tendersFound,
					tenderScraped: session.tenderScraped,
					tendersSaved: session.tendersSaved,
					pagesNavigated: session.pagesNavigated,
					pagesPerMinute: session.pagesPerMinute,
					avgResponseTime: session.avgResponseTime,
					currentOrganization: session.currentOrganization,
					currentStage: session.currentStage,
					startedAt: session.startedAt,
					completedAt: session.completedAt,
					lastActivityAt: session.lastActivityAt,
					errorMessage: session.errorMessage,
					estimatedCompletionTime: session.estimatedCompletionTime,
					estimatedTimeRemaining: session.estimatedTimeRemaining,
					estimatedTimeRemainingFormatted: session.estimatedTimeRemainingFormatted,
					scrapingRate: session.scrapingRate,
					timePerTender: session.timePerTender,
				},
			});
		}
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
		const sessions = Array.from(this.activeSessions.values());
		// Recalculate estimated time for all sessions to ensure they're up to date
		sessions.forEach(session => {
			this.calculateEstimatedTime(session);
		});
		return sessions;
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
				this.clearPendingUpdate(session.id);
			});

			console.log(
				`Cleaned up ${sessionsToRemove.length} old sessions`
			);
		}
	}

	/**
	 * Calculate estimated completion time for a session
	 */
	private calculateEstimatedTime(session: IActiveSessionData): void {
		try {
			const now = new Date();
			const elapsedTime = now.getTime() - session.startedAt.getTime();
			
			console.log(`Calculating estimated time for session ${session.id}:`, {
				tenderScraped: session.tenderScraped,
				tendersFound: session.tendersFound,
				progress: session.progress,
				elapsedTime: elapsedTime
			});
			
			// Calculate if we have some progress and elapsed time
			if (session.progress > 0 && elapsedTime > 0) {
				// If we have scraped tenders, use that for rate calculation
				if (session.tenderScraped > 0) {
					// Calculate scraping rate (tenders per minute)
					const elapsedMinutes = elapsedTime / (1000 * 60);
					const scrapingRate = session.tenderScraped / elapsedMinutes;
					
					// Calculate time per tender (milliseconds)
					const timePerTender = elapsedTime / session.tenderScraped;
					
					// Calculate remaining tenders based on progress
					const totalEstimatedTenders = session.tendersFound > 0 
						? session.tendersFound 
						: Math.round(session.tenderScraped / (session.progress / 100));
					
					const remainingTenders = Math.max(0, totalEstimatedTenders - session.tenderScraped);
					
					// Calculate estimated time remaining
					const estimatedTimeRemaining = remainingTenders * timePerTender;
					
					// Calculate estimated completion time
					const estimatedCompletionTime = new Date(now.getTime() + estimatedTimeRemaining);
					
					// Format estimated time remaining
					const estimatedTimeRemainingFormatted = this.formatDuration(estimatedTimeRemaining);
					
					// Update session with calculated values
					session.scrapingRate = parseFloat(scrapingRate.toFixed(2));
					session.timePerTender = Math.round(timePerTender);
					session.estimatedTimeRemaining = Math.round(estimatedTimeRemaining);
					session.estimatedTimeRemainingFormatted = estimatedTimeRemainingFormatted;
					session.estimatedCompletionTime = estimatedCompletionTime;
					
					console.log(`Estimated time calculated:`, {
						scrapingRate: session.scrapingRate,
						estimatedTimeRemainingFormatted: session.estimatedTimeRemainingFormatted,
						estimatedCompletionTime: session.estimatedCompletionTime
					});
					
					// Force immediate database update for estimated time fields
					this.storeSessionInDatabase(session);
				} else {
					// If no tenders scraped yet, estimate based on progress and organizations
					if (session.organizationsScraped > 0 && session.organizationsFound > 0) {
						const progressRate = session.progress / 100;
						const totalEstimatedTime = elapsedTime / progressRate;
						const estimatedTimeRemaining = totalEstimatedTime - elapsedTime;
						
						// Calculate estimated completion time
						const estimatedCompletionTime = new Date(now.getTime() + estimatedTimeRemaining);
						
						// Format estimated time remaining
						const estimatedTimeRemainingFormatted = this.formatDuration(estimatedTimeRemaining);
						
						// Update session with calculated values
						session.estimatedTimeRemaining = Math.round(estimatedTimeRemaining);
						session.estimatedTimeRemainingFormatted = estimatedTimeRemainingFormatted;
						session.estimatedCompletionTime = estimatedCompletionTime;
						
						console.log(`Estimated time calculated based on progress:`, {
							estimatedTimeRemainingFormatted: session.estimatedTimeRemainingFormatted,
							estimatedCompletionTime: session.estimatedCompletionTime
						});
						
						// Force immediate database update for estimated time fields
						this.storeSessionInDatabase(session);
					}
				}
			} else {
				// Reset estimates if not enough data
				session.scrapingRate = undefined;
				session.timePerTender = undefined;
				session.estimatedTimeRemaining = undefined;
				session.estimatedTimeRemainingFormatted = undefined;
				session.estimatedCompletionTime = undefined;
				
				console.log(`Not enough data for estimation, resetting values`);
			}
		} catch (error) {
			console.error('Error calculating estimated time:', error);
		}
	}

	/**
	 * Format duration in milliseconds to human readable string
	 */
	private formatDuration(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days}d ${hours % 24}h ${minutes % 60}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	/**
	 * Graceful shutdown - process any pending updates
	 */
	public async shutdown(): Promise<void> {
		// Process any remaining batched updates
		if (this.batchUpdateQueue.size > 0) {
			await this.processBatchUpdates();
		}

		// Close Prisma connection
		await this.prisma.$disconnect();
	}
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
