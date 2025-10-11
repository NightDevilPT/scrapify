import { ApiResponse } from "@/interface/api.interface";
import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/session-manager/session-manager.service";

export async function GET() {
	try {
		const session = sessionManager.getAllSessions();
		const response: ApiResponse<any> = {
			success: true,
			data: session,
			message: "Session retrieved successfully",
			error: null,
		};
		return NextResponse.json(response);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		const response: ApiResponse<null> = {
			success: false,
			data: null,
			message: "Failed to retrieve sessions",
			error: errorMessage,
		};
		return NextResponse.json(response, { status: 500 });
	}
}
