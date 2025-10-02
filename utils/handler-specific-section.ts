// utils/section-processor.ts

/**
 * Process special sections in tender details
 */
export function processSpecialSection(
	sectionName: string,
	dataTable: Element
): Record<string, any> {
	const result: Record<string, any> = {};

	// Process Covers Information section
	if (sectionName.includes("Covers Information")) {
		const covers = processCoversInformation(dataTable);
		if (covers.length > 0) {
			result.covers = covers;
		}
	}

	// Process Payment Instruments section
	if (sectionName === "Payment Instruments") {
		const instruments = processPaymentInstruments(dataTable);
		if (instruments.length > 0) {
			result.offlineInstruments = instruments;
		}
	}

	return result;
}

/**
 * Process Covers Information section
 */
function processCoversInformation(dataTable: Element): any[] {
	const coversTable = dataTable.querySelector("table.list_table");
	if (!coversTable) return [];

	const covers: any[] = [];
	const coverRows = coversTable.querySelectorAll("tr:not(.list_header)");

	coverRows.forEach((coverRow) => {
		const cells = coverRow.querySelectorAll("td");
		if (cells.length >= 4) {
			covers.push({
				coverNo: cells[0].textContent?.trim() || "",
				coverType: cells[1].textContent?.trim() || "",
				description: cells[2].textContent?.trim() || "",
				documentType: cells[3].textContent?.trim() || "",
			});
		}
	});

	return covers;
}

/**
 * Process Payment Instruments section
 */
function processPaymentInstruments(dataTable: Element): any[] {
	const instrumentsTable = dataTable.querySelector(
		"table#offlineInstrumentsTableView"
	);
	if (!instrumentsTable) return [];

	const instruments: any[] = [];
	const instrumentRows = instrumentsTable.querySelectorAll(
		"tr:not(.list_header)"
	);

	instrumentRows.forEach((instRow) => {
		const cells = instRow.querySelectorAll("td");
		if (cells.length >= 2) {
			instruments.push({
				serialNo: cells[0].textContent?.trim() || "",
				instrumentType: cells[1].textContent?.trim() || "",
			});
		}
	});

	return instruments;
}
