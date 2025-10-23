// components/shared/active-session/index.tsx

import { Progress } from "@/components/ui/progress";
import { SessionOverview } from "@/interface/dashboard.interface";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";

interface ActiveSessionCardProps {
	session: SessionOverview["activeSessions"][0];
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
	const getProgressColor = (progress: number) => {
		if (progress > 70) return "bg-emerald-500";
		if (progress > 40) return "bg-amber-500";
		return "bg-blue-500";
	};

	const formatEstimatedTime = (estimatedTime?: string) => {
		if (!estimatedTime) return null;
		const date = new Date(estimatedTime);
		const now = new Date();
		const diff = date.getTime() - now.getTime();

		if (diff <= 0) return "Completed";

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	};

	return (
		<div className="flex items-center justify-between p-4 rounded-lg border bg-card">
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
				<div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
					<span>
						{session.organizationsScraped}/
						{session.organizationsFound} orgs
					</span>
					<span>
						{session.tenderScraped}/{session.tendersFound} tenders
					</span>
					{session.currentStage && (
						<span className=" line-clamp-1">
							{session.currentStage}
						</span>
					)}
				</div>

				{/* Estimated Time Information */}
				<div className="mt-3 space-y-2">
					<div className="flex flex-wrap gap-2">
						{session.estimatedTimeRemainingFormatted ? (
							<Badge
								variant="secondary"
								className="text-xs flex items-center gap-1"
							>
								<Clock className="h-3 w-3" />
								ETA: {session.estimatedTimeRemainingFormatted}
							</Badge>
						) : (
							<Badge
								variant="outline"
								className="text-xs flex items-center gap-1"
							>
								<Clock className="h-3 w-3" />
								ETA: Calculating...
							</Badge>
						)}
						{session.scrapingRate ? (
							<Badge
								variant="outline"
								className="text-xs flex items-center gap-1"
							>
								<TrendingUp className="h-3 w-3" />
								{session.scrapingRate.toFixed(1)} tenders/min
							</Badge>
						) : (
							<Badge
								variant="outline"
								className="text-xs flex items-center gap-1"
							>
								<TrendingUp className="h-3 w-3" />
								Rate: Calculating...
							</Badge>
						)}
					</div>
					{session.estimatedCompletionTime ? (
						<div className="text-xs text-muted-foreground">
							Estimated completion:{" "}
							{formatEstimatedTime(
								session.estimatedCompletionTime
							)}
						</div>
					) : (
						<div className="text-xs text-muted-foreground">
							Estimated completion: Calculating...
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
