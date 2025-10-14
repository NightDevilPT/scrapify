// app/api/scrape/stop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/session-manager/session-manager.service";
import { ApiResponse } from "@/interface/api.interface";

export async function POST(request: NextRequest) {
	try {
		const { sessionId } = await request.json();

		if (!sessionId) {
			const response: ApiResponse<null> = {
				success: false,
				data: null,
				message: "Validation failed",
				error: "Session ID is required",
			};
			return NextResponse.json(response, { status: 400 });
		}

		// Stop the session in session manager
		const stopped = await sessionManager.stopSession(sessionId);

		if (!stopped) {
			const response: ApiResponse<null> = {
				success: false,
				data: null,
				message: "Session not found",
				error: `No active session found with ID: ${sessionId}`,
			};
			return NextResponse.json(response, { status: 404 });
		}

		const response: ApiResponse<string> = {
			success: true,
			data: sessionId,
			message: "Scraping session stopped successfully",
			error: null,
		};

		return NextResponse.json(response);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		const response: ApiResponse<null> = {
			success: false,
			data: null,
			message: "Failed to stop session",
			error: errorMessage,
		};

		return NextResponse.json(response, { status: 500 });
	}
}
