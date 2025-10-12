// components/dashboard/active-session-card.tsx

import { Progress } from "@/components/ui/progress";
import { SessionOverview } from "@/interface/dashboard.interface";

interface ActiveSessionCardProps {
	session: SessionOverview["activeSessions"][0];
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
	const getProgressColor = (progress: number) => {
		if (progress > 70) return "bg-green-500";
		if (progress > 40) return "bg-yellow-500";
		return "bg-blue-500";
	};

	return (
		<div className="flex items-center justify-between p-4 rounded-lg border">
			<div className="flex-1">
				<div className="flex items-center gap-3 mb-2">
					<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
						<span className="text-xs font-medium text-primary">
							{session.provider.slice(0, 2)}
						</span>
					</div>
					<div>
						<div className="font-medium">
							{session.name || `Session ${session.id.slice(-8)}`}
						</div>
						<div className="text-sm text-muted-foreground">
							{session.currentOrganization || "Starting..."}
						</div>
					</div>
				</div>
				<div className="space-y-1">
					<div className="flex justify-between text-sm">
						<span>Progress</span>
						<span>{session.progress.toFixed(1)}%</span>
					</div>
					<Progress
						value={session.progress}
						className={`h-2 ${getProgressColor(session.progress)}`}
					/>
				</div>
				<div className="flex gap-4 mt-2 text-xs text-muted-foreground">
					<span>
						{session.organizationsScraped}/
						{session.organizationsFound} orgs
					</span>
					<span>
						{session.tenderScraped}/{session.tendersFound} tenders
					</span>
					<span>{session.currentStage}</span>
				</div>
			</div>
		</div>
	);
}
