// components/shared/tender-table/index.tsx
"use client";

import React from "react";
import { Tender } from "@prisma/client";
import { ApiResponse } from "@/interface/api.interface";
import apiService from "@/lib/api-service/api.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "./table-skeleton";
import {
	DataTable,
	Column,
	SortConfig,
} from "@/components/shared/data-table/data-table";
import { PaginationControls } from "@/components/shared/data-table/pagination-controls";
import {
	sortData,
	toggleSort,
} from "@/components/shared/data-table/table-utils";

interface TenderTableProps {
	provider: string;
}

export function TenderTable({ provider }: TenderTableProps) {
	const [allTenders, setAllTenders] = React.useState<Tender[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [totalCount, setTotalCount] = React.useState(0);
	const [currentPage, setCurrentPage] = React.useState(1);
	const [pageSize, setPageSize] = React.useState(10);
	const [sortConfig, setSortConfig] =
		React.useState<SortConfig<Tender> | null>(null);
	const cardRef = React.useRef<HTMLDivElement>(null);

	const fetchTenders = React.useCallback(async () => {
		if (!provider) return;

		setLoading(true);
		try {
			// Fetch all tenders without pagination - we'll paginate on frontend
			const response = await apiService.get<Tender[]>(
				`/api/tenders/${provider}?all=true`
			);

			console.log(
				`[TenderTable] Fetch response for ${provider}:`,
				response
			);

			if (response.success && response.data) {
				const responseAny = response as any;

				// Get all tenders - we'll handle pagination and sorting on frontend
				const tendersArray = Array.isArray(response.data)
					? response.data
					: responseAny.data || [];

				const total =
					responseAny.totalCount || tendersArray.length || 0;

				setAllTenders(tendersArray);
				setTotalCount(total);
				console.log(
					`[TenderTable] Fetched ${tendersArray.length} tenders (totalCount: ${total})`
				);
			} else {
				console.error(
					`[TenderTable] API returned unsuccessful response:`,
					response
				);
				setAllTenders([]);
				setTotalCount(0);
			}
		} catch (err: any) {
			console.error("[TenderTable] Error fetching tenders:", err);
			setAllTenders([]);
			setTotalCount(0);
		} finally {
			setLoading(false);
		}
	}, [provider]);

	// Reset to page 1 and clear sort when provider changes
	React.useEffect(() => {
		if (provider) {
			setCurrentPage(1);
			setSortConfig(null);
		}
	}, [provider]);

	// Fetch tenders when provider changes
	React.useEffect(() => {
		if (provider) {
			fetchTenders();
		}
	}, [provider, fetchTenders]);

	// Auto-refresh every 30 seconds if not loading
	React.useEffect(() => {
		if (!provider || loading) return;

		const interval = setInterval(() => {
			fetchTenders();
		}, 30000); // Refresh every 30 seconds

		return () => clearInterval(interval);
	}, [provider, loading, fetchTenders]);

	// Sort and paginate data
	const sortedTenders = React.useMemo(() => {
		return sortData(allTenders, sortConfig);
	}, [allTenders, sortConfig]);

	const paginatedTenders = React.useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		const end = start + pageSize;
		return sortedTenders.slice(start, end);
	}, [sortedTenders, currentPage, pageSize]);

	const totalPages = Math.ceil(sortedTenders.length / pageSize);

	const handleSort = (key: keyof Tender | string) => {
		const newSortConfig = toggleSort(sortConfig, key);
		setSortConfig(newSortConfig);
		setCurrentPage(1); // Reset to first page when sorting changes
	};

	// Define columns for the tender table
	const columns: Column<Tender>[] = React.useMemo(
		() => [
			{
				key: "tenderId",
				header: "Tender ID",
				className: "whitespace-nowrap w-auto",
				render: (value) => <span className="font-medium">{value}</span>,
			},
			{
				key: "tenderRefNo",
				header: "Reference No",
				className: "whitespace-nowrap w-auto",
			},
			{
				key: "tenderValue",
				header: "Tender Value",
				className: "whitespace-nowrap w-auto",
				render: (value) => (value ? `₹${value.toLocaleString()}` : "-"),
			},
			{
				key: "tenderType",
				header: "Tender Type",
				className: "whitespace-nowrap w-auto",
				render: (value) => value || "-",
			},
			{
				key: "contractDate",
				header: "Contract Date",
				className: "whitespace-nowrap w-auto",
				render: (value) => (typeof value === "string" ? value : value ? String(value) : "-"),
			},
			{
				key: "completionInfo",
				header: "Completion Info",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "priceCategory",
				header: "Price Category",
				className: "whitespace-nowrap w-auto",
				sortable: false,
				accessor: (row) => row.tenderValue || 0,
				render: (value, row) => {
					const tenderValue = row.tenderValue;
					if (!tenderValue || tenderValue === null) {
						return <Badge variant="outline">N/A</Badge>;
					}

					const fiveCR = 50000000; // 5 Crores = 50,000,000
					const hundredCR = 1000000000; // 100 Crores = 1,000,000,000

					if (tenderValue < fiveCR) {
						return (
							<Badge
								variant="secondary"
								className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
							>
								Low
							</Badge>
						);
					} else if (
						tenderValue >= fiveCR &&
						tenderValue <= hundredCR
					) {
						return (
							<Badge
								variant="default"
								className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
							>
								Medium
							</Badge>
						);
					} else {
						return (
							<Badge
								variant="destructive"
								className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
							>
								High
							</Badge>
						);
					}
				},
			},
			{
				key: "numberOfBidsReceived",
				header: "Bids Received",
				className: "whitespace-nowrap w-auto",
				render: (value) => (typeof value === "number" ? value : value ?? "-"),
			},
			{
				key: "numberOfBidderSelected",
				header: "Bidders Selected",
				className: "whitespace-nowrap w-auto",
				render: (value) => (typeof value === "number" ? value : value ?? "-"),
			},
			{
				key: "selectedBidders",
				header: "Selected Bidders",
				accessor: (row) => Array.isArray(row.selectedBidders) ? row.selectedBidders : [],
				render: (value) => {
					const list = Array.isArray(value) ? value : [];
					if (!list.length) {
						return <span>-</span>;
					}
					return (
						<div className="flex flex-wrap gap-1" title={list.join(", ")}>
							{list.map((name: string, idx: number) => (
								<Badge key={`${name}-${idx}`} variant="default">
									{name}
								</Badge>
							))}
						</div>
					);
				},
			},
			{
				key: "selectedBiddersAddress",
				header: "Bidders Address",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "workDescription",
				header: "Work Description",
				className: "",
				render: (value, row) => (
					<div className="" title={value}>
						{value}
					</div>
				),
			},
			{
				key: "preBidMeetingDate",
				header: "Pre-Bid Meeting Date",
				className: "whitespace-nowrap w-auto",
				render: (value) =>
					typeof value === "string"
						? value
						: value
						? String(value)
						: "-",
			},
			{
				key: "preBidMeetingAddress",
				header: "Pre-Bid Meeting Address",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "preBidMeetingPlace",
				header: "Pre-Bid Meeting Place",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "periodOfWork",
				header: "Period of Work",
				className: "whitespace-nowrap",
				render: (value) => value || "-",
			},
			{
				key: "organisationChain",
				header: "Organisation Chain",
				className: "",
				render: (value, row) => (
					<div className="" title={value}>
						{value}
					</div>
				),
			},
			{
				key: "organisation",
				header: "Organization",
				className: "",
				render: (value, row) => (
					<div className="" title={value}>
						{value}
					</div>
				),
			},
			{
				key: "tenderInvitingAuthorityName",
				header: "Tender Inviting Authority Name",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "tenderInvitingAuthorityAddress",
				header: "Tender Inviting Authority Address",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "emdAmount",
				header: "EMD Amount",
				className: "whitespace-nowrap",
				render: (value) => (value ? `₹${value.toLocaleString()}` : "-"),
			},
			{
				key: "emdFeeType",
				header: "EMD Fee Type",
				className: "",
				render: (value) => value || "-",
			},
			{
				key: "emdExceptionAllowed",
				header: "EMD Exception Allowed",
				className: "whitespace-nowrap",
				render: (value) => (value ? "Yes" : "No"),
			},
			{
				key: "emdPercentage",
				header: "EMD Percentage",
				className: "whitespace-nowrap",
				render: (value) =>
					value !== null && value !== undefined ? `${value}%` : "-",
			},
			{
				key: "emdPayableTo",
				header: "EMD Payable To",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "emdPayableAt",
				header: "EMD Payable At",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "principal",
				header: "Principal",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "location",
				header: "Location",
				className: "",
				render: (value) => value || "-",
			},
			{
				key: "pincode",
				header: "Pincode",
				className: "whitespace-nowrap",
				render: (value) => value || "-",
			},
			{
				key: "publishedDate",
				header: "Published Date",
				className: "whitespace-nowrap",
				render: (value) =>
					typeof value === "string" ? value : String(value || "-"),
			},
			{
				key: "bidOpeningDate",
				header: "Bid Opening Date",
				className: "whitespace-nowrap",
				render: (value) =>
					typeof value === "string"
						? value
						: value
						? String(value)
						: "-",
			},
			{
				key: "bidSubmissionStartDate",
				header: "Bid Submission Start Date",
				className: "whitespace-nowrap",
				render: (value) =>
					typeof value === "string"
						? value
						: value
						? String(value)
						: "-",
			},
			{
				key: "bidSubmissionEndDate",
				header: "Bid Submission End Date",
				className: "whitespace-nowrap",
				render: (value) =>
					typeof value === "string"
						? value
						: value
						? String(value)
						: "-",
			},
			{
				key: "isSuretyBondAllowed",
				header: "Surety Bond Allowed",
				className: "whitespace-nowrap",
				render: (value) => (value ? "Yes" : "No"),
			},
			{
				key: "sourceOfTender",
				header: "Source of Tender",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "compressedTenderDocumentsURI",
				header: "Compressed Documents URI",
				className: "",
				render: (value) => (
					<div className="" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "provider",
				header: "Provider",
				className: "whitespace-nowrap",
			},
			{
				key: "scrapedAt",
				header: "Scraped At",
				className: "whitespace-nowrap",
				render: (value) =>
					value instanceof Date
						? value.toLocaleString()
						: typeof value === "string"
						? new Date(value).toLocaleString()
						: "-",
			},
			{
				key: "sessionId",
				header: "Session ID",
				className: "max-w-[220px] truncate",
				render: (value) => (
					<div className="truncate" title={value || ""}>
						{value || "-"}
					</div>
				),
			},
			{
				key: "createdAt",
				header: "Created At",
				className: "whitespace-nowrap",
				render: (value) =>
					value instanceof Date
						? value.toLocaleString()
						: typeof value === "string"
						? new Date(value).toLocaleString()
						: "-",
			},
			{
				key: "updatedAt",
				header: "Updated At",
				className: "whitespace-nowrap",
				render: (value) =>
					value instanceof Date
						? value.toLocaleString()
						: typeof value === "string"
						? new Date(value).toLocaleString()
						: "-",
			},
			{
				key: "action",
				header: "Action",
				className: "whitespace-nowrap",
				sortable: false,
				render: (_, row) => (
					<a
						href={row.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline flex items-center gap-1"
					>
						View
						<ExternalLink className="h-3 w-3" />
					</a>
				),
			},
		],
		[]
	);

	// Helper function to format date to DD-MMM-YYYY TIME format
	const formatDate = (date: Date): string => {
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
	};

	// Helper function to check if a string is a valid date and convert it
	const parseDate = (value: any): Date | null => {
		if (value instanceof Date) {
			return value;
		}
		if (typeof value === "string") {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				return date;
			}
		}
		return null;
	};

	// Helper function to convert value to string, handling arrays and objects
	const valueToString = (value: any): string => {
		if (value === null || value === undefined) {
			return "";
		}

		// Check if value is a date (Date object or date string)
		const dateValue = parseDate(value);
		if (dateValue) {
			return formatDate(dateValue);
		}

		// Handle arrays
		if (Array.isArray(value)) {
			if (value.length === 0) {
				return "";
			}
			// If array contains objects, stringify each object
			if (typeof value[0] === "object" && value[0] !== null && !(value[0] instanceof Date)) {
				return value
					.map((item) => {
						// Handle Date objects in arrays
						const itemDate = parseDate(item);
						if (itemDate) {
							return formatDate(itemDate);
						}
						// If object has a meaningful string representation, use it
						if (item && typeof item === "object" && item.toString && item.toString() !== "[object Object]") {
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
				.map((item) => {
					const itemDate = parseDate(item);
					return itemDate ? formatDate(itemDate) : String(item);
				})
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

		// Handle primitives
		return String(value);
	};

	const handleExport = (format: "csv" | "json") => {
		const dataToExport = format === "csv" ? allTenders : sortedTenders;
		const fileName = `tenders_${provider.toLowerCase()}`;

		// Use DataTable's export functionality
		if (format === "csv") {
			// Export all data to CSV
			const headers = columns.map((col) => col.header);
			const rows = dataToExport.map((tender) =>
				columns.map((col) => {
					// Get the raw value (not the rendered React component)
					// Don't use col.render() as it returns React components
					const rawValue = col.accessor
						? col.accessor(tender)
						: tender[col.key as keyof Tender];
					
					// Convert to string handling arrays and objects
					const stringValue = valueToString(rawValue);
					
					// Handle empty strings
					if (!stringValue) {
						return "";
					}
					
					// Escape commas/quotes/newlines
					if (
						stringValue.includes(",") ||
						stringValue.includes('"') ||
						stringValue.includes("\n")
					) {
						return `"${stringValue.replace(/"/g, '""')}"`;
					}
					return stringValue;
				})
			);

			const csvContent = [headers, ...rows]
				.map((row) => row.join(","))
				.join("\n");

			const blob = new Blob([csvContent], {
				type: "text/csv;charset=utf-8;",
			});
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", `${fileName}_${Date.now()}.csv`);
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else {
			// Convert dates to formatted strings before stringifying
			const formattedData = JSON.parse(JSON.stringify(dataToExport, (key, value) => {
				// Check if value is a Date object or a date string
				if (value instanceof Date) {
					return formatDate(value);
				}
				// Handle date strings (ISO format or other formats)
				if (typeof value === "string") {
					const date = parseDate(value);
					if (date) {
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
	};

	return (
		<Card ref={cardRef} className="w-full max-w-full overflow-hidden">
			<CardHeader className="px-6 py-0">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<CardTitle className="text-lg">
						Scraped Tenders
						{totalCount > 0 && (
							<span className="text-sm font-normal text-muted-foreground ml-2">
								({totalCount} total)
							</span>
						)}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={fetchTenders}
							disabled={loading}
							title="Refresh tenders"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
							<span className="ml-2">Refresh</span>
						</Button>
					</div>
				</div>
			</CardHeader>
			<Separator />
			<CardContent className="p-0 grid grid-cols-1">
				<div className="overflow-x-auto px-6 pb-6">
					{loading ? (
						<TableSkeleton rows={10} columns={columns.length} />
					) : allTenders.length === 0 ? (
						<div className="text-center py-8 px-6 text-muted-foreground">
							No tenders found for {provider}
						</div>
					) : (
						<DataTable
							data={paginatedTenders}
							columns={columns}
							sortConfig={sortConfig || undefined}
							onSort={handleSort}
							onExport={handleExport}
							exportFileName={`tenders_${provider.toLowerCase()}`}
							enableExport={true}
						/>
					)}
				</div>

				{/* Pagination */}
				{!loading && allTenders.length > 0 && (
					<PaginationControls
						currentPage={currentPage}
						totalPages={totalPages}
						totalCount={sortedTenders.length}
						pageSize={pageSize}
						onPageChange={setCurrentPage}
						onPageSizeChange={setPageSize}
						pageSizeOptions={[5, 10, 15, 20, 25, 30, 50, 75, 100]}
						showPageSizeSelector={true}
						showPageInfo={true}
					/>
				)}
			</CardContent>
		</Card>
	);
}
