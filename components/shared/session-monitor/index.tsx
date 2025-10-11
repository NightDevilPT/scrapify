// components/connection-status.tsx
"use client";

import { TooltipComponent } from "../tooltip";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSessions } from "@/components/context/session-provider";

export function ConnectionStatus() {
	const { isConnected, reconnect } = useSessions();

	return (
		<div className="flex items-center gap-2">
			{/* Connection Status Icon */}
			<TooltipComponent
				content={
					isConnected
						? "Connected to real-time updates"
						: "Disconnected from real-time updates"
				}
			>
				<div className="flex items-center cursor-default">
					{isConnected ? (
						<Wifi className="h-4 w-4 text-green-500" />
					) : (
						<WifiOff className="h-4 w-4 text-red-500" />
					)}
				</div>
			</TooltipComponent>

			{/* Reconnect Button */}
			<TooltipComponent content="Reconnect">
				<Button
					onClick={reconnect}
					variant="outline"
					size="sm"
					disabled={isConnected}
					className="h-8 w-8 p-0"
				>
					<RefreshCw className="h-3 w-3" />
				</Button>
			</TooltipComponent>
		</div>
	);
}
