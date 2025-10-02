// lib/scraper/providers/e-procure-scraper.ts
import {
	cleanKey,
	PuppeteerBrowser,
	toCamelCase,
} from "@/utils/puppeteer-browser";
import { Page } from "puppeteer";
import { saveToJsonFile } from "@/utils/save-to-json";
import { ScraperProvider, ScrapingResult } from "../scraper.interface";
import { convertToScrapedTenderData } from "@/utils/e-procure-tender-converter";
import { ParallelTaskManager } from "@/lib/worker-manager/worker-manager.service";

export interface TenderDetail {
	serialNumber: string;
	ePublishedDate: string;
	closingDate: string;
	openingDate: string;
	title: string;
	referenceNumber: string;
	organizationChain: string;
	tenderLink: string;
	detailedData?: Record<string, any>;
}

interface OrganizationData {
	[key: string]: {
		organizationName: string;
		tenderCount: number;
		tenderDetails: TenderDetail[];
	};
}

interface OrganizationLink {
	organizationName: string;
	tenderLink: string;
}

const TARGET_SECTIONS = [
	"Basic Details",
	"Tender Fee Details",
	"EMD Fee Details",
	"Work Item Details",
	"Critical Dates",
	"Tender Inviting Authority",
];

export class EProcureScraper implements ScraperProvider {
	private parallelManager: ParallelTaskManager;
	private detailedParallelManager: ParallelTaskManager;
	private readonly isDevelopment: boolean;
	private readonly maxOrganizations: number;
	private readonly maxTendersPerOrg: number;

	constructor() {
		// Main parallel manager for organization pages
		this.parallelManager = new ParallelTaskManager({
			maxConcurrent: 10, // Reduced from 20
			taskTimeout: 30000,
			retryAttempts: 2,
			retryDelay: 1000,
		});

		// Separate parallel manager for detailed pages with lower concurrency
		this.detailedParallelManager = new ParallelTaskManager({
			maxConcurrent: 3, // Very low concurrency for detailed pages
			taskTimeout: 45000, // Increased timeout
			retryAttempts: 1, // Only 1 retry for timeouts
			retryDelay: 3000,
		});

		this.isDevelopment = process.env.DEVELOPMENT_MODE === "true";

		if (this.isDevelopment) {
			this.maxOrganizations = 3;
			this.maxTendersPerOrg = 3;
			console.log(
				`🔬 DEVELOPMENT MODE: Limited to ${this.maxOrganizations} organizations and ${this.maxTendersPerOrg} tenders per organization`
			);
		} else {
			this.maxOrganizations = parseInt(
				process.env.MAX_ORGANIZATIONS || "500"
			);
			this.maxTendersPerOrg = parseInt(
				process.env.MAX_TENDERS_PER_ORGANIZATION || "500"
			);
			console.log(
				`🔄 PRODUCTION MODE: Max ${this.maxOrganizations} organizations and ${this.maxTendersPerOrg} tenders per organization`
			);
		}
	}

	/**
	 * Delay helper function
	 */
	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Fetch with retry logic
	 */
	private async fetchWithRetry<T>(
		fetchFn: () => Promise<T>,
		context: string,
		maxRetries: number = 2
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await fetchFn();
			} catch (error:any) {
				lastError = error as Error;
				console.warn(
					`Attempt ${attempt} failed for ${context}:`,
					error.message
				);

				if (attempt < maxRetries) {
					await this.delay(1000 * attempt); // Exponential backoff
				}
			}
		}

		throw lastError!;
	}

	/**
	 * Extract organization links from the main page
	 */
	private async fetchOrganizationLinks(
		page: Page
	): Promise<OrganizationLink[]> {
		console.log("Fetching organization links...");

		return await page.evaluate(
			(maxOrgs: number, isDev: boolean) => {
				const organizations: OrganizationLink[] = [];
				const rows = document.querySelectorAll("tr.even, tr.odd");
				let count = 0;

				for (const row of rows) {
					if (isDev && count >= maxOrgs) break;

					const cells = row.querySelectorAll("td");
					if (cells.length >= 3) {
						const organizationName =
							cells[1].textContent?.trim() || "";
						const tenderLinkElement =
							cells[2].querySelector("a.link2") ||
							cells[2].querySelector("a");
						const tenderLink =
							tenderLinkElement?.getAttribute("href") || "";

						if (organizationName && tenderLink) {
							const fullTenderLink = tenderLink.startsWith("http")
								? tenderLink
								: `https://eprocure.gov.in${tenderLink}`;

							organizations.push({
								organizationName,
								tenderLink: fullTenderLink,
							});
							count++;
						}
					}
				}
				return organizations;
			},
			this.maxOrganizations,
			this.isDevelopment
		);
	}

	/**
	 * Fetch tender details from organization page
	 */
	private async fetchTenderDetails(
		tenderLink: string
	): Promise<TenderDetail[]> {
		const tenderPage = await PuppeteerBrowser.newPage();

		try {
			return await this.fetchWithRetry(async () => {
				await tenderPage.goto(tenderLink, {
					waitUntil: "domcontentloaded",
					timeout: 20000, // Increased timeout
				});
				await tenderPage.waitForSelector("tr.even, tr.odd", {
					timeout: 10000, // Increased timeout
				});

				return await tenderPage.evaluate(
					(maxTenders: number, isDev: boolean) => {
						const tenders: TenderDetail[] = [];
						const rows =
							document.querySelectorAll("tr.even, tr.odd");
						let count = 0;

						for (const row of rows) {
							if (isDev && count >= maxTenders) break;

							const cells = row.querySelectorAll("td");
							if (cells.length >= 6) {
								const serialNumber =
									cells[0].textContent?.trim() || "";
								const ePublishedDate =
									cells[1].textContent?.trim() || "";
								const closingDate =
									cells[2].textContent?.trim() || "";
								const openingDate =
									cells[3].textContent?.trim() || "";

								const titleCell = cells[4];
								const titleLink = titleCell.querySelector("a");
								const title =
									titleLink?.textContent?.trim() || "";
								const referenceNumber =
									titleCell.textContent
										?.replace(title, "")
										?.trim() || "";

								const organizationChain =
									cells[5].textContent?.trim() || "";
								const tenderLink =
									titleLink?.getAttribute("href") || "";

								const fullTenderLink = tenderLink.startsWith(
									"http"
								)
									? tenderLink
									: `https://eprocure.gov.in${tenderLink}`;

								tenders.push({
									serialNumber,
									ePublishedDate,
									closingDate,
									openingDate,
									title,
									referenceNumber,
									organizationChain,
									tenderLink: fullTenderLink,
								});
								count++;
							}
						}
						return tenders;
					},
					this.maxTendersPerOrg,
					this.isDevelopment
				);
			}, `fetchTenderDetails-${tenderLink}`);
		} finally {
			await tenderPage.close();
		}
	}

	/**
	 * Process organizations in parallel
	 */
	private async processOrganizationsInParallel(
		organizationLinks: OrganizationLink[]
	): Promise<OrganizationData> {
		const organizationData: OrganizationData = {};
		console.log(
			`🚀 Starting parallel processing of ${organizationLinks.length} organizations...`
		);

		const results = await this.parallelManager.runParallel(
			organizationLinks,
			async (org: OrganizationLink) => {
				try {
					const tenderDetails = await this.fetchTenderDetails(
						org.tenderLink
					);
					return {
						organizationName: org.organizationName,
						tenderDetails,
						success: true,
					};
				} catch (error: any) {
					console.error(
						`Failed to scrape ${org.organizationName}:`,
						error.message
					);
					return {
						organizationName: org.organizationName,
						tenderDetails: [],
						success: false,
					};
				}
			},
			(completed, total, result) => {
				const progress = ((completed / total) * 100).toFixed(1);
				const currentOrg = result?.data?.organizationName || "";
				const status = result?.success ? "✅" : "❌";
				const tenderCount = result?.data?.tenderDetails?.length || 0;

				if (currentOrg) {
					console.log(
						`${status} ${currentOrg}: ${tenderCount} tenders (${completed}/${total} - ${progress}%)`
					);
				} else {
					process.stdout.write(
						`\r📊 Progress: ${completed}/${total} organizations (${progress}%)`
					);
				}
			}
		);

		// Build organization data
		for (const result of results) {
			if (result && result.success) {
				organizationData[result.organizationName] = {
					organizationName: result.organizationName,
					tenderCount: result.tenderDetails.length,
					tenderDetails: result.tenderDetails,
				};
			} else {
				organizationData[result.organizationName] = {
					organizationName: result.organizationName,
					tenderCount: 0,
					tenderDetails: [],
				};
			}
		}

		console.log(`\n✅ Parallel processing completed!`);
		return organizationData;
	}

	/**
	 * Extract detailed tender data from individual tender pages with enhanced error handling
	 */
	private async extractTenderDetailedData(
		tenderLink: string
	): Promise<Record<string, any>> {
		const detailPage = await PuppeteerBrowser.newPage();

		try {
			return await this.fetchWithRetry(
				async () => {
					// Set longer timeouts for detailed pages
					await detailPage.setDefaultNavigationTimeout(30000);
					await detailPage.setDefaultTimeout(25000);

					// Block unnecessary resources to speed up loading
					await detailPage.setRequestInterception(true);
					detailPage.on("request", (request) => {
						const resourceType = request.resourceType();
						// Block images, fonts, stylesheets to speed up loading
						if (
							["image", "font", "stylesheet", "media"].includes(
								resourceType
							)
						) {
							request.abort();
						} else {
							request.continue();
						}
					});

					try {
						console.log(
							`🔍 Loading: ${tenderLink.substring(0, 80)}...`
						);

						await detailPage.goto(tenderLink, {
							waitUntil: "domcontentloaded",
							timeout: 25000, // Increased timeout
						});

						// Try multiple selectors with shorter timeouts
						try {
							await Promise.race([
								detailPage.waitForSelector("table.tablebg", {
									timeout: 8000,
								}),
								detailPage.waitForSelector("td.pageheader", {
									timeout: 8000,
								}),
								detailPage.waitForSelector("body", {
									timeout: 5000,
								}), // Fallback
							]);
						} catch (waitError) {
							console.warn(
								`⚠️ Selectors not found for ${tenderLink}, but continuing...`
							);
							// Continue anyway, the page might have loaded
						}

						return await detailPage.evaluate(
							(
								targetSections: string[],
								toCamelCaseStr: string,
								cleanKeyStr: string
							) => {
								const toCamelCase = new Function(
									"return " + toCamelCaseStr
								)();
								const cleanKey = new Function(
									"return " + cleanKeyStr
								)();
								const result: Record<string, any> = {};

								try {
									const sectionHeaders =
										document.querySelectorAll(
											"td.pageheader"
										);

									for (const header of sectionHeaders) {
										const sectionNameElement =
											header.querySelector(
												"td[background='images/midbg.png']"
											);
										const sectionName =
											sectionNameElement?.textContent?.trim() ||
											"";

										if (
											!targetSections.includes(
												sectionName
											)
										)
											continue;

										const headerRow = header.closest("tr");
										if (!headerRow) continue;

										const nextRow =
											headerRow.nextElementSibling;
										if (!nextRow) continue;

										const dataTable =
											nextRow.querySelector(
												"table.tablebg"
											);
										if (!dataTable) continue;

										const sectionKey =
											toCamelCase(sectionName);
										result[sectionKey] = {};

										// Extract basic field data
										const rows =
											dataTable.querySelectorAll("tr");
										for (const row of rows) {
											const captionCell =
												row.querySelector(
													"td.td_caption"
												);
											const fieldCell =
												row.querySelector(
													"td.td_field"
												);

											if (captionCell && fieldCell) {
												const rawKey =
													captionCell.textContent?.trim() ||
													"";
												const cleanedKey =
													cleanKey(rawKey);
												const camelKey =
													toCamelCase(cleanedKey);
												const value =
													fieldCell.textContent?.trim() ||
													"";

												if (camelKey && value) {
													result[sectionKey][
														camelKey
													] = value;
												}
											}
										}

										// Handle special sections
										if (
											sectionName.includes(
												"Covers Information"
											)
										) {
											const coversTable =
												dataTable.querySelector(
													"table.list_table"
												);
											if (coversTable) {
												const covers: any[] = [];
												const coverRows =
													coversTable.querySelectorAll(
														"tr:not(.list_header)"
													);

												for (const coverRow of coverRows) {
													const cells =
														coverRow.querySelectorAll(
															"td"
														);
													if (cells.length >= 4) {
														covers.push({
															coverNo:
																cells[0].textContent?.trim() ||
																"",
															coverType:
																cells[1].textContent?.trim() ||
																"",
															description:
																cells[2].textContent?.trim() ||
																"",
															documentType:
																cells[3].textContent?.trim() ||
																"",
														});
													}
												}

												if (covers.length > 0) {
													result[sectionKey].covers =
														covers;
												}
											}
										}

										if (
											sectionName ===
											"Payment Instruments"
										) {
											const instrumentsTable =
												dataTable.querySelector(
													"table#offlineInstrumentsTableView"
												);
											if (instrumentsTable) {
												const instruments: any[] = [];
												const instrumentRows =
													instrumentsTable.querySelectorAll(
														"tr:not(.list_header)"
													);

												for (const instRow of instrumentRows) {
													const cells =
														instRow.querySelectorAll(
															"td"
														);
													if (cells.length >= 2) {
														instruments.push({
															serialNo:
																cells[0].textContent?.trim() ||
																"",
															instrumentType:
																cells[1].textContent?.trim() ||
																"",
														});
													}
												}

												if (instruments.length > 0) {
													result[
														sectionKey
													].offlineInstruments =
														instruments;
												}
											}
										}

										// Remove empty sections
										if (
											Object.keys(result[sectionKey])
												.length === 0
										) {
											delete result[sectionKey];
										}
									}
								} catch (e) {
									console.error(
										"Error in page evaluation:",
										e
									);
								}

								return result;
							},
							TARGET_SECTIONS,
							toCamelCase.toString(),
							cleanKey.toString()
						);
					} finally {
						// Remove request interception
						await detailPage.setRequestInterception(false);
					}
				},
				`extractTenderDetailedData-${tenderLink}`,
				1 // Only 1 retry for detailed pages to avoid infinite loops
			);
		} catch (error) {
			console.error(
				`❌ Error extracting detailed data from ${tenderLink}:`,
				error instanceof Error ? error.message : error
			);
			return {};
		} finally {
			await detailPage.close();
		}
	}

	/**
	 * Process all tenders across all organizations to extract detailed data with batching
	 */
	private async processAllTendersDetailedData(
		organizationData: OrganizationData
	): Promise<void> {
		console.log(
			`\n🔍 Starting detailed data extraction for all tenders...`
		);

		// Collect all tenders from all organizations
		const allTenders: Array<{
			orgName: string;
			tenderIndex: number;
			tender: TenderDetail;
		}> = [];

		for (const orgName in organizationData) {
			organizationData[orgName].tenderDetails.forEach((tender, index) => {
				allTenders.push({ orgName, tenderIndex: index, tender });
			});
		}

		console.log(
			`📊 Total tenders for detailed extraction: ${allTenders.length}`
		);

		let successfulExtractions = 0;
		let failedExtractions = 0;

		// Process in smaller batches with delays
		const batchSize = 50; // Smaller batches
		for (let i = 0; i < allTenders.length; i += batchSize) {
			const batch = allTenders.slice(i, i + batchSize);
			console.log(
				`\n🔄 Processing batch ${
					Math.floor(i / batchSize) + 1
				}/${Math.ceil(allTenders.length / batchSize)} (${
					batch.length
				} tenders)`
			);

			const batchResults = await this.detailedParallelManager.runParallel(
				batch,
				async (item: {
					orgName: string;
					tenderIndex: number;
					tender: TenderDetail;
				}) => {
					try {
						// Add small delay between requests in the same batch
						await this.delay(500);

						const detailedData =
							await this.extractTenderDetailedData(
								item.tender.tenderLink
							);

						const scrapedTender = convertToScrapedTenderData(
							{
								...item.tender,
								detailedData,
							},
							undefined
						);

						successfulExtractions++;
						return {
							orgName: item.orgName,
							tenderIndex: item.tenderIndex,
							tender: {
								...item.tender,
								detailedData: scrapedTender,
							},
							success: true,
						};
					} catch (error) {
						console.error(
							`❌ Failed to extract details for ${item.tender.title}`
						);
						failedExtractions++;
						return {
							orgName: item.orgName,
							tenderIndex: item.tenderIndex,
							tender: item.tender,
							success: false,
						};
					}
				},
				(completed, total) => {
					const progress = ((completed / total) * 100).toFixed(1);
					process.stdout.write(
						`\r📊 Detailed Extraction: ${i + completed}/${
							allTenders.length
						} tenders (${progress}%) | Success: ${successfulExtractions} | Failed: ${failedExtractions}`
					);
				}
			);

			// Update organization data with detailed tender information
			for (const result of batchResults) {
				if (result.success) {
					organizationData[result.orgName].tenderDetails[
						result.tenderIndex
					] = result.tender;
				}
			}

			// Add delay between batches
			if (i + batchSize < allTenders.length) {
				console.log(`\n⏳ Waiting 5 seconds before next batch...`);
				await this.delay(5000);
			}
		}

		console.log(`\n✅ Detailed data extraction completed!`);
		console.log(
			`📈 Results: ${successfulExtractions} successful, ${failedExtractions} failed`
		);
	}

	async execute(url: string): Promise<ScrapingResult> {
		const startTime = Date.now();

		try {
			if (!PuppeteerBrowser) {
				throw new Error("Puppeteer browser instance is not available");
			}

			const page = await PuppeteerBrowser.newPage();
			await page.goto(url, {
				waitUntil: "domcontentloaded",
				timeout: 20000,
			});
			await page.waitForSelector("tr.even, tr.odd", { timeout: 10000 });

			// Step 1: Fetch organization links
			const organizationLinks = await this.fetchOrganizationLinks(page);
			console.log(
				`\n🎯 Found ${organizationLinks.length} organizations with tender links`
			);
			await page.close();

			if (organizationLinks.length === 0) {
				return {
					success: true,
					data: {},
					metadata: {
						provider: "eprocure",
						pagesScraped: 1,
						dataPoints: 0,
						duration: Date.now() - startTime,
					},
				};
			}

			// Step 2: Process organizations in parallel
			const organizationData = await this.processOrganizationsInParallel(
				organizationLinks
			);

			// Step 3: Extract detailed data for all tenders
			await this.processAllTendersDetailedData(organizationData);

			// Step 4: Save to JSON file
			await saveToJsonFile(organizationData);

			// Calculate statistics
			const totalDataPoints = Object.values(organizationData).reduce(
				(total, org) => total + org.tenderCount,
				0
			);

			return {
				success: true,
				data: organizationData,
				metadata: {
					provider: "eprocure",
					pagesScraped: Object.keys(organizationData).length + 1,
					dataPoints: totalDataPoints,
					duration: Date.now() - startTime,
				},
			};
		} catch (error) {
			console.error("❌ Scraping error:", error);
			return {
				success: false,
				data: {},
				metadata: {
					provider: "eprocure",
					pagesScraped: 0,
					dataPoints: 0,
					duration: Date.now() - startTime,
				},
				error:
					error instanceof Error
						? error.message
						: "Unknown error occurred",
			};
		} finally {
			if (PuppeteerBrowser) {
				await PuppeteerBrowser.close();
			}
		}
	}
}
