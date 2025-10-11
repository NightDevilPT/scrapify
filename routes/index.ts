import { Building, LayoutDashboard, PocketKnife, Puzzle } from "lucide-react";
import { ElementType } from "react";

interface IRoute {
	id: string;
	label: string;
	icon: ElementType;
	url: string;
	tenderType: string;
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
		url: "/EPROCURE",
		icon: Building,
		tenderType: "EPROCURE",
	},
	{
		id: crypto.randomUUID(),
		label: "Gem",
		url: "/GEM",
		icon: PocketKnife,
		tenderType: "GEM",
	},
	{
		id: crypto.randomUUID(),
		label: "Cpp-Portal",
		url: "/CPP_PORTAL",
		icon: Puzzle,
		tenderType: "CPP_PORTAL",
	},
];
