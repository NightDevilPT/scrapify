// components/shared/data-table/data-table.tsx
"use client";

import React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig<T> {
	key: keyof T | string;
	direction: SortDirection;
}

export interface Column<T> {
	key: keyof T | string;
	header: string;
	accessor?: (row: T) => any;
	sortable?: boolean;
	className?: string;
	render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	sortConfig?: SortConfig<T>;
	onSort?: (key: keyof T | string) => void;
	onExport?: (format: "csv" | "json") => void;
	exportFileName?: string;
	enableExport?: boolean;
}

export function DataTable<T extends Record<string, any>>({
	data,
	columns,
	sortConfig,
	onSort,
	onExport,
	exportFileName = "data",
	enableExport = true,
}: DataTableProps<T>) {
	const handleExport = (format: "csv" | "json") => {
		if (onExport) {
			onExport(format);
			return;
		}

		// Default export implementation
		if (format === "csv") {
			exportToCSV(data, columns, exportFileName);
		} else {
			exportToJSON(data, exportFileName);
		}
	};

	const getSortIcon = (columnKey: keyof T | string) => {
		if (!sortConfig || sortConfig.key !== columnKey) {
			return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
		}
		if (sortConfig.direction === "asc") {
			return <ArrowUp className="ml-2 h-4 w-4" />;
		}
		return <ArrowDown className="ml-2 h-4 w-4" />;
	};

	const getValue = (row: T, column: Column<T>) => {
		if (column.accessor) {
			return column.accessor(row);
		}
		return row[column.key as keyof T];
	};

	return (
		<div className="space-y-4 max-h-[500px]">
			{enableExport && (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<Download className="mr-2 h-4 w-4" />
								Export
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => handleExport("csv")}
							>
								Export as CSV
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleExport("json")}
							>
								Export as JSON
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
			<Table>
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<TableHead
								key={String(column.key)}
								className={column.className}
							>
								{column.sortable !== false &&
								onSort ? (
									<button
										onClick={() => onSort(column.key)}
										className="flex items-center hover:opacity-80 transition-opacity"
									>
										{column.header}
										{getSortIcon(column.key)}
									</button>
								) : (
									column.header
								)}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center"
							>
								No results.
							</TableCell>
						</TableRow>
					) : (
						data.map((row, rowIndex) => (
							<TableRow key={rowIndex}>
								{columns.map((column) => {
									const value = getValue(row, column);
									return (
										<TableCell
											key={String(column.key)}
											className={column.className}
										>
											{column.render
												? column.render(value, row)
												: value?.toString() ?? "-"}
										</TableCell>
									);
								})}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

// Helper function to format date to DD-MMM-YYYY TIME format
function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, "0");
	const monthNames = [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun",
		"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
	];
	const month = monthNames[date.getMonth()];
	const year = date.getFullYear();
	
	// Format time as HH:MM:SS AM/PM
	const hours = date.getHours();
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	const ampm = hours >= 12 ? "PM" : "AM";
	const displayHours = hours % 12 || 12;
	const time = `${String(displayHours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
	
	return `${day}-${month}-${year} ${time}`;
}

// Helper function to convert value to string, handling arrays and objects
function valueToString(value: any): string {
	if (value === null || value === undefined) {
		return "";
	}

	// Handle arrays
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "";
		}
		// If array contains objects, stringify each object
		if (typeof value[0] === "object" && value[0] !== null) {
			return value
				.map((item) => {
					// Handle Date objects in arrays
					if (item instanceof Date) {
						return formatDate(item);
					}
					// If object has a meaningful string representation, use it
					if (item.toString && item.toString() !== "[object Object]") {
						return item.toString();
					}
					// Otherwise, use JSON stringify
					try {
						return JSON.stringify(item);
					} catch {
						return String(item);
					}
				})
				.join(", ");
		}
		// Array of primitives or dates, join them
		return value
			.map((item) => (item instanceof Date ? formatDate(item) : String(item)))
			.join(", ");
	}

	// Handle objects (but not Date, which has its own toString)
	if (typeof value === "object" && !(value instanceof Date)) {
		try {
			const stringified = JSON.stringify(value);
			// If it's a meaningful object representation, return it
			if (stringified !== "{}") {
				return stringified;
			}
		} catch {
			// Fall through to toString
		}
	}

	// Handle Date objects
	if (value instanceof Date) {
		return formatDate(value);
	}

	// Handle primitives
	return String(value);
}

// Export utility functions
function exportToCSV<T>(
	data: T[],
	columns: Column<T>[],
	fileName: string
) {
	const headers = columns.map((col) => col.header);
	const rows = data.map((row) =>
		columns.map((col) => {
			// Get the raw value (not the rendered component)
			const rawValue = col.accessor
				? col.accessor(row)
				: row[col.key as keyof T];
			
			// Convert to string handling arrays and objects
			const stringValue = valueToString(rawValue);
			
			// Handle empty strings
			if (!stringValue) {
				return "";
			}
			
			// Escape commas/quotes
			if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
				return `"${stringValue.replace(/"/g, '""')}"`;
			}
			return stringValue;
		})
	);

	const csvContent = [headers, ...rows]
		.map((row) => row.join(","))
		.join("\n");

	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);
	link.setAttribute("href", url);
	link.setAttribute("download", `${fileName}_${Date.now()}.csv`);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function exportToJSON<T>(data: T[], fileName: string) {
	// Convert dates to formatted strings before stringifying
	const formattedData = JSON.parse(JSON.stringify(data, (key, value) => {
		// Check if value is a Date object or a date string
		if (value instanceof Date) {
			return formatDate(value);
		}
		// Handle date strings (ISO format or other formats)
		if (typeof value === "string") {
			const date = new Date(value);
			// Check if it's a valid date string
			if (!isNaN(date.getTime())) {
				return formatDate(date);
			}
		}
		return value;
	}));
	
	const jsonContent = JSON.stringify(formattedData, null, 2);
	const blob = new Blob([jsonContent], {
		type: "application/json;charset=utf-8;",
	});
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);
	link.setAttribute("href", url);
	link.setAttribute("download", `${fileName}_${Date.now()}.json`);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

