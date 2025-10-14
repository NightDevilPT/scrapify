// components/tender-dashboard-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TenderDashboardSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header Skeleton */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-80" />
				</div>
				<Skeleton className="h-8 w-40" />
			</div>

			{/* Summary Cards Skeleton */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				{Array.from({ length: 6 }).map((_, index) => (
					<Card key={index}>
						<CardContent className="p-6">
							<div className="flex items-center space-x-4">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-6 w-16" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Status Distribution Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						{Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={index} className="h-20 rounded-lg" />
						))}
					</div>
				</CardContent>
			</Card>

			{/* Active Sessions Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 2 }).map((_, index) => (
							<Skeleton key={index} className="h-20 rounded-lg" />
						))}
					</div>
				</CardContent>
			</Card>

			{/* Performance and Recent Activity Skeleton */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-56" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton key={index} className="h-12 rounded-lg" />
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{Array.from({ length: 4 }).map((_, index) => (
								<Skeleton key={index} className="h-12 rounded-lg" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}