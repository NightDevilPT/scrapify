// app/api/sessions/provider/[provider]/route.ts
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tenderType: string }> }
) {
	try {
		const provider = (await params).tenderType;

		if (!provider) {
			return NextResponse.json(
				{
					success: false,
					data: null,
					message: "Provider is required",
					error: "MISSING_PROVIDER",
				},
				{ status: 400 }
			);
		}

		// Check if there's any running session for this provider
		const runningSession = await prisma.scrapingSession.findFirst({
			where: {
				provider: provider as any, // Cast to any since we're validating
				status: "RUNNING",
			},
			orderBy: {
				startedAt: "desc",
			},
		});

		return NextResponse.json({
			success: true,
			data: {
				isRunning: !!runningSession,
				runningSession: runningSession,
			},
			message: runningSession
				? `Active session found for ${provider}`
				: `No active session for ${provider}`,
			error: null,
		});
	} catch (error) {
		console.error("Error checking running session:", error);
		return NextResponse.json(
			{
				success: false,
				data: null,
				message: "Internal server error",
				error: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}
