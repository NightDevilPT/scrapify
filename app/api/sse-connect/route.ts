// app/api/scraping/connect/route.ts
import { sseService } from "@/lib/sse-service/sse.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	// Create SSE response
	const response = new Response(
		new ReadableStream({
			start(controller) {
				// Send initial connection message
				const encoder = new TextEncoder();
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "CONNECTED",
							data: { message: "SSE connection established" },
							timestamp: new Date().toISOString(),
						})}\n\n`
					)
				);
			},
		}),
		{
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		}
	);

	// Extract metadata from request
	const metadata = {
		userAgent: request.headers.get("user-agent") || undefined,
		ip:
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"unknown",
		sessionId: request.headers.get("x-session-id") || undefined,
	};

	// Add client to SSE service
	const clientId = sseService.addClient(response, metadata);

	// Send client ID immediately
	const writer = response as any;
	if (writer.write) {
		writer.write(
			`data: ${JSON.stringify({
				type: "CLIENT_ID",
				data: { clientId },
				timestamp: new Date().toISOString(),
			})}\n\n`
		);
	}

	// Handle client disconnect
	request.signal.addEventListener("abort", () => {
		sseService.removeClient(clientId);
	});

	return response;
}
