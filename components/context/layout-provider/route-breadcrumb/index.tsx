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
import { usePathname } from "next/navigation";

// Interface for breadcrumb items
interface RouteBreadcrumb {
	label: string;
	href: string;
	isCurrent: boolean;
}

export const RouteBreadcrumb: React.FC = () => {
	const pathname = usePathname();
	// Split the pathname into segments and filter out empty strings
	const pathSegments = pathname
		.split("/")
		.filter((segment: string) => segment);

	// Create breadcrumb items
	const breadcrumbItems: RouteBreadcrumb[] = [
		// Always include Home
		{
			label: "Home",
			href: "/",
			isCurrent: pathname === "/",
		},
		// Map path segments
		...pathSegments.map((segment: string, index: number) => {
			const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
			const isCurrent = index === pathSegments.length - 1;
			const label = segment.charAt(0).toUpperCase() + segment.slice(1);
			return { label, href, isCurrent };
		}),
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
