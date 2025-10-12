// components/dashboard/provider-card.tsx

import { SessionOverview } from "@/interface/dashboard.interface";

interface ProviderCardProps {
	provider: SessionOverview["providerBreakdown"][0];
}

export function ProviderCard({ provider }: ProviderCardProps) {
	return (
		<div className="flex items-center justify-between p-3 rounded-lg border">
			<div className="flex items-center gap-3">
				<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
					<span className="text-sm font-medium text-primary">
						{provider.provider.slice(0, 2)}
					</span>
				</div>
				<div>
					<div className="font-medium">{provider.provider}</div>
					<div className="text-sm text-muted-foreground">
						{provider.activeSessions} active
					</div>
				</div>
			</div>
			<div className="text-right">
				<div className="font-medium text-green-600">
					{provider.successRate}%
				</div>
				<div className="text-sm text-muted-foreground">
					{provider.totalTendersSaved.toLocaleString()} tenders
				</div>
			</div>
		</div>
	);
}
