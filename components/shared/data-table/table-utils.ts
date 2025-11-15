// components/shared/data-table/table-utils.ts
import { SortConfig } from "./data-table";

export function sortData<T>(
	data: T[],
	sortConfig: SortConfig<T> | null
): T[] {
	if (!sortConfig || !sortConfig.key || sortConfig.direction === null) {
		return data;
	}

	const sortedData = [...data].sort((a, b) => {
		const aValue = getNestedValue(a, sortConfig.key as string);
		const bValue = getNestedValue(b, sortConfig.key as string);

		// Handle null/undefined values
		if (aValue === null || aValue === undefined) return 1;
		if (bValue === null || bValue === undefined) return -1;

		// Handle different types
		if (typeof aValue === "number" && typeof bValue === "number") {
			return sortConfig.direction === "asc"
				? aValue - bValue
				: bValue - aValue;
		}

		if (aValue instanceof Date && bValue instanceof Date) {
			return sortConfig.direction === "asc"
				? aValue.getTime() - bValue.getTime()
				: bValue.getTime() - aValue.getTime();
		}

		// String comparison
		const aStr = String(aValue).toLowerCase().trim();
		const bStr = String(bValue).toLowerCase().trim();

		if (sortConfig.direction === "asc") {
			return aStr.localeCompare(bStr);
		} else {
			return bStr.localeCompare(aStr);
		}
	});

	return sortedData;
}

function getNestedValue(obj: any, path: string): any {
	const keys = path.split(".");
	let value = obj;
	for (const key of keys) {
		if (value === null || value === undefined) {
			return undefined;
		}
		value = value[key];
	}
	return value;
}

export function toggleSort<T>(
	currentSort: SortConfig<T> | null,
	key: keyof T | string
): SortConfig<T> {
	if (currentSort?.key === key) {
		// Toggle direction: asc -> desc -> null -> asc
		if (currentSort.direction === "asc") {
			return { key, direction: "desc" };
		} else if (currentSort.direction === "desc") {
			return { key, direction: null };
		} else {
			return { key, direction: "asc" };
		}
	}
	// New column, start with ascending
	return { key, direction: "asc" };
}

