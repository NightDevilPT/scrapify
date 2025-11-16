// components/shared/active-session/index.tsx

import { SessionOverview } from "@/interface/dashboard.interface";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, TrendingUp, Loader2, Activity } from "lucide-react";

interface ActiveSessionCardProps {
	session: SessionOverview["activeSessions"][0];
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
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
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3 flex-1">
						<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
							<Loader2 className="h-5 w-5 text-primary animate-spin" />
						</div>
						<div className="flex-1 min-w-0">
							<CardTitle className="text-lg">
								{session.name || `Session ${session.id.slice(-8)}`}
							</CardTitle>
							{session.currentOrganization && (
								<CardDescription className="mt-1">
									{session.currentOrganization}
								</CardDescription>
							)}
							{session.currentStage && (
								<div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
									<Activity className="h-3 w-3" />
									<span className="line-clamp-1">{session.currentStage}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Statistics */}
				<div className="grid grid-cols-2 gap-3 text-xs">
					<div className="space-y-1">
						<div className="text-muted-foreground">Organizations</div>
						<div className="font-medium">
							{session.organizationsScraped}/{session.organizationsFound}
						</div>
					</div>
					<div className="space-y-1">
						<div className="text-muted-foreground">Tenders</div>
						<div className="font-medium">
							{session.tenderScraped}/{session.tendersFound}
						</div>
					</div>
				</div>

				{/* Estimated Time Information */}
				<div className="space-y-2 pt-2 border-t">
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
								<Clock className="h-3 w-3 animate-pulse" />
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
								<TrendingUp className="h-3 w-3 animate-pulse" />
								Rate: Calculating...
							</Badge>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
