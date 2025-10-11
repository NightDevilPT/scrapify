"use client";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Routes } from "@/routes";

export function AppSidebar() {
	return (
		<SidebarMenu>
			{Routes.map((item) => (
				<SidebarMenuItem key={item.id}>
					<SidebarMenuButton asChild tooltip={item.label}>
						<Link href={item.url}>
							{item.icon && <item.icon />}
							<span>{item.label}</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
}
