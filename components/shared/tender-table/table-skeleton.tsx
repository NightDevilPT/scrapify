// components/shared/tender-table/table-skeleton.tsx
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
}

export function TableSkeleton({ rows = 10, columns = 38 }: TableSkeletonProps) {
	return (
		<Table className="w-full">
			<TableHeader>
				<TableRow>
					{Array.from({ length: columns }).map((_, i) => (
						<TableHead key={i} className="whitespace-nowrap">
							<Skeleton className="h-5 w-20" />
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<TableRow key={rowIndex}>
						{Array.from({ length: columns }).map((_, colIndex) => (
							<TableCell key={colIndex} className="whitespace-nowrap">
								<Skeleton className="h-4 w-full" />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

