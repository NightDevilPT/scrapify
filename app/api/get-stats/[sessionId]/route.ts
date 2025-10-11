import { z } from "zod";
import { ApiResponse } from "@/interface/api.interface";
import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/session-manager/session-manager.service";

// Schema for validating sessionId parameter
const sessionIdSchema = z.string().uuid({
	message: "Invalid session ID format. Must be a valid UUID.",
});

export async function GET(
	{ params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
	try {
		// Resolve params and validate sessionId
		const { sessionId } = await params;
		const validationResult = sessionIdSchema.safeParse(sessionId);

		if (!validationResult.success) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					data: null,
					message: "Invalid session Id",
					error: validationResult.error.message,
				},
				{ status: 400 }
			);
		}

		// Retrieve session from session manager
		const session = await sessionManager.getSession(sessionId);

		if (!session) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					data: null,
					message: "Session not found",
					error: `No session found for ID: ${sessionId}`,
				},
				{ status: 404 }
			);
		}

		// Return success response
		return NextResponse.json<ApiResponse<any>>(
			{
				success: true,
				message: "Session retrieved successfully",
				data: session,
			},
			{ status: 200 }
		);
	} catch (error) {
		// Handle unexpected errors
		const errorMessage =
			error instanceof Error ? error.message : "Internal server error";

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				data: null,
				message: "Internal server error",
				error: errorMessage,
			},
			{ status: 500 }
		);
	}
}
