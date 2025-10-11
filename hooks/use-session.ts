// hooks/useSession.ts
import { useSessions } from "@/components/context/session-provider";
import { IActiveSessionData } from "@/interface/active-scraper-session.interface";
import { useState, useEffect } from "react";


export function useSession(sessionId: string | null) {
	const { sessions, isConnected } = useSessions();
	const [session, setSession] = useState<IActiveSessionData | null>(null);

	useEffect(() => {
		if (sessionId && sessions.length > 0) {
			const foundSession = sessions.find((s) => s.id === sessionId);
			setSession(foundSession || null);
		} else {
			setSession(null);
		}
	}, [sessionId, sessions]);

	return {
		session,
		isConnected,
		exists: !!session,
		isActive: session?.status === "RUNNING",
		isCompleted: session?.status === "COMPLETED",
		isFailed: session?.status === "FAILED",
		isStopped: session?.status === "STOPPED",
		isPaused: session?.status === "PAUSED",
	};
}
