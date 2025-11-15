// components/dashboard/summary-card.tsx
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface SummaryCardProps {
	title: string;
	value: string | number;
	description: string;
	trend: "positive" | "negative" | "warning" | "neutral";
	icon: React.ReactNode;
}

export function SummaryCard({
	title,
	value,
	description,
	trend,
	icon,
}: SummaryCardProps) {
	const getTrendColors = () => {
		switch (trend) {
			case "positive":
				return "text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
			case "negative":
				return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
			case "warning":
				return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
			default:
				return "text-muted-foreground bg-muted border-border";
		}
	};

	const getTrendIcon = () => {
		switch (trend) {
			case "positive":
				return <TrendingUp className="h-3 w-3" />;
			case "negative":
				return <TrendingDown className="h-3 w-3" />;
			case "warning":
				return <Clock className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const getTrendText = () => {
		switch (trend) {
			case "positive":
				return "Positive";
			case "negative":
				return "Negative";
			case "warning":
				return "Warning";
			default:
				return "Neutral";
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-1 flex-row items-center justify-between space-y-0 pb-2">
				<div className="text-sm font-medium text-muted-foreground">
					{title}
				</div>
				<div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted">
					{icon}
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<div className="flex items-center gap-2 mt-2">
					<Badge variant="outline" className={getTrendColors()}>
						{getTrendIcon()}
						{getTrendText()}
					</Badge>
					<p className="text-xs text-muted-foreground">
						{description}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
