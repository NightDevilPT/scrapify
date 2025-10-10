// lib/scraper/providers/e-procure-scraper.ts
import puppeteer, { Page } from "puppeteer";
import { LoggerService } from "@/lib/logger-service/logger.service";
import {
	DateRange,
	OrganizationInfo,
	ScraperProvider,
} from "../scraper.interface";

export class EProcureScraper implements ScraperProvider {
	private logger: LoggerService;
	private baseUrl: string = "https://eprocure.gov.in";

	constructor() {
		this.logger = LoggerService.getInstance();
		this.logger.setContext(EProcureScraper.name);
	}

	// Tender Scrapper logic
	async execute(url: string, organizations: string[], dateRange?: DateRange) {
		let browser;
		try {
			this.logger.info(`Starting E-Procure execution for URL: ${url}`);
			this.logger.info(
				`Processing ${organizations.length} organizations`
			);

			// Launch Puppeteer browser
			browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			const page = await browser.newPage();

			// Set a realistic user agent
			await page.setUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
			);

			// Navigate to the URL
			await page.goto(url, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});

			// Wait for the table to load
			await page.waitForSelector("table.list_table", { timeout: 10000 });

			this.logger.info("Page loaded, processing organizations...");

			// Use the helper method to get tender links for all organizations
			const results = await this.processOrganizationTendersProcess(
				page,
				organizations,
				this.baseUrl
			);

			return results;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error in execute method: ${errorMessage}`);
			return [];
		} finally {
			if (browser) {
				await browser.close();
				this.logger.info("Browser closed");
			}
		}
	}

	// Organization scraping logic
	async getOrganizations(url: string): Promise<OrganizationInfo[] | null> {
		let browser;
		try {
			this.logger.info(`Starting E-Procure scraping for URL: ${url}`);

			// Launch Puppeteer browser
			browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			const page = await browser.newPage();

			// Set a realistic user agent
			await page.setUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
			);

			// Navigate to the URL
			await page.goto(url, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});

			// Wait for the table to load
			await page.waitForSelector("table.list_table", { timeout: 10000 });

			this.logger.info("Page loaded, extracting organization data...");

			// Extract organization data from the table
			const organizations = await page.evaluate(() => {
				const orgs: OrganizationInfo[] = [];

				// Get all table rows with class 'even' or 'odd' (data rows)
				const rows = document.querySelectorAll(
					"table.list_table tr.even, table.list_table tr.odd"
				);

				rows.forEach((row) => {
					const cells = row.querySelectorAll("td");

					// Each row should have 3 cells: S.No, Organization Name, Tender Count
					if (cells.length >= 3) {
						// Extract organization name from second cell (index 1)
						const nameElement = cells[1];
						const name = nameElement.textContent?.trim() || "";

						// Extract tender count from third cell (index 2)
						const tenderCountElement = cells[2];
						const tenderCountText =
							tenderCountElement.textContent?.trim() || "0";

						// Create slug from organization name
						const slug = name
							.toLowerCase()
							.replace(/&/g, "and")
							.replace(/[^a-z0-9\s-]/g, "")
							.replace(/\s+/g, "-")
							.replace(/-+/g, "-")
							.replace(/(^-|-$)/g, "");

						if (name && slug) {
							orgs.push({
								name,
								id: slug,
								value: name,
							});
						}
					}
				});

				return orgs;
			});

			this.logger.success(
				`Successfully extracted ${organizations.length} organizations`
			);

			// Log first few organizations for verification
			if (organizations.length === 0) {
				this.logger.warning("No organizations found in the table");
			}

			return organizations;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error scraping organizations: ${errorMessage}`);
			return null;
		} finally {
			if (browser) {
				await browser.close();
				this.logger.info("Browser closed");
			}
		}
	}

	// =================================================== //
	// ============ HELPER FUNCTIONS START ============== //
	// =================================================== //

	// Core method to process each organization's tenders
	private async processOrganizationTendersProcess(
		page: Page,
		organizations: string[],
		baseUrl: string
	): Promise<any> {
		const results: Array<{
			organization: string;
			tendersPageLink: string | null;
			found: boolean;
			tenders: Array<{
				title: string;
				referenceNumber: string;
				ePublishedDate: string;
				closingDate: string;
				openingDate: string;
				tenderLink: string;
				organizationChain: string;
			}>;
		}> = [];

		try {
			// Store the original URL to navigate back after each organization
			const originalUrl = page.url();

			// Process each organization
			for (const orgName of organizations) {
				try {
					this.logger.info(`Processing organization: ${orgName}`);

					// Make sure we're on the main organizations page before getting the tender link
					if (page.url() !== originalUrl) {
						this.logger.info(
							`Navigating back to main organizations page`
						);
						await page.goto(originalUrl, {
							waitUntil: "networkidle2",
							timeout: 30000,
						});
						await page.waitForSelector("table.list_table", {
							timeout: 10000,
						});
					}

					// Extract tender link for this organization
					const tendersPageLink = await this.getTenderPageLink(
						page,
						orgName,
						baseUrl
					);

					let tenders: Array<{
						title: string;
						referenceNumber: string;
						ePublishedDate: string;
						closingDate: string;
						openingDate: string;
						tenderLink: string;
						organizationChain: string;
					}> = [];

					if (tendersPageLink) {
						this.logger.info(
							`Navigating to tender page: ${tendersPageLink}`
						);

						// Navigate to the tender page
						await page.goto(tendersPageLink, {
							waitUntil: "networkidle2",
							timeout: 30000,
						});

						// Wait for the tender table to load
						await page.waitForSelector("table.list_table", {
							timeout: 10000,
						});

						// Check if there are tenders available and scrape them
						tenders = await this.scrapeTendersLinksFromPage(
							page,
							baseUrl
						);

						// Run the loop in the tenders page to get tender details
						// Create a function which will scrap the tender data after clicking on the link

						this.logger.success(
							`Found ${tenders.length} tenders for ${orgName}`
						);

						// After scraping tenders, navigate back to main page for next organization
						this.logger.info(
							`Navigating back to main page for next organization`
						);
						await page.goBack({
							waitUntil: "networkidle2",
							timeout: 30000,
						});
						await page.waitForSelector("table.list_table", {
							timeout: 10000,
						});
					}

					const found = tendersPageLink !== null;

					results.push({
						organization: orgName,
						tendersPageLink,
						found,
						tenders,
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Unknown error occurred";
					this.logger.error(
						`Error processing organization ${orgName}: ${errorMessage}`
					);

					results.push({
						organization: orgName,
						tendersPageLink: null,
						found: false,
						tenders: [],
					});

					// Try to recover by going back to main page
					try {
						if (page.url() !== originalUrl) {
							await page.goto(originalUrl, {
								waitUntil: "networkidle2",
								timeout: 30000,
							});
							await page.waitForSelector("table.list_table", {
								timeout: 10000,
							});
						}
					} catch (recoveryError) {
						this.logger.error(
							`Failed to recover to main page: ${recoveryError}`
						);
					}
				}
			}

			return results;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error extracting tender links: ${errorMessage}`);

			return organizations.map((orgName) => ({
				organization: orgName,
				tendersPageLink: null,
				found: false,
				tenders: [],
			}));
		}
	}

	// Helper method to scrape tenders from the tender listing page
	private async scrapeTendersLinksFromPage(
		page: Page,
		baseUrl: string
	): Promise<
		Array<{
			title: string;
			referenceNumber: string;
			ePublishedDate: string;
			closingDate: string;
			openingDate: string;
			tenderLink: string;
			organizationChain: string;
			tenderDetails?: any;
		}>
	> {
		try {
			const tenders = await page.evaluate((baseUrl) => {
				const tenderList: Array<{
					title: string;
					referenceNumber: string;
					ePublishedDate: string;
					closingDate: string;
					openingDate: string;
					tenderLink: string;
					organizationChain: string;
					tenderDetails?: any;
				}> = [];

				// Get all data rows (excluding header)
				const rows = document.querySelectorAll(
					"table.list_table tr.even, table.list_table tr.odd"
				);

				for (const row of Array.from(rows)) {
					const cells = row.querySelectorAll("td");

					if (cells.length >= 6) {
						// Extract data from each cell
						const serialNumber = cells[0].textContent?.trim() || "";
						const ePublishedDate =
							cells[1].textContent?.trim() || "";
						const closingDate = cells[2].textContent?.trim() || "";
						const openingDate = cells[3].textContent?.trim() || "";

						// The title and reference number are in the 5th cell (index 4)
						const titleCell = cells[4];
						const titleLink = titleCell.querySelector("a");
						const title = titleLink?.textContent?.trim() || "";
						const tenderHref =
							titleLink?.getAttribute("href") || "";

						// Extract reference number from the text after the link
						const referenceText =
							titleCell.textContent?.trim() || "";
						const referenceMatch =
							referenceText.match(/\[([^\]]+)\]/g);
						const referenceNumber = referenceMatch
							? referenceMatch[
									referenceMatch.length - 1
							  ]?.replace(/[\[\]]/g, "")
							: "";

						const organizationChain =
							cells[5].textContent?.trim() || "";

						// Construct absolute URL for tender link
						const absoluteTenderLink = tenderHref.startsWith("http")
							? tenderHref
							: new URL(tenderHref, baseUrl).href;

						if (title && tenderHref) {
							tenderList.push({
								title,
								referenceNumber,
								ePublishedDate,
								closingDate,
								openingDate,
								tenderLink: absoluteTenderLink,
								organizationChain,
							});
						}
					}
				}

				return tenderList;
			}, baseUrl);

			// Now scrape detailed information for each tender
			for (let i = 0; i < tenders.length; i++) {
				try {
					this.logger.info(
						`Scraping detailed information for tender: ${tenders[i].title}`
					);

					const tenderDetails = await this.scrapeTenderDetails(
						page,
						tenders[i].tenderLink,
						baseUrl
					);

					tenders[i].tenderDetails = tenderDetails;

					// Go back to the tender listing page
					await page.goBack({
						waitUntil: "networkidle2",
						timeout: 30000,
					});
					await page.waitForSelector("table.list_table", {
						timeout: 10000,
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Unknown error occurred";
					this.logger.error(
						`Error scraping details for tender ${tenders[i].title}: ${errorMessage}`
					);
					tenders[i].tenderDetails = null;
				}
			}

			return tenders;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(
				`Error scraping tenders from page: ${errorMessage}`
			);
			return [];
		}
	}

	// This method extracts the tender page link for a specific organization
	private async getTenderPageLink(
		page: Page,
		targetOrgName: string,
		baseUrl: string
	): Promise<string | null> {
		try {
			const tenderLink = await page.evaluate(
				(targetOrgName, baseUrl) => {
					// Get all data rows (excluding header)
					const rows = document.querySelectorAll(
						"table.list_table tr.even, table.list_table tr.odd"
					);

					for (const [index, row] of Array.from(rows).entries()) {
						const cells = row.querySelectorAll("td");

						if (cells.length >= 3) {
							const name = cells[1].textContent?.trim() || "";

							// Use more flexible matching
							const normalizedTableName = name
								.toLowerCase()
								.replace(/\s+/g, " ")
								.trim();
							const normalizedTargetName = targetOrgName
								.toLowerCase()
								.replace(/\s+/g, " ")
								.trim();

							// Check if this is the organization we're looking for
							if (normalizedTableName === normalizedTargetName) {
								// Get the third cell which contains the tender count and link
								const tenderCell = cells[2];

								// Get the link from the cell content
								const linkElement =
									tenderCell.querySelector("a.link2");

								if (linkElement) {
									const href =
										linkElement.getAttribute("href");

									if (href) {
										// Construct absolute URL
										let absoluteUrl;
										if (href.startsWith("http")) {
											absoluteUrl = href;
										} else {
											absoluteUrl = new URL(href, baseUrl)
												.href;
										}
										return absoluteUrl;
									}
								} else {
									// Try any anchor tag as fallback
									const anyAnchor =
										tenderCell.querySelector("a");

									if (anyAnchor) {
										const href =
											anyAnchor.getAttribute("href");
										if (href) {
											const absoluteUrl = href.startsWith(
												"http"
											)
												? href
												: new URL(href, baseUrl).href;
											return absoluteUrl;
										}
									}
								}

								// If we found the organization but no link, break the loop
								break;
							}
						}
					}
					return null;
				},
				targetOrgName,
				baseUrl
			);

			if (tenderLink) {
				this.logger.success(
					`Found tender link for "${targetOrgName}": ${tenderLink}`
				);
			} else {
				this.logger.warning(
					`No tender link found for "${targetOrgName}"`
				);
			}

			return tenderLink;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(
				`Error extracting tender link for "${targetOrgName}": ${errorMessage}`
			);
			return null;
		}
	}

	// This method scrapes detailed information from a tender details page
	private async scrapeTenderDetails(
		page: Page,
		tenderLink: string,
		baseUrl: string
	): Promise<any> {
		try {
			this.logger.info(`Scraping tender details from: ${tenderLink}`);

			await page.goto(tenderLink, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});

			await page.waitForSelector(".page_content", { timeout: 10000 });

			const tenderDetails = await page.evaluate(() => {
				// Helper function to extract all key-value pairs from a table
				const extractTableData = (table: HTMLTableElement) => {
					const data: Record<string, string> = {};
					const rows = table.querySelectorAll("tr");

					rows.forEach((row) => {
						const cells = row.querySelectorAll("td");

						// Handle rows with 2 cells (key-value pairs)
						if (cells.length === 2) {
							const key =
								cells[0].textContent
									?.trim()
									.replace(/[:*]$/, "")
									.replace(/<[^>]*>/g, "") || "";
							const value =
								cells[1].textContent
									?.trim()
									.replace(/<[^>]*>/g, "") || "";

							if (key && value) {
								data[key] = value;
							}
						}
						// Handle rows with 4 cells (two key-value pairs in one row)
						else if (cells.length === 4) {
							const key1 =
								cells[0].textContent
									?.trim()
									.replace(/[:*]$/, "")
									.replace(/<[^>]*>/g, "") || "";
							const value1 =
								cells[1].textContent
									?.trim()
									.replace(/<[^>]*>/g, "") || "";
							const key2 =
								cells[2].textContent
									?.trim()
									.replace(/[:*]$/, "")
									.replace(/<[^>]*>/g, "") || "";
							const value2 =
								cells[3].textContent
									?.trim()
									.replace(/<[^>]*>/g, "") || "";

							if (key1 && value1) {
								data[key1] = value1;
							}
							if (key2 && value2) {
								data[key2] = value2;
							}
						}
						// Handle rows with 6 cells (three key-value pairs in one row)
						else if (cells.length === 6) {
							for (let i = 0; i < 6; i += 2) {
								const key =
									cells[i].textContent
										?.trim()
										.replace(/[:*]$/, "")
										.replace(/<[^>]*>/g, "") || "";
								const value =
									cells[i + 1].textContent
										?.trim()
										.replace(/<[^>]*>/g, "") || "";

								if (key && value) {
									data[key] = value;
								}
							}
						}
					});

					return data;
				};

				// Function to find table by header text
				const findTableByHeader = (headerText: string) => {
					const headers = document.querySelectorAll(".pageheader");

					for (const header of Array.from(headers)) {
						if (header.textContent?.includes(headerText)) {
							// Navigate to find the associated table
							let currentElement: Element | null = header;

							// Go up until we find a container, then look for tablebg
							while (currentElement) {
								currentElement = currentElement.parentElement;
								if (currentElement) {
									const table =
										currentElement.querySelector(
											"table.tablebg"
										);
									if (table) {
										return table as HTMLTableElement;
									}

									// Also check next siblings
									let nextSibling =
										currentElement.nextElementSibling;
									while (nextSibling) {
										const table =
											nextSibling.querySelector(
												"table.tablebg"
											);
										if (table) {
											return table as HTMLTableElement;
										}
										nextSibling =
											nextSibling.nextElementSibling;
									}
								}
							}
						}
					}
					return null;
				};

				// Extract Basic Details - this has the complex structure with multiple columns
				const basicDetailsTable = findTableByHeader("Basic Details");
				const basicDetails = basicDetailsTable
					? extractTableData(basicDetailsTable)
					: {};

				// Extract Tender Fee Details
				const tenderFeeTable = findTableByHeader("Tender Fee Details");
				const tenderFeeDetails = tenderFeeTable
					? extractTableData(tenderFeeTable)
					: {};

				// Extract EMD Fee Details
				const emdFeeTable = findTableByHeader("EMD Fee Details");
				const emdFeeDetails = emdFeeTable
					? extractTableData(emdFeeTable)
					: {};

				// Extract Work Item Details
				const workItemTable = findTableByHeader("Work Item Details");
				const workItemDetails = workItemTable
					? extractTableData(workItemTable)
					: {};

				// Extract Critical Dates
				const criticalDatesTable = findTableByHeader("Critical Dates");
				const criticalDates = criticalDatesTable
					? extractTableData(criticalDatesTable)
					: {};

				// Extract Tender Inviting Authority
				const authorityTable = findTableByHeader(
					"Tender Inviting Authority"
				);
				const tenderAuthority = authorityTable
					? extractTableData(authorityTable)
					: {};

				return {
					basicDetails,
					tenderFeeDetails,
					emdFeeDetails,
					workItemDetails,
					criticalDates,
					tenderAuthority,
				};
			});

			this.logger.success("Successfully scraped tender details");
			return tenderDetails;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error scraping tender details: ${errorMessage}`);

			return {
				basicDetails: {},
				tenderFeeDetails: {},
				emdFeeDetails: {},
				workItemDetails: {},
				criticalDates: {},
				tenderAuthority: {},
			};
		}
	}
	// =================================================== //
	// ============= HELPER FUNCTIONS END =============== //
	// =================================================== //
}
