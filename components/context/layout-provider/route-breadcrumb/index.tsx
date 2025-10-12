"use client";

import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";
import Link from "next/link";
import { Routes } from "@/routes";
import { usePathname } from "next/navigation";

// Interface for breadcrumb items
interface RouteBreadcrumb {
	label: string;
	href: string;
	isCurrent: boolean;
}

export const RouteBreadcrumb: React.FC = () => {
	const pathname = usePathname();
	// Normalize pathname: remove trailing slash and query params, then split into segments
	const normalizedPathname = pathname.split("?")[0].replace(/\/$/, "");
	const pathSegments = normalizedPathname
		.split("/")
		.filter((segment: string) => segment);

	// Create breadcrumb items
	const breadcrumbItems: RouteBreadcrumb[] = [
		// Always include Home
		{
			label: "Home",
			href: "/",
			isCurrent: normalizedPathname === "/" || normalizedPathname === "",
		},
		// Map path segments
		...pathSegments.reduce(
			(acc: RouteBreadcrumb[], segment: string, index: number) => {
				// Skip the "scrapper" segment
				if (segment.toLowerCase() === "scrapper") {
					return acc;
				}

				// Construct the href for the current segment
				const href = `/${pathSegments.slice(0, index + 1).join("/")}`;

				// Find the matching route from the Routes array
				const matchingRoute = Routes.find(
					(route) => route.url.toLowerCase() === href.toLowerCase()
				);

				// If no matching route, skip this segment to avoid invalid breadcrumbs
				if (matchingRoute) {
					const isCurrent = index === pathSegments.length - 1;
					return [
						...acc,
						{
							label: matchingRoute.label,
							href: matchingRoute.url,
							isCurrent,
						},
					];
				}

				// Fallback for unmatched routes (optional: can be removed if you want strict matching)
				return acc;
			},
			[]
		),
	];

	// Define collapse threshold
	const maxItems = 3;
	const shouldCollapse = breadcrumbItems.length > maxItems;

	// Collapsed items: show Home, first segment, and last segment
	const displayedItems: RouteBreadcrumb[] = shouldCollapse
		? [
				breadcrumbItems[0], // Home
				breadcrumbItems.length > 1 ? breadcrumbItems[1] : undefined,
				breadcrumbItems.length > 1
					? breadcrumbItems[breadcrumbItems.length - 1]
					: undefined,
		  ].filter((item): item is RouteBreadcrumb => item !== undefined)
		: breadcrumbItems;

	// If no valid breadcrumbs (other than Home), show only Home
	if (displayedItems.length === 0) {
		return (
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbPage className="bg-primary font-bold text-primary-foreground px-4 py-1 rounded-md">
							Home
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		);
	}

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{displayedItems.map((item, index) => (
					<React.Fragment key={item.href}>
						<BreadcrumbItem>
							{item.isCurrent ? (
								<BreadcrumbPage className="bg-primary font-bold text-primary-foreground px-4 py-1 rounded-md">
									{item.label}
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									className="hover:bg-muted px-4 py-1 rounded-md"
									asChild
								>
									<Link href={item.href}>{item.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{index < displayedItems.length - 1 && (
							<>
								{shouldCollapse &&
									index === 1 &&
									displayedItems.length > 2 && (
										<BreadcrumbItem>
											<BreadcrumbEllipsis />
										</BreadcrumbItem>
									)}
								<BreadcrumbSeparator />
							</>
						)}
					</React.Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
};
