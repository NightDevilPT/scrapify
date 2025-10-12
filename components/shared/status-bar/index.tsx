// components/dashboard/status-bar.tsx

import { SessionOverview } from "@/interface/dashboard.interface";

interface StatusBarProps {
	status: SessionOverview["statusDistribution"][0];
}

export function StatusBar({ status }: StatusBarProps) {
	const getStatusColor = () => {
		switch (status.status) {
			case "COMPLETED":
				return "bg-green-500";
			case "RUNNING":
				return "bg-blue-500";
			case "FAILED":
				return "bg-red-500";
			case "PAUSED":
				return "bg-yellow-500";
			case "STOPPED":
				return "bg-gray-500";
			default:
				return "bg-gray-300";
		}
	};

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
				<span className="text-sm capitalize">
					{status.status.toLowerCase()}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">{status.count}</span>
				<span className="text-sm text-muted-foreground">
					({status.percentage}%)
				</span>
			</div>
		</div>
	);
}
