"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { LayoutProvider } from "./layout-provider";
import { SessionProvider } from "./session-provider";

export function RootProvider({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<SessionProvider>
				<LayoutProvider>{children}</LayoutProvider>
			</SessionProvider>
		</ThemeProvider>
	);
}
