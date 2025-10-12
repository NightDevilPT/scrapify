// app/api/sessions/events/route.ts
import { NextRequest } from "next/server";
import { sessionManager } from "@/lib/session-manager/session-manager.service";

export async function GET(request: NextRequest) {
	const responseStream = new TransformStream();
	const writer = responseStream.writable.getWriter();
	const encoder = new TextEncoder();

	// Store the last sent session data for comparison
	let lastSessionData = JSON.stringify(sessionManager.getAllSessions());

	// Send initial data
	const initialSessions = sessionManager.getAllSessions();
	writer.write(
		encoder.encode(
			`data: ${JSON.stringify({
				type: "INITIAL",
				data: initialSessions,
			})}\n\n`
		)
	);

	// Set up interval to send updates
	const intervalId = setInterval(async () => {
		try {
			const currentSessions = sessionManager.getAllSessions();
			const currentSessionData = JSON.stringify(currentSessions);

			// Only send update if there are actual changes
			// if (currentSessionData !== lastSessionData) {
			await writer.write(
				encoder.encode(
					`data: ${JSON.stringify({
						type: "UPDATE",
						data: currentSessions,
					})}\n\n`
				)
			);

			// Update last session data
			lastSessionData = currentSessionData;
			// }

			// Keep connection alive with heartbeat
			await writer.write(
				encoder.encode(
					`data: ${JSON.stringify({
						type: "HEARTBEAT",
						timestamp: Date.now(),
					})}\n\n`
				)
			);
		} catch (error) {
			// Client disconnected
			clearInterval(intervalId);
			writer.close();
		}
	}, 5000); // Update every 5 seconds

	// Clean up on client disconnect
	request.signal.addEventListener("abort", () => {
		clearInterval(intervalId);
		writer.close();
	});

	return new Response(responseStream.readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"Content-Encoding": "none",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control",
		},
	});
}
