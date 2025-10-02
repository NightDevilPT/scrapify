// app/scraping-test/page.tsx
"use client";

import { useEffect, useState } from "react";

interface SSEMessage {
	type: string;
	data: any;
	timestamp: string;
}

interface SessionData {
	id: string;
	name?: string;
	description?: string;
	provider: string;
	baseUrl: string;
	status: "RUNNING" | "COMPLETED" | "FAILED" | "STOPPED" | "PAUSED";
	progress: number;
	organizationsDiscovered: number;
	organizationsScraped: number;
	tendersFound: number;
	tendersSaved: number;
	pagesNavigated: number;
	currentOrganization?: string;
	currentStage?: string;
	startedAt: string;
	lastActivityAt: string;
	completedAt?: string;
}

export default function ScrapingTest() {
	const [isConnected, setIsConnected] = useState(false);
	const [messages, setMessages] = useState<SSEMessage[]>([]);
	const [isScraping, setIsScraping] = useState(false);
	const [currentSession, setCurrentSession] = useState<SessionData | null>(
		null
	);
	const [connectionStatus, setConnectionStatus] = useState("disconnected");

	useEffect(() => {
		console.log("🔄 Setting up SSE connection...");
		let eventSource: EventSource | null = null;

		const connectSSE = () => {
			try {
				eventSource = new EventSource("/api/sse-connect");

				eventSource.onopen = () => {
					console.log("✅ SSE Connection opened");
					setIsConnected(true);
					setConnectionStatus("connected");
				};

				eventSource.onmessage = (event) => {
					console.log(event)
					try {
						console.log("📨 Raw SSE event received:", event);
						const message: SSEMessage = JSON.parse(event.data);
						console.log("📨 Parsed SSE message:", message);

						setMessages((prev) => {
							const newMessages = [...prev, message].slice(-50); // Keep last 50 messages
							console.log(
								`📊 Total messages: ${newMessages.length}`
							);
							return newMessages;
						});

						// Update current session if available
						if (message.data?.session) {
							setCurrentSession(message.data.session);
							console.log(
								"🔄 Updated current session:",
								message.data.session
							);
						}

						// Handle specific message types
						switch (message.type) {
							case "SESSION_CREATED":
								console.log(
									"🎉 New session created:",
									message.data.session
								);
								break;
							case "SESSION_UPDATED":
								console.log(
									"📈 Session updated:",
									message.data.session
								);
								break;
							case "SESSION_COMPLETED":
								console.log(
									"✅ Session completed:",
									message.data.session
								);
								setIsScraping(false);
								break;
							case "SESSION_FAILED":
								console.log(
									"❌ Session failed:",
									message.data.session
								);
								setIsScraping(false);
								break;
						}
					} catch (parseError) {
						console.error(
							"❌ Error parsing SSE message:",
							parseError,
							event.data
						);
					}
				};

				eventSource.onerror = (error) => {
					console.error("❌ SSE Error:", error);
					setIsConnected(false);
					setConnectionStatus("error");

					// Attempt reconnection after 3 seconds
					setTimeout(() => {
						console.log("🔄 Attempting to reconnect SSE...");
						if (eventSource) {
							eventSource.close();
						}
						connectSSE();
					}, 3000);
				};

				// Handle connection close
				eventSource.addEventListener("close", () => {
					console.log("🔌 SSE Connection closed by server");
					setIsConnected(false);
					setConnectionStatus("closed");
				});
			} catch (error) {
				console.error("❌ Failed to create SSE connection:", error);
				setConnectionStatus("failed");
			}
		};

		connectSSE();

		// Cleanup on unmount
		return () => {
			console.log("🧹 Cleaning up SSE connection");
			if (eventSource) {
				eventSource.close();
			}
		};
	}, []);

	const startScraping = async () => {
		try {
			setIsScraping(true);
			setMessages([]);
			setCurrentSession(null);
			console.log("🚀 Starting scraping...");

			const response = await fetch("/api/scrape", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					provider: "EPROCURE",
					url: "https://eprocure.gov.in/eprocure/app", // Add the actual URL
				}),
			});

			const result = await response.json();
			console.log("📊 Scraping API response:", result);

			if (!response.ok) {
				throw new Error(
					result.error || `Scraping failed: ${response.status}`
				);
			}

			if (result.sessionId) {
				console.log(
					"🎯 Scraping session started with ID:",
					result.sessionId
				);
			}
		} catch (error) {
			console.error("❌ Scraping error:", error);
			setIsScraping(false);

			// Add error message to display
			setMessages((prev) => [
				...prev,
				{
					type: "SCRAPING_ERROR",
					data: {
						error:
							error instanceof Error
								? error.message
								: "Unknown error",
					},
					timestamp: new Date().toISOString(),
				},
			]);
		}
	};

	const stopScraping = async () => {
		if (!currentSession) return;

		try {
			const response = await fetch(
				`/api/sessions/${currentSession.id}/stop`,
				{
					method: "POST",
				}
			);

			if (response.ok) {
				console.log("🛑 Stopped scraping session");
			}
		} catch (error) {
			console.error("❌ Error stopping session:", error);
		}
	};

	const formatProgress = (session: SessionData) => {
		return {
			progress: `${session.progress}%`,
			organizations: `${session.organizationsScraped}/${session.organizationsDiscovered}`,
			tenders: `${session.tendersSaved}/${session.tendersFound}`,
			currentActivity: session.currentOrganization
				? `${session.currentOrganization} - ${session.currentStage}`
				: "Initializing...",
			status: session.status,
		};
	};

	return (
		<div
			style={{
				padding: "20px",
				fontFamily: "Arial, sans-serif",
				maxWidth: "1200px",
				margin: "0 auto",
			}}
		>
			<h1>E-Procure Scraping Monitor</h1>

			{/* Connection Status */}
			<div
				style={{
					marginBottom: "20px",
					padding: "10px",
					backgroundColor: isConnected ? "#e8f5e8" : "#ffe8e8",
					border: `2px solid ${isConnected ? "#4caf50" : "#f44336"}`,
					borderRadius: "5px",
				}}
			>
				<strong>SSE Connection: </strong>
				<span
					style={{
						color: isConnected ? "green" : "red",
						fontWeight: "bold",
						textTransform: "uppercase",
					}}
				>
					{isConnected ? "🟢 CONNECTED" : "🔴 DISCONNECTED"}
				</span>
				{!isConnected && (
					<div
						style={{
							fontSize: "12px",
							color: "#666",
							marginTop: "5px",
						}}
					>
						Status: {connectionStatus} -{" "}
						{isConnected
							? "Receiving real-time updates"
							: "Trying to reconnect..."}
					</div>
				)}
			</div>

			{/* Scraping Control Section */}
			<div
				style={{
					marginBottom: "20px",
					padding: "20px",
					border: "2px solid #ddd",
					borderRadius: "8px",
					backgroundColor: "#f9f9f9",
				}}
			>
				<h3>Scraping Controls</h3>
				<div
					style={{
						display: "flex",
						gap: "10px",
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					<button
						onClick={startScraping}
						disabled={isScraping}
						style={{
							padding: "12px 24px",
							backgroundColor: isScraping ? "#cccccc" : "#007acc",
							color: "white",
							border: "none",
							borderRadius: "6px",
							cursor: isScraping ? "not-allowed" : "pointer",
							fontSize: "16px",
							fontWeight: "bold",
						}}
					>
						{isScraping
							? "🔄 Scraping..."
							: "🚀 Start E-Procure Scraping"}
					</button>

					{currentSession && currentSession.status === "RUNNING" && (
						<button
							onClick={stopScraping}
							style={{
								padding: "12px 24px",
								backgroundColor: "#ff4444",
								color: "white",
								border: "none",
								borderRadius: "6px",
								cursor: "pointer",
								fontSize: "16px",
							}}
						>
							🛑 Stop Scraping
						</button>
					)}
				</div>

				{isScraping && (
					<div
						style={{
							marginTop: "15px",
							padding: "10px",
							backgroundColor: "#e3f2fd",
							borderRadius: "4px",
						}}
					>
						<div style={{ color: "#007acc", fontWeight: "bold" }}>
							⚡ Scraping in progress... Real-time updates will
							appear below.
						</div>
						<div
							style={{
								fontSize: "12px",
								color: "#666",
								marginTop: "5px",
							}}
						>
							Check browser console for detailed logs.
						</div>
					</div>
				)}
			</div>

			{/* Current Session Progress */}
			{currentSession && (
				<div
					style={{
						marginBottom: "20px",
						padding: "20px",
						border: "2px solid #4caf50",
						borderRadius: "8px",
						backgroundColor: "#f1f8e9",
					}}
				>
					<h3>📊 Current Session Progress</h3>
					<div
						style={{
							display: "grid",
							gridTemplateColumns:
								"repeat(auto-fit, minmax(200px, 1fr))",
							gap: "15px",
						}}
					>
						<div>
							<strong>Progress:</strong>
							<div
								style={{
									background: "#e0e0e0",
									borderRadius: "10px",
									marginTop: "5px",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										background: "#4caf50",
										height: "20px",
										width: `${currentSession.progress}%`,
										transition: "width 0.3s ease",
										textAlign: "center",
										color: "white",
										fontSize: "12px",
										lineHeight: "20px",
									}}
								>
									{currentSession.progress}%
								</div>
							</div>
						</div>
						<div>
							<strong>Status:</strong> {currentSession.status}
						</div>
						<div>
							<strong>Organizations:</strong>{" "}
							{currentSession.organizationsScraped}/
							{currentSession.organizationsDiscovered}
						</div>
						<div>
							<strong>Tenders:</strong>{" "}
							{currentSession.tendersSaved}/
							{currentSession.tendersFound}
						</div>
						<div>
							<strong>Pages:</strong>{" "}
							{currentSession.pagesNavigated}
						</div>
						{currentSession.currentOrganization && (
							<div>
								<strong>Current:</strong>{" "}
								{currentSession.currentOrganization}
							</div>
						)}
						{currentSession.currentStage && (
							<div>
								<strong>Stage:</strong>{" "}
								{currentSession.currentStage}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Messages Counter */}
			<div style={{ marginBottom: "10px" }}>
				<strong>Messages Received: </strong>
				<span
					style={{
						backgroundColor: "#007acc",
						color: "white",
						padding: "2px 8px",
						borderRadius: "10px",
						fontSize: "14px",
					}}
				>
					{messages.length}
				</span>
			</div>

			{/* Messages Display */}
			<div>
				<h3>Real-time Messages:</h3>
				<div
					style={{
						height: "500px",
						overflow: "auto",
						border: "2px solid #ccc",
						padding: "15px",
						backgroundColor: "#f5f5f5",
						borderRadius: "8px",
					}}
				>
					{messages.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								color: "#666",
								padding: "40px",
								fontStyle: "italic",
							}}
						>
							Waiting for messages... Start scraping to see
							real-time updates.
						</div>
					) : (
						messages.map((message, index) => (
							<div
								key={index}
								style={{
									marginBottom: "12px",
									padding: "12px",
									border: "1px solid #ddd",
									backgroundColor: "white",
									borderRadius: "6px",
									boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<span
										style={{
											fontWeight: "bold",
											color: message.type.includes(
												"FAILED"
											)
												? "#f44336"
												: message.type.includes(
														"COMPLETED"
												  )
												? "#4caf50"
												: "#2196f3",
										}}
									>
										{message.type}
									</span>
									<span
										style={{
											fontSize: "12px",
											color: "#666",
										}}
									>
										{new Date(
											message.timestamp
										).toLocaleTimeString()}
									</span>
								</div>
								<div style={{ fontSize: "14px" }}>
									<pre
										style={{
											margin: 0,
											whiteSpace: "pre-wrap",
											fontSize: "12px",
											fontFamily: "monospace",
											maxHeight: "150px",
											overflow: "auto",
											backgroundColor: "#f8f8f8",
											padding: "8px",
											borderRadius: "4px",
										}}
									>
										{JSON.stringify(message.data, null, 2)}
									</pre>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Debug Info */}
			<div
				style={{
					marginTop: "20px",
					padding: "15px",
					backgroundColor: "#fff3cd",
					border: "1px solid #ffeaa7",
					borderRadius: "5px",
					fontSize: "12px",
				}}
			>
				<strong>Debug Info:</strong> Open browser console (F12) to see
				detailed logs. Session ID: {currentSession?.id || "None"}
			</div>
		</div>
	);
}
