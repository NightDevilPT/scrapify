// components/ui/multi-select-combobox.tsx
"use client";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { OrganizationInfo } from "@/lib/scraper/scraper.interface";

interface MultiSelectComboboxProps {
	organizations: OrganizationInfo[];
	selectedOrganizations: OrganizationInfo[];
	onSelectionChange: (selected: OrganizationInfo[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	className?: string;
	maxDisplay?: number;
}

// Memoized organization item component to prevent unnecessary re-renders
const OrganizationItem = React.memo(
	({
		organization,
		isSelected,
		onToggle,
	}: {
		organization: OrganizationInfo;
		isSelected: boolean;
		onToggle: (org: OrganizationInfo) => void;
	}) => {
		const handleCheckboxChange = React.useCallback(() => {
			onToggle(organization);
		}, [organization, onToggle]);

		const handleClick = React.useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				onToggle(organization);
			},
			[organization, onToggle]
		);

		return (
			<CommandItem
				value={organization.id}
				onSelect={() => onToggle(organization)}
				className="flex items-center justify-between"
			>
				<div className="flex items-center space-x-2">
					<Checkbox
						checked={isSelected}
						onClick={handleClick}
						onCheckedChange={handleCheckboxChange}
						className="h-4 w-4"
					/>
					<div className="flex flex-col">
						<span className="font-medium">{organization.name}</span>
						<span className="text-xs text-muted-foreground">
							{organization.value}
						</span>
					</div>
				</div>
				<Check
					className={cn(
						"h-4 w-4",
						isSelected ? "opacity-100" : "opacity-0"
					)}
				/>
			</CommandItem>
		);
	}
);

OrganizationItem.displayName = "OrganizationItem";

// Memoized badge component for selected organizations
const SelectedOrganizationBadge = React.memo(
	({
		organization,
		onRemove,
	}: {
		organization: OrganizationInfo;
		onRemove: (id: string, e: React.MouseEvent) => void;
	}) => {
		const handleRemove = React.useCallback(
			(e: React.MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				onRemove(organization.id, e);
			},
			[organization.id, onRemove]
		);

		return (
			<Badge variant="secondary" className="pr-1.5 py-1 text-xs">
				{organization.name}
				<span
					role="button"
					tabIndex={0}
					onClick={handleRemove}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleRemove(e as any);
						}
					}}
					className="ml-1 hover:bg-muted rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<X className="h-3 w-3" />
				</span>
			</Badge>
		);
	}
);

SelectedOrganizationBadge.displayName = "SelectedOrganizationBadge";

export const MultiSelectCombobox = React.memo(function MultiSelectCombobox({
	organizations,
	selectedOrganizations,
	onSelectionChange,
	placeholder = "Select organizations...",
	searchPlaceholder = "Search organizations...",
	emptyMessage = "No organizations found.",
	className,
	maxDisplay = 2,
}: MultiSelectComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [searchValue, setSearchValue] = React.useState("");

	// Memoized derived values
	const { allSelected, someSelected } = React.useMemo(
		() => ({
			allSelected:
				organizations.length > 0 &&
				selectedOrganizations.length === organizations.length,
			someSelected:
				selectedOrganizations.length > 0 &&
				selectedOrganizations.length < organizations.length,
		}),
		[organizations.length, selectedOrganizations.length]
	);

	// Memoized callback functions
	const toggleOrganization = React.useCallback(
		(organization: OrganizationInfo) => {
			const isSelected = selectedOrganizations.some(
				(selected) => selected.id === organization.id
			);

			const newSelection = isSelected
				? selectedOrganizations.filter(
						(selected) => selected.id !== organization.id
				  )
				: [...selectedOrganizations, organization];

			onSelectionChange(newSelection);
		},
		[selectedOrganizations, onSelectionChange]
	);

	const toggleSelectAll = React.useCallback(() => {
		const newSelection = allSelected ? [] : [...organizations];
		onSelectionChange(newSelection);
	}, [allSelected, organizations, onSelectionChange]);

	const removeOrganization = React.useCallback(
		(organizationId: string, event: React.MouseEvent) => {
			event.stopPropagation();
			const newSelection = selectedOrganizations.filter(
				(org) => org.id !== organizationId
			);
			onSelectionChange(newSelection);
		},
		[selectedOrganizations, onSelectionChange]
	);

	const clearAll = React.useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation();
			onSelectionChange([]);
		},
		[onSelectionChange]
	);

	const handleSearchChange = React.useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	// Memoized filtered organizations
	const filteredOrganizations = React.useMemo(() => {
		if (!searchValue) return organizations;

		return organizations.filter(
			(org) =>
				org.name.toLowerCase().includes(searchValue.toLowerCase()) ||
				org.value.toLowerCase().includes(searchValue.toLowerCase())
		);
	}, [organizations, searchValue]);

	// Memoized display organizations for badges
	const { displayOrganizations, hiddenCount } = React.useMemo(
		() => ({
			displayOrganizations: selectedOrganizations.slice(0, maxDisplay),
			hiddenCount: selectedOrganizations.length - maxDisplay,
		}),
		[selectedOrganizations, maxDisplay]
	);

	// Memoized select all handler for checkbox
	const handleSelectAllClick = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			toggleSelectAll();
		},
		[toggleSelectAll]
	);

	// Create a lookup map for selected organizations for faster checks
	const selectedOrganizationsMap = React.useMemo(() => {
		return new Set(selectedOrganizations.map((org) => org.id));
	}, [selectedOrganizations]);

	// Memoized organization list
	const organizationList = React.useMemo(() => {
		return filteredOrganizations.map((organization) => (
			<OrganizationItem
				key={organization.id}
				organization={organization}
				isSelected={selectedOrganizationsMap.has(organization.id)}
				onToggle={toggleOrganization}
			/>
		));
	}, [filteredOrganizations, selectedOrganizationsMap, toggleOrganization]);

	// Memoized selected badges
	const selectedBadges = React.useMemo(() => {
		return displayOrganizations.map((organization) => (
			<SelectedOrganizationBadge
				key={organization.id}
				organization={organization}
				onRemove={removeOrganization}
			/>
		));
	}, [displayOrganizations, removeOrganization]);

	return (
		<div className={cn("space-y-2", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between h-auto min-h-10 px-3 py-2"
					>
						<div className="flex flex-wrap gap-1 flex-1 text-left">
							{selectedOrganizations.length === 0 ? (
								<span className="text-muted-foreground">
									{placeholder}
								</span>
							) : (
								<>
									{selectedBadges}
									{hiddenCount > 0 && (
										<Badge
											variant="secondary"
											className="py-1 text-xs"
										>
											+{hiddenCount} more
										</Badge>
									)}
								</>
							)}
						</div>
						<div className="flex items-center gap-1 ml-2">
							{selectedOrganizations.length > 0 && (
								<button
									type="button"
									onClick={clearAll}
									className="p-1 hover:bg-muted rounded-full"
								>
									<X className="h-3 w-3" />
								</button>
							)}
							<ChevronsUpDown className="h-4 w-4 opacity-50" />
						</div>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[450px] p-0" align="start">
					<Command>
						<CommandInput
							placeholder={searchPlaceholder}
							value={searchValue}
							onValueChange={handleSearchChange}
							className="h-9"
						/>
						<CommandList>
							<CommandEmpty>{emptyMessage}</CommandEmpty>

							{/* Select All Section */}
							{organizations.length > 0 && (
								<CommandGroup>
									<CommandItem
										onSelect={toggleSelectAll}
										className="flex items-center space-x-2 px-4 py-2 border-b bg-muted/50 cursor-pointer"
									>
										<Checkbox
											checked={allSelected}
											onClick={handleSelectAllClick}
											onCheckedChange={toggleSelectAll}
											className={cn(
												"h-4 w-4",
												someSelected &&
													"data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
											)}
										/>
										<span className="text-sm font-medium flex-1">
											Select All Organizations
										</span>
										<span className="text-xs text-muted-foreground">
											{selectedOrganizations.length}/
											{organizations.length} selected
										</span>
									</CommandItem>
								</CommandGroup>
							)}

							<CommandGroup>{organizationList}</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{/* Selected count and clear all */}
			{selectedOrganizations.length > 0 && (
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						{selectedOrganizations.length} organization
						{selectedOrganizations.length !== 1 ? "s" : ""} selected
					</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={clearAll}
						className="h-6 px-2 text-xs"
					>
						Clear all
					</Button>
				</div>
			)}
		</div>
	);
});

MultiSelectCombobox.displayName = "MultiSelectCombobox";
