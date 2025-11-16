import { ScrapingProvider } from "@prisma/client";
import {
	Building,
	LayoutDashboard,
	PocketKnife,
	Puzzle,
	Settings,
} from "lucide-react";
import { ElementType } from "react";

interface IRoute {
	id: string;
	label: string;
	icon: ElementType;
	url: string;
	tenderType?: string;
}

export const Routes: IRoute[] = [
	{
		id: crypto.randomUUID(),
		label: "Dashboard",
		url: "/",
		icon: LayoutDashboard,
		tenderType: "",
	},
	{
		id: crypto.randomUUID(),
		label: "E-Procure",
		url: "/scrapper/"+ScrapingProvider.EPROCURE,
		icon: Building,
		tenderType: ScrapingProvider.EPROCURE,
	},
	// {
	// 	id: crypto.randomUUID(),
	// 	label: "Gem",
	// 	url: "/scrapper/GEM",
	// 	icon: PocketKnife,
	// 	tenderType: "GEM",
	// },
	{
		id: crypto.randomUUID(),
		label: "Eprocure CPPP Portal",
		url: "/scrapper/"+ScrapingProvider.EPROCURE_CPPP,
		icon: Puzzle,
		tenderType: ScrapingProvider.EPROCURE_CPPP,
	},
	{
		id: crypto.randomUUID(),
		label: "Settings",
		url: "/settings",
		icon: Settings,
		tenderType: "CPP_PORTAL",
	},
];
