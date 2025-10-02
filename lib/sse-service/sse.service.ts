// lib/sse-service.ts
export interface SSEClient {
	id: string;
	response: Response; // Next.js Response object
	metadata: {
		userAgent?: string;
		ip?: string;
		connectedAt: Date;
		lastActivity: Date;
		role?: string;
		sessionId?: string;
	};
}

export interface SSEMessage {
	type: string;
	data: any;
	timestamp: string;
}

class SSEService {
	private static instance: SSEService;
	private clients: Map<string, SSEClient> = new Map();
	private clientIdCounter = 0;

	private constructor() {
		// Cleanup disconnected clients every 30 seconds
		setInterval(() => this.cleanupDisconnectedClients(), 30000);
	}

	public static getInstance(): SSEService {
		if (!SSEService.instance) {
			SSEService.instance = new SSEService();
		}
		return SSEService.instance;
	}

	/**
	 * Add a new client to the SSE service
	 */
	public addClient(
		response: Response,
		metadata: Partial<SSEClient["metadata"]> = {}
	): string {
		const clientId = this.generateClientId();

		const client: SSEClient = {
			id: clientId,
			response,
			metadata: {
				connectedAt: new Date(),
				lastActivity: new Date(),
				...metadata,
			},
		};

		this.clients.set(clientId, client);
		console.log(
			`✅ SSE Client connected: ${clientId}. Total: ${this.clients.size}`
		);

		return clientId;
	}

	/**
	 * Remove a client from the service
	 */
	public removeClient(clientId: string): boolean {
		const client = this.clients.get(clientId);
		if (client) {
			this.clients.delete(clientId);
			console.log(
				`❌ SSE Client disconnected: ${clientId}. Total: ${this.clients.size}`
			);
			return true;
		}
		return false;
	}

	/**
	 * Broadcast message to ALL connected clients
	 */
	public broadcast(message: Omit<SSEMessage, "timestamp">): void {
		const fullMessage: SSEMessage = {
			...message,
			timestamp: new Date().toISOString(),
		};

		const messageString = `data: ${JSON.stringify(fullMessage)}\n\n`;

		this.clients.forEach((client, clientId) => {
			try {
				// Use the response writer
				const writer = client.response as any;
				if (writer.write) {
					writer.write(messageString);
					client.metadata.lastActivity = new Date();
				}
			} catch (error) {
				console.error(`Failed to send to client ${clientId}:`, error);
				this.removeClient(clientId);
			}
		});
	}

	/**
	 * Send message to a specific client
	 */
	public sendToClient(
		clientId: string,
		message: Omit<SSEMessage, "timestamp">
	): boolean {
		const client = this.clients.get(clientId);
		if (!client) {
			console.warn(`Client ${clientId} not found`);
			return false;
		}

		const fullMessage: SSEMessage = {
			...message,
			timestamp: new Date().toISOString(),
		};

		try {
			const writer = client.response as any;
			if (writer.write) {
				writer.write(`data: ${JSON.stringify(fullMessage)}\n\n`);
				client.metadata.lastActivity = new Date();
				return true;
			}
		} catch (error) {
			console.error(`Failed to send to client ${clientId}:`, error);
			this.removeClient(clientId);
		}

		return false;
	}

	/**
	 * Get all connected clients
	 */
	public getConnectedClients(): SSEClient[] {
		return Array.from(this.clients.values());
	}

	/**
	 * Get client by ID
	 */
	public getClient(clientId: string): SSEClient | undefined {
		return this.clients.get(clientId);
	}

	/**
	 * Cleanup disconnected clients
	 */
	private cleanupDisconnectedClients(): void {
		const now = new Date();
		const disconnectedClients: string[] = [];

		this.clients.forEach((client, clientId) => {
			const timeSinceLastActivity =
				now.getTime() - client.metadata.lastActivity.getTime();

			if (timeSinceLastActivity > 60000) {
				// 1 minute timeout
				disconnectedClients.push(clientId);
			}
		});

		disconnectedClients.forEach((clientId) => {
			this.removeClient(clientId);
		});

		if (disconnectedClients.length > 0) {
			console.log(
				`🧹 Cleaned up ${disconnectedClients.length} disconnected clients`
			);
		}
	}

	private generateClientId(): string {
		return `client_${++this.clientIdCounter}_${Date.now()}`;
	}
}

// Export singleton instance
export const sseService = SSEService.getInstance();
