// components/ui/custom-tooltip.tsx
"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipProps {
	children: React.ReactNode;
	content: React.ReactNode;
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	delayDuration?: number;
}

export function TooltipComponent({
	children,
	content,
	side = "top",
	align = "center",
	delayDuration = 300,
}: TooltipProps) {
	return (
		<TooltipProvider>
			<Tooltip delayDuration={delayDuration}>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent side={side} align={align}>
					{content}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
