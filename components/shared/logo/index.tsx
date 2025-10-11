"use client";

import { Building2Icon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useSidebar } from "@/components/ui/sidebar";

interface IHeaderLogoProps {
	title?: string;
	subtitle?: string;
}

const HeaderLogo = ({ title, subtitle }: IHeaderLogoProps) => {
	const { state } = useSidebar();
	return (
		<div
			className={`w-full h-auto grid grid-cols-[40px_1fr] ${
				state === "collapsed" &&
				"grid-cols-1 place-content-center place-items-center"
			}`}
		>
			<div
				className={`w-full h-full flex justify-center items-center`}
			>
				<Building2Icon className="!h-8 text-primary" />
			</div>

			<div
				className={`ml-3 overflow-hidden transition-all duration-300 text-nowrap ${
					state === "expanded" ? "w-full" : "w-0 hidden"
				}`}
			>
				<Label className="text-base">
					{title || "Tender Scrapper"}
				</Label>
				<Label className="text-xs text-muted-foreground">
					{subtitle || "Scrape your tenders"}
				</Label>
			</div>
		</div>
	);
};

export default HeaderLogo;
