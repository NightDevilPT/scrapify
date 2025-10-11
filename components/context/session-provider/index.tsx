// contexts/session-context.tsx
"use client";

import { IActiveSessionData } from "@/interface/active-scraper-session.interface";
import React, { createContext, useContext, useEffect, useState } from "react";

interface SessionEvent {
	type: "INITIAL" | "UPDATE" | "HEARTBEAT";
	data: IActiveSessionData[];
	timestamp?: number;
}

interface SessionContextType {
	sessions: IActiveSessionData[];
	isConnected: boolean;
	error: string | null;
	reconnect: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
	const [sessions, setSessions] = useState<IActiveSessionData[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [eventSource, setEventSource] = useState<EventSource | null>(null);

	const connect = () => {
		try {
			setError(null);
			const es = new EventSource("/api/sessions/events");

			es.onopen = () => {
				setIsConnected(true);
				setError(null);
				console.log("✅ Connected to session events");
			};

			es.onmessage = (event) => {
				try {
					const sessionEvent: SessionEvent = JSON.parse(event.data);

					switch (sessionEvent.type) {
						case "INITIAL":
						case "UPDATE":
							setSessions(sessionEvent.data);
							break;
						case "HEARTBEAT":
							// Keep connection alive, no state update needed
							break;
						default:
							console.warn(
								"Unknown event type:",
								sessionEvent.type
							);
					}
				} catch (parseError) {
					console.error("Error parsing session event:", parseError);
				}
			};

			es.onerror = (error) => {
				console.error("❌ EventSource error:", error);
				setError("Failed to connect to session updates");
				setIsConnected(false);
				es.close();
			};

			setEventSource(es);
		} catch (err) {
			console.error("❌ Failed to create EventSource:", err);
			setError("Failed to establish connection");
			setIsConnected(false);
		}
	};

	const disconnect = () => {
		if (eventSource) {
			eventSource.close();
			setEventSource(null);
			setIsConnected(false);
		}
	};

	const reconnect = () => {
		disconnect();
		connect();
	};

	useEffect(() => {
		connect();

		return () => {
			disconnect();
		};
	}, []);

	// Auto-reconnect on error
	useEffect(() => {
		if (error && !isConnected) {
			const timeoutId = setTimeout(() => {
				reconnect();
			}, 5000); // Reconnect after 5 seconds

			return () => clearTimeout(timeoutId);
		}
	}, [error, isConnected]);

	const value: SessionContextType = {
		sessions,
		isConnected,
		error,
		reconnect,
	};

	return (
		<SessionContext.Provider value={value}>
			{children}
		</SessionContext.Provider>
	);
}

export function useSessions() {
	const context = useContext(SessionContext);
	if (context === undefined) {
		throw new Error("useSessions must be used within a SessionProvider");
	}
	return context;
}
