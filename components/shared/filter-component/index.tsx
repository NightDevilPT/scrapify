"use client";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationInfo } from "@/lib/scraper/scraper.interface";
import { MultiSelectCombobox } from "@/components/shared/multi-select";

interface FilterComponentProps {
	tenderType: string;
	organizations: OrganizationInfo[];
	selectedOrganizations: OrganizationInfo[];
	loading: boolean;
	dateRange: DateRange | undefined;
	tenderNumber: number;
	limitedTenderOnly: boolean;
	onDateRangeChange: (dateRange: DateRange | undefined) => void;
	onTenderNumberChange: (value: number) => void;
	onLimitedTenderChange: (value: boolean) => void;
	onOrganizationSelectionChange: (selected: OrganizationInfo[]) => void;
	onResetFilters: () => void;
	onApplyFilters: () => void;
	onClearAllOrganizations: () => void;
}

const FilterComponent: React.FC<FilterComponentProps> = ({
	tenderType,
	organizations,
	selectedOrganizations,
	loading,
	dateRange,
	tenderNumber,
	limitedTenderOnly,
	onDateRangeChange,
	onTenderNumberChange,
	onLimitedTenderChange,
	onOrganizationSelectionChange,
	onResetFilters,
	onApplyFilters,
	onClearAllOrganizations,
}) => {
	// Function to disable future dates
	const isDateDisabled = (date: Date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date > today;
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="space-y-1">
					<Label className="text-lg font-semibold">
						Filters & Organization Selection
					</Label>
					{selectedOrganizations.length > 0 && (
						<p className="text-sm text-muted-foreground">
							{selectedOrganizations.length} of{" "}
							{organizations.length} organizations selected
						</p>
					)}
				</div>

				{selectedOrganizations.length > 0 && (
					<Button
						onClick={onClearAllOrganizations}
						variant="outline"
						size="sm"
						className="text-destructive hover:text-destructive hover:bg-destructive/10"
					>
						Clear All
					</Button>
				)}
			</div>

			{/* Filter Controls - Single Row */}
			<Card className="p-0 bg-transparent border-none shadow-none">
				<CardContent className="space-y-5 p-0">
					<div className="grid grid-cols-1 gap-4 w-full">
						<div className="grid grid-cols-3 gap-5">
							{/* Tender Number Input */}
							<div className="space-y-2 col-span-2">
								<Label
									htmlFor="tenderNumber"
									className="text-sm font-medium"
								>
									Tender Number
								</Label>
								<Input
									id="tenderNumber"
									placeholder="Enter tender number..."
									className="w-full"
									type="number"
									value={tenderNumber}
									onChange={(e) =>
										onTenderNumberChange(
											Number(e.target.value)
										)
									}
									disabled={!limitedTenderOnly}
								/>
							</div>

							{/* Limited Tender Toggle */}
							<div className="space-y-2">
								<Label className="text-sm font-medium py-1.5"></Label>
								<div className="flex justify-start pt-2 items-center gap-2">
									<Label
										htmlFor="limited-tender"
										className="text-xs font-medium text-muted-foreground"
									>
										Show only limited tenders
									</Label>
									<Switch
										id="limited-tender"
										checked={limitedTenderOnly}
										onCheckedChange={onLimitedTenderChange}
									/>
								</div>
							</div>

							{/* Date Range Calendar */}
							<div className="space-y-2 col-span-full">
								<Label className="text-sm font-medium">
									Date Range
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{dateRange?.from ? (
												dateRange.to ? (
													<>
														{format(
															dateRange.from,
															"LLL dd, y"
														)}{" "}
														-{" "}
														{format(
															dateRange.to,
															"LLL dd, y"
														)}
													</>
												) : (
													format(
														dateRange.from,
														"LLL dd, y"
													)
												)
											) : (
												<span>Pick a date range</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0"
										align="start"
									>
										<Calendar
											mode="range"
											defaultMonth={dateRange?.from}
											selected={dateRange}
											onSelect={onDateRangeChange}
											numberOfMonths={2}
											disabled={isDateDisabled}
											className="rounded-lg border shadow-none"
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						{/* Organization Selection */}
						<div className="space-y-2 flex justify-center items-center gap-5">
							<div className="flex-1 space-y-2">
								<Label className="text-sm font-medium">
									Select Organizations
								</Label>
								{loading ? (
									<Label className="w-full h-full rounded-md border-[1px] px-4 py-3 bg-secondary/30 text-secondary-foreground/30">
										Loading organizations...
									</Label>
								) : (
									<MultiSelectCombobox
										organizations={organizations}
										selectedOrganizations={
											selectedOrganizations
										}
										onSelectionChange={
											onOrganizationSelectionChange
										}
										placeholder={`Select ${tenderType} organizations...`}
										searchPlaceholder="Search organizations by name or value..."
										emptyMessage="No organizations match your search criteria."
										maxDisplay={2}
										className="w-full"
									/>
								)}
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-2 justify-end items-center">
						<Button
							variant="outline"
							size="sm"
							className="whitespace-nowrap"
							onClick={onResetFilters}
						>
							Reset Filters
						</Button>
						<Button
							size="sm"
							className="whitespace-nowrap"
							onClick={onApplyFilters}
						>
							Apply Filters
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default FilterComponent;
