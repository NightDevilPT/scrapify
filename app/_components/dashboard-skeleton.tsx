// components/dashboard/dashboard-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header Skeleton */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-96" />
				</div>
				<Skeleton className="h-8 w-32" />
			</div>

			{/* Summary Cards Skeleton */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-8 w-8 rounded-full" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-7 w-16 mb-2" />
							<div className="flex items-center gap-2">
								<Skeleton className="h-5 w-16" />
								<Skeleton className="h-3 w-24" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Middle Section Skeleton */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Provider Breakdown Skeleton */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32 mb-1" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-3"
							>
								<div className="flex items-center gap-3">
									<Skeleton className="h-10 w-10 rounded-full" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-3 w-16" />
									</div>
								</div>
								<div className="space-y-2 text-right">
									<Skeleton className="h-4 w-12" />
									<Skeleton className="h-3 w-16" />
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				{/* System Health Skeleton */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32 mb-1" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between"
							>
								<div className="space-y-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-32" />
								</div>
								<Skeleton className="h-6 w-12" />
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			{/* Active Sessions Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32 mb-1" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={i}
							className="p-4 border rounded-lg space-y-3"
						>
							<div className="flex items-center gap-3">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
							<div className="space-y-1">
								<div className="flex justify-between">
									<Skeleton className="h-3 w-12" />
									<Skeleton className="h-3 w-8" />
								</div>
								<Skeleton className="h-2 w-full" />
							</div>
							<div className="flex gap-4">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Bottom Section Skeleton */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Recent Activity Skeleton */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32 mb-1" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={i}
								className="flex justify-between items-center"
							>
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-6 w-16" />
							</div>
						))}
					</CardContent>
				</Card>

				{/* Status Distribution Skeleton */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40 mb-1" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between"
							>
								<div className="flex items-center gap-2">
									<Skeleton className="h-3 w-3 rounded-full" />
									<Skeleton className="h-4 w-20" />
								</div>
								<div className="flex gap-2">
									<Skeleton className="h-4 w-6" />
									<Skeleton className="h-4 w-10" />
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
