// components/shared/data-table/pagination-controls.tsx
"use client";

import React from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface PaginationControlsProps {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	pageSizeOptions?: number[];
	showPageSizeSelector?: boolean;
	showPageInfo?: boolean;
}

export function PaginationControls({
	currentPage,
	totalPages,
	totalCount,
	pageSize,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = [5, 10, 15, 20, 25, 30, 50, 75, 100],
	showPageSizeSelector = true,
	showPageInfo = true,
}: PaginationControlsProps) {
	const handlePageSizeChange = (value: string) => {
		const newPageSize = parseInt(value, 10);
		onPageSizeChange(newPageSize);
		// Reset to first page when changing page size
		if (currentPage > 1) {
			onPageChange(1);
		}
	};

	const getPageNumbers = (): (number | "ellipsis")[] => {
		const pages: (number | "ellipsis")[] = [];

		if (totalPages <= 6) {
			// Show all pages if 6 or fewer
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Pages > 6: show ellipsis
			if (currentPage <= 3) {
				// Show: 1, 2, 3, 4, 5, ..., last
				for (let i = 1; i <= 5; i++) {
					pages.push(i);
				}
				pages.push("ellipsis");
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				// Show: 1, ..., last-4, last-3, last-2, last-1, last
				pages.push(1);
				pages.push("ellipsis");
				for (let i = totalPages - 4; i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				// Show: 1, ..., current-1, current, current+1, ..., last
				pages.push(1);
				pages.push("ellipsis");
				pages.push(currentPage - 1);
				pages.push(currentPage);
				pages.push(currentPage + 1);
				pages.push("ellipsis");
				pages.push(totalPages);
			}
		}

		return pages;
	};

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-5 pt-5">
			{totalPages > 1 && (
				<Pagination className="w-auto">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								onClick={() => {
									if (currentPage > 1) {
										onPageChange(currentPage - 1);
									}
								}}
								className={
									currentPage === 1
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>

						{getPageNumbers().map((page, index) => {
							if (page === "ellipsis") {
								return (
									<PaginationItem key={`ellipsis-${index}`}>
										<PaginationEllipsis />
									</PaginationItem>
								);
							}
							return (
								<PaginationItem key={page}>
									<PaginationLink
										onClick={() => onPageChange(page)}
										isActive={currentPage === page}
										className="cursor-pointer"
									>
										{page}
									</PaginationLink>
								</PaginationItem>
							);
						})}

						<PaginationItem>
							<PaginationNext
								onClick={() => {
									if (currentPage < totalPages) {
										onPageChange(currentPage + 1);
									}
								}}
								className={
									currentPage === totalPages
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
			{showPageSizeSelector && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground whitespace-nowrap">
						Rows per page:
					</span>
					<Select
						value={pageSize.toString()}
						onValueChange={handlePageSizeChange}
					>
						<SelectTrigger className="w-[100px]" size="sm">
							<SelectValue placeholder={pageSize.toString()} />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
		</div>
	);
}
