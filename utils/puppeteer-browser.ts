import puppeteer from "puppeteer";

export const PuppeteerBrowser = await puppeteer.launch({
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

// Helper function to convert string to camelCase
export const toCamelCase = (str: string): string => {
	return str
		.toLowerCase()
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, char) =>
			char.toUpperCase()
		)
		.replace(/[^a-zA-Z0-9]/g, "")
		.replace(/^\d/, "_$&"); // Handle leading numbers
};

// Helper function to clean and normalize key
export const cleanKey = (key: string): string => {
	// Remove special characters, symbols, and unwanted text
	return key
		.replace(/[₹*:]/g, "") // Remove ₹, *, :
		.replace(/\([^)]*\)/g, "") // Remove text in parentheses
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();
};