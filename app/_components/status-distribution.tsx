// components/dashboard/status-distribution-chart.tsx
"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import * as React from "react";
import { Activity } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { SessionOverview } from "@/interface/dashboard.interface";

interface StatusDistributionChartProps {
	statusDistribution: SessionOverview["statusDistribution"];
}

// Chart configuration
const chartConfig = {
	running: {
		label: "Running",
		color: "var(--chart-1)",
	},
	completed: {
		label: "Completed",
		color: "var(--chart-2)",
	},
	failed: {
		label: "Failed",
		color: "var(--chart-3)",
	},
	paused: {
		label: "Paused",
		color: "var(--chart-4)",
	},
	stopped: {
		label: "Stopped",
		color: "var(--chart-5)",
	},
} satisfies ChartConfig;

export function StatusDistributionChart({
	statusDistribution,
}: StatusDistributionChartProps) {
	// Transform data for chart
	const chartData = statusDistribution.map((status) => {
		const statusKey =
			status.status.toLowerCase() as keyof typeof chartConfig;
		const config = chartConfig[statusKey] || chartConfig.stopped;

		return {
			status: status.status,
			label: config.label,
			count: status.count,
			percentage: status.percentage,
			fill: config.color,
		};
	});

	const totalSessions = statusDistribution.reduce(
		(sum, status) => sum + status.count,
		0
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<CardTitle className="text-sm font-medium">
						Status Distribution
					</CardTitle>
					<CardDescription>
						{totalSessions} total sessions
					</CardDescription>
				</div>
				<div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted">
					<Activity className="h-4 w-4" />
				</div>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[200px] w-full"
				>
					<BarChart
						data={chartData}
						margin={{
							top: 10,
							right: 10,
							left: 10,
							bottom: 20,
						}}
					>
						<CartesianGrid
							vertical={false}
							stroke="var(--border)"
							strokeDasharray="3 3"
						/>
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={8}
							tick={{
								fontSize: 12,
								fill: "var(--muted-foreground)",
							}}
							tickFormatter={(value) =>
								value.length > 8
									? value.slice(0, 8) + "..."
									: value
							}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelKey="label"
									formatter={(value, name) => [
										value,
										" Sessions",
									]}
									labelFormatter={(value, payload) => {
										const data = payload?.[0]?.payload;
										return data
											? `${data.label} (${data.percentage}%)`
											: value;
									}}
								/>
							}
						/>
						<Bar
							dataKey="count"
							fill="var(--color-running)"
							radius={[4, 4, 0, 0]}
							barSize={32}
						/>
					</BarChart>
				</ChartContainer>

				{/* Status Summary */}
				<div className="mt-4 grid grid-cols-5 gap-3 text-xs">
					{statusDistribution.map((status) => {
						const statusKey =
							status.status.toLowerCase() as keyof typeof chartConfig;
						const config =
							chartConfig[statusKey] || chartConfig.stopped;

						return (
							<div
								key={status.status}
								className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
							>
								<div className="flex items-center gap-2">
									<div
										className="h-2 w-2 rounded-full"
										style={{
											backgroundColor: `var(--color-${statusKey})`,
										}}
									/>
									<span className="font-medium">
										{config.label}
									</span>
								</div>
								<div className="text-right">
									<div className="font-bold">
										{status.count}
									</div>
									<div className="text-muted-foreground">
										{status.percentage}%
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
