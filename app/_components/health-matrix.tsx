// components/dashboard/health-metric.tsx
export interface HealthMetricProps {
	label: string;
	value: string;
	description: string;
	status: "healthy" | "warning" | "critical" | "positive";
}

export function HealthMetric({
	label,
	value,
	description,
	status,
}: HealthMetricProps) {
	const getStatusColor = () => {
		switch (status) {
			case "healthy":
			case "positive":
				return "text-green-600";
			case "warning":
				return "text-yellow-600";
			case "critical":
				return "text-red-600";
			default:
				return "text-foreground";
		}
	};

	return (
		<div className="flex items-center justify-between">
			<div>
				<div className="font-medium">{label}</div>
				<div className="text-sm text-muted-foreground">
					{description}
				</div>
			</div>
			<div className={`text-lg font-semibold ${getStatusColor()}`}>
				{value}
			</div>
		</div>
	);
}
