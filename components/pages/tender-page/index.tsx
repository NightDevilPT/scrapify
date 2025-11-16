"use client";
import {
	Loader2,
	RefreshCw,
	Building2,
	Play,
	StopCircle,
	Filter,
} from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import React from "react";
import { Label } from "@/components/ui/label";
import { DateRange } from "react-day-picker";
import { SessionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiService from "@/lib/api-service/api.service";
import { TenderDashboard } from "./tender-dashboard";
import { ApiResponse } from "@/interface/api.interface";
import { TooltipComponent } from "@/components/shared/tooltip";
import { OrganizationInfo } from "@/lib/scraper/scraper.interface";
import FilterComponent from "@/components/shared/filter-component";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TenderTable } from "@/components/shared/tender-table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TenderPageProps {
	tenderType: string;
}

interface RunningSessionData {
	isRunning: boolean;
	runningSession: {
		id: string;
		name?: string;
		provider: string;
		status: SessionStatus;
		progress: number;
		startedAt: string;
		lastActivityAt: string;
		currentOrganization?: string;
		currentStage?: string;
	} | null;
}

const TenderPage = ({ tenderType }: TenderPageProps) => {
	const [organizations, setOrganizations] = React.useState<
		OrganizationInfo[]
	>([]);
	const [selectedOrganizations, setSelectedOrganizations] = React.useState<
		OrganizationInfo[]
	>([]);
	const [loading, setLoading] = React.useState(false);
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
		from: (() => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			return yesterday;
		})(),
		to: new Date(),
	});
	const [tenderNumber, setTenderNumber] = React.useState<number>(10);
	const [limitedTenderOnly, setLimitedTenderOnly] = React.useState(false);
	const [sessionStatus, setSessionStatus] =
		React.useState<RunningSessionData>({
			isRunning: false,
			runningSession: null,
		});
	const [checkingSession, setCheckingSession] = React.useState(false);
	const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);

	const fetchOrganizations = async () => {
		if (!tenderType) return;

		setLoading(true);

		try {
			const response: ApiResponse<OrganizationInfo[]> =
				await apiService.post<OrganizationInfo[]>(
					"/api/get-organizations",
					{
						provider: tenderType,
					}
				);

			if (response.success && response.data) {
				setOrganizations(response.data);
			}
		} catch (err: any) {
			console.error("Error fetching organizations:", err);
		} finally {
			setLoading(false);
		}
	};

	const checkRunningSession = async () => {
		if (!tenderType) return;

		setCheckingSession(true);
		try {
			const response: ApiResponse<RunningSessionData> =
				await apiService.get<RunningSessionData>(
					`/api/sessions/provider/${tenderType}`
				);
			if (response.success && response.data) {
				setSessionStatus(response.data);
			}
		} catch (err: any) {
			console.error("Error checking session status:", err);
		} finally {
			setCheckingSession(false);
		}
	};

	const handleStartScraping = async () => {
		if (!tenderType || sessionStatus.isRunning) return;

		try {
			// Start scraping session
			const response = await apiService.post("/api/scrape", {
				provider: tenderType,
				organizations: selectedOrganizations.map((org) => org.value),
				tendersPerOrganization: tenderNumber,
				isTenderPerOrganizationLimited: limitedTenderOnly,
				dateRange,
			});

			if (response.success) {
				// Refresh session status
				await checkRunningSession();
				// Close filter popover after starting
				setFilterPopoverOpen(false);
			}
		} catch (err: any) {
			console.error("Error starting scraping:", err);
		}
	};

	const handleStopScraping = async () => {
		if (!sessionStatus.runningSession?.id) return;

		try {
			const response = await apiService.post(`/api/scrape/stop`, {
				sessionId: sessionStatus.runningSession.id,
			});

			if (response.success) {
				// Refresh session status
				await checkRunningSession();
			}
		} catch (err: any) {
			console.error("Error stopping scraping:", err);
		}
	};

	const handleSelectionChange = (selected: OrganizationInfo[]) => {
		setSelectedOrganizations(selected);
	};

	const handleRefresh = () => {
		fetchOrganizations();
		checkRunningSession();
	};

	const clearAllOrganizations = () => {
		setSelectedOrganizations([]);
	};

	const handleResetFilters = () => {
		setTenderNumber(10);
		setLimitedTenderOnly(false);
		setDateRange({ from: undefined, to: undefined });
	};

	const handleApplyFilters = () => {
		console.log("Applied filters:", {
			provider: tenderType,
			tendersPerOrganization: tenderNumber,
			isTenderPerOrganizationLimited: limitedTenderOnly,
			dateRange,
			organizations: selectedOrganizations.map((item) => item.value),
		});
		// Close popover after applying filters
		setFilterPopoverOpen(false);
	};

	// Auto-fetch organizations and check session status when tenderType changes
	React.useEffect(() => {
		if (tenderType) {
			fetchOrganizations();
			checkRunningSession();
		}
	}, [tenderType]);

	// Poll for session status updates if a session is running
	React.useEffect(() => {
		let interval: NodeJS.Timeout;

		if (sessionStatus.isRunning) {
			interval = setInterval(() => {
				checkRunningSession();
			}, 5000); // Check every 5 seconds
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [sessionStatus.isRunning]);

	return (
		<div className="w-full space-y-4 px-2">
			{/* Compact Header Card */}
			<Card className="overflow-hidden">
				<CardHeader>
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<Building2 className="h-8 w-8 text-primary flex-shrink-0" />
							<div className="min-w-0 flex-1">
								<CardTitle className="text-lg flex items-center gap-2 truncate">
									{tenderType} Dashboard
									{sessionStatus.isRunning && (
										<Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
									)}
								</CardTitle>
								<Label className="text-muted-foreground text-xs mt-1 block truncate">
									{selectedOrganizations.length} organizations
									selected
								</Label>
							</div>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							{/* Filter Popover Trigger */}
							<Popover
								open={filterPopoverOpen}
								onOpenChange={setFilterPopoverOpen}
							>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="flex items-center gap-2"
									>
										<Filter className="h-4 w-4" />
										Filters
										{selectedOrganizations.length > 0 && (
											<Badge
												variant="secondary"
												className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
											>
												{selectedOrganizations.length}
											</Badge>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[500px] max-h-[80vh] overflow-y-auto p-4">
									<FilterComponent
										tenderType={tenderType}
										organizations={organizations}
										selectedOrganizations={
											selectedOrganizations
										}
										loading={loading}
										dateRange={dateRange}
										tenderNumber={tenderNumber}
										limitedTenderOnly={limitedTenderOnly}
										onDateRangeChange={setDateRange}
										onTenderNumberChange={setTenderNumber}
										onLimitedTenderChange={
											setLimitedTenderOnly
										}
										onOrganizationSelectionChange={
											handleSelectionChange
										}
										onResetFilters={handleResetFilters}
										onApplyFilters={handleApplyFilters}
										onClearAllOrganizations={
											clearAllOrganizations
										}
									/>
								</PopoverContent>
							</Popover>

							{/* Start/Stop Buttons */}
							<TooltipComponent
								content={
									sessionStatus.isRunning
										? "Scraping is already in progress"
										: "Start tender scraping"
								}
							>
								<Button
									variant={"outline"}
									size="sm"
									onClick={handleStartScraping}
									disabled={
										sessionStatus.isRunning ||
										selectedOrganizations.length === 0 ||
										checkingSession
									}
									className="flex items-center gap-2"
								>
									{checkingSession ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Play className="h-4 w-4" />
									)}
									Start
								</Button>
							</TooltipComponent>

							{sessionStatus.isRunning && (
								<TooltipComponent content="Stop current scraping session">
									<Button
										variant={"destructive"}
										size="sm"
										onClick={handleStopScraping}
										disabled={
											!sessionStatus.isRunning ||
											checkingSession
										}
										className="flex items-center gap-2"
									>
										{checkingSession ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<StopCircle className="h-4 w-4" />
										)}
										Stop
									</Button>
								</TooltipComponent>
							)}

							{/* Refresh Button */}
							<Button
								onClick={handleRefresh}
								disabled={
									loading || !tenderType || checkingSession
								}
								variant="outline"
								size="sm"
								className="flex items-center gap-2"
							>
								{loading || checkingSession ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
								Refresh
							</Button>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Tender Dashboard */}
			<TenderDashboard tenderType={tenderType} />

			{/* Tenders Table - Separate Component */}
			<TenderTable provider={tenderType} />
		</div>
	);
};

export default TenderPage;
