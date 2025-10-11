"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiService from "@/lib/api-service/api.service";
import { ApiResponse } from "@/interface/api.interface";
import { OrganizationInfo } from "@/lib/scraper/scraper.interface";
import { MultiSelectCombobox } from "@/components/shared/multi-select";
import { Loader2, RefreshCw, AlertCircle, Building2, Play } from "lucide-react";
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

	// Auto-fetch organizations when tenderType changes
	React.useEffect(() => {
		if (tenderType) {
			fetchOrganizations();
		}
	}, [tenderType]);

	return (
		<div className="w-full space-y-6">
			<Card className="bg-transparent border-none p-0">
				<CardHeader className="p-0 px-4">
					<CardTitle className="flex items-center justify-between text-xl">
						<div className="flex items-center gap-3">
							<Building2 className="h-6 w-6 text-muted-foreground" />
							<span>Tender Type - {tenderType}</span>
							<Badge variant="secondary" className="text-sm">
								{selectedOrganizations.length} selected
							</Badge>
						</div>

						{selectedOrganizations.length > 0 && (
							<Button variant={"outline"}>
								<Play />
								Scrap Tenders
							</Button>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6 p-0 px-4">
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

					{/* Organization Selection Section */}
					<div className="space-y-4">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div className="space-y-1">
								<Label className="text-lg font-semibold">
									Select Organizations
								</Label>
								{selectedOrganizations.length > 0 && (
									<p className="text-sm text-muted-foreground">
										{selectedOrganizations.length} of{" "}
										{organizations.length} organizations
										selected
									</p>
								)}
							</div>

							{selectedOrganizations.length > 0 && (
								<Button
									onClick={clearAllOrganizations}
									variant="outline"
									size="sm"
									className="text-destructive hover:text-destructive hover:bg-destructive/10"
								>
									Clear All
								</Button>
							)}
						</div>

						{/* MultiSelect Combobox */}
						{!tenderType ? (
							<div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
								<Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
								<p className="font-medium text-muted-foreground">
									No Tender Type Selected
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Please select a tender type to load
									organizations
								</p>
							</div>
						) : loading ? (
							<div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
								<Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
								<p className="font-medium text-muted-foreground">
									Loading Organizations
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Fetching data from {tenderType}...
								</p>
							</div>
						) : organizations.length === 0 ? (
							<div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
								<AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
								<p className="font-medium text-muted-foreground">
									No Organizations Found
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									No organizations available for {tenderType}
								</p>
							</div>
						) : (
							<div className="space-y-4">
								<MultiSelectCombobox
									organizations={organizations}
									selectedOrganizations={
										selectedOrganizations
									}
									onSelectionChange={handleSelectionChange}
									placeholder={`Select ${tenderType} organizations...`}
									searchPlaceholder="Search organizations by name or value..."
									emptyMessage="No organizations match your search criteria."
									maxDisplay={2}
									className="w-full"
								/>
							</div>
						)}
					</div>

					
				</CardContent>
			</Card>
		</div>
	);
};

export default TenderPage;
