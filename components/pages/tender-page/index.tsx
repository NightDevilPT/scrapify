"use client";
import {
	Loader2,
	RefreshCw,
	AlertCircle,
	Building2,
	Play,
	StopCircle,
} from "lucide-react";
import React from "react";
import { Label } from "@/components/ui/label";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiService from "@/lib/api-service/api.service";
import { ApiResponse } from "@/interface/api.interface";
import { TooltipComponent } from "@/components/shared/tooltip";
import { OrganizationInfo } from "@/lib/scraper/scraper.interface";
import FilterComponent from "@/components/shared/filter-component";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TenderPageProps {
	tenderType: string;
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
		} finally {
			setLoading(false);
		}
	};

	const handleSelectionChange = (selected: OrganizationInfo[]) => {
		setSelectedOrganizations(selected);
	};

	const handleRefresh = () => {
		fetchOrganizations();
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
	};

	// Auto-fetch organizations when tenderType changes
	React.useEffect(() => {
		if (tenderType) {
			fetchOrganizations();
		}
	}, [tenderType]);

	return (
		<div className="w-full space-y-6">
			<Card className="bg-transparent border-none p-0 shadow-none">
				<CardHeader className="p-0 px-4">
					<CardTitle className="flex items-center justify-between text-xl">
						<div className="flex items-center gap-3">
							<Building2 className="h-6 w-6 text-muted-foreground" />
							<span>Tender Type - {tenderType}</span>
							<Badge variant="secondary" className="text-sm">
								{selectedOrganizations.length} selected
							</Badge>
						</div>

						<div className="space-x-3">
							<TooltipComponent content="Start tender scraping">
								<Button variant={"outline"}>
									<Play />
								</Button>
							</TooltipComponent>

							<TooltipComponent content="Stop tender scraping">
								<Button variant={"destructive"}>
									<StopCircle />
								</Button>
							</TooltipComponent>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6 p-0 px-4 shadow-none">
					{/* Provider Info and Refresh Section */}
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg border">
						<div className="space-y-2">
							<Label className="text-base font-medium">
								Current Provider
							</Label>
							<div className="flex items-center gap-3">
								<Badge
									variant="outline"
									className="text-sm font-normal"
								>
									{tenderType}
								</Badge>
								{organizations.length > 0 && (
									<span className="text-sm text-muted-foreground">
										{organizations.length} organizations
										available
									</span>
								)}
							</div>
						</div>
						<Button
							onClick={handleRefresh}
							disabled={loading || !tenderType}
							variant="outline"
							className="flex items-center gap-2"
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
							Refresh Data
						</Button>
					</div>

					{/* Filter Section */}
					<FilterComponent
						tenderType={tenderType}
						organizations={organizations}
						selectedOrganizations={selectedOrganizations}
						loading={loading}
						dateRange={dateRange}
						tenderNumber={tenderNumber}
						limitedTenderOnly={limitedTenderOnly}
						onDateRangeChange={setDateRange}
						onTenderNumberChange={setTenderNumber}
						onLimitedTenderChange={setLimitedTenderOnly}
						onOrganizationSelectionChange={handleSelectionChange}
						onResetFilters={handleResetFilters}
						onApplyFilters={handleApplyFilters}
						onClearAllOrganizations={clearAllOrganizations}
					/>
				</CardContent>
			</Card>
		</div>
	);
};

export default TenderPage;
