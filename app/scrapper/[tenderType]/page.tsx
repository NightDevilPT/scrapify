import React from "react";
import TenderPage from "@/components/pages/tender-page";

const page = async ({
	params,
}: {
	params: Promise<{ tenderType: string }>;
}) => {
	const tenderType = (await params).tenderType;
	return <TenderPage tenderType={tenderType} />;
};

export default page;
