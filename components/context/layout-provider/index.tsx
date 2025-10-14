"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import HeaderLogo from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";
import { RouteBreadcrumb } from "./route-breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ConnectionStatus } from "@/components/shared/session-monitor";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider
			className="w-full h-screen"
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<Sidebar collapsible="icon" variant="floating">
				<SidebarHeader>
					<HeaderLogo />
				</SidebarHeader>
				<Separator />
				<SidebarContent className="py-5 px-2">
					<AppSidebar />
				</SidebarContent>
				<Separator />
			</Sidebar>
			<SidebarInset>
				<div className="h-full w-full grid grid-rows-[60px_1fr] gap-5">
					<header className="border-b-1 border-b-muted flex justify-between items-center gap-5 py-4 pr-5">
						<div className="flex justify-center items-center gap-4 h-full">
							<SidebarTrigger />
							<Separator orientation="vertical" />
							<RouteBreadcrumb />
						</div>
						<div className="flex justify-center items-center gap-4">
							<ConnectionStatus />
							<ThemeToggle />
						</div>
					</header>
					<ScrollArea className="w-full overflow-y-auto max-h-[calc(100vh-60px)] pb-5">
						{children}
					</ScrollArea>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
