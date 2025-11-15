// lib/scraper/providers/e-procure-scraper.ts
import {
	DateRange,
	OrganizationInfo,
	ScraperProvider,
} from "../scraper.interface";
import { isDateInRange } from "@/lib/utils";
import puppeteer, { Page } from "puppeteer";
import { LoggerService } from "@/lib/logger-service/logger.service";
import { sessionManager } from "@/lib/session-manager/session-manager.service";
import { tenderService } from "@/lib/tender-service/tender.service";
import { ScrapedTenderData } from "@/interface/tender.interface";
import { ScrapingProvider } from "@prisma/client";
import crypto from "crypto";

interface ITendersLinkInfo {
	title: string;
	referenceNumber: string;
	ePublishedDate: string;
	closingDate: string;
	openingDate: string;
	tenderLink: string;
	organizationChain: string;
	tenderDetails?: any;
}

export class EProcureScraper implements ScraperProvider {
	private logger: LoggerService;
	private baseUrl: string = "https://eprocure.gov.in";
	private sessionId: string = "";
	private totalTendersFound: number = 0;
	private totalTendersScraped: number = 0;
	private totalTendersSaved: number = 0;
	private totalPagesNavigated: number = 0;
	private isStopped: boolean = false;

	constructor() {
		this.logger = LoggerService.getInstance();
		this.logger.setContext(EProcureScraper.name);
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
			// Note: No session tracking in getOrganizations as it's called before session creation

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

	// Tender Scrapper logic
	async execute(
		url: string,
		organizations: string[],
		dateRange?: DateRange,
		tendersPerOrganization: number = 20,
		isTenderPerOrganizationLimited: boolean = false,
		sessionId?: string
	): Promise<any[]> {
		let browser;
		try {
			this.logger.info(`Starting E-Procure execution for URL: ${url}`);

			// Initialize session
			this.sessionId = sessionId || crypto.randomUUID();
			this.isStopped = false;

			// Reset counters for new session
			this.totalTendersFound = 0;
			this.totalTendersScraped = 0;
			this.totalTendersSaved = 0;
			this.totalPagesNavigated = 0;

			// Initialize session stats
			await sessionManager.updateStats(this.sessionId, {
				organizationsFound: organizations.length,
				organizationsScraped: 0,
				tendersFound: 0,
				tenderScraped: 0,
				tendersSaved: 0,
				pagesNavigated: 0,
			});

			browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			const page = await browser.newPage();
			await page.setUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
			);

			await page.goto(url, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});
			await this.trackPageNavigation("Initial page load");

			await page.waitForSelector("table.list_table", { timeout: 10000 });

			const results = await this.processOrganizationTendersProcess(
				page,
				organizations,
				this.baseUrl,
				dateRange,
				tendersPerOrganization,
				isTenderPerOrganizationLimited
			);

			// Only mark as completed if not stopped by user
			if (!this.isStopped) {
				sessionManager.completeSession(this.sessionId, {
					status: "COMPLETED",
					progress: 100,
				});
			}

			return results;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error in execute method: ${errorMessage}`);

			// Update session with error
			if (this.sessionId) {
				sessionManager.failSession(this.sessionId, errorMessage);
			}

			return [];
		} finally {
			if (browser) {
				await browser.close();
				this.logger.info("Browser closed");
			}
		}
	}

	// Check if scraping should stop
	private shouldStop(): boolean {
		if (this.isStopped) return true;

		const session = sessionManager.getSession(this.sessionId);
		if (session?.status === "STOPPED") {
			this.isStopped = true;
			return true;
		}
		return false;
	}

	// Track page navigation and update session stats
	private async trackPageNavigation(description?: string): Promise<void> {
		try {
			this.totalPagesNavigated++;
			await sessionManager.updateStats(this.sessionId, {
				pagesNavigated: this.totalPagesNavigated,
			});
			if (description) {
				this.logger.info(`Page navigation tracked: ${description} (Total: ${this.totalPagesNavigated})`);
			}
		} catch (error) {
			this.logger.error(`Failed to track page navigation: ${error}`);
		}
	}

	// =================================================== //
	// ============ HELPER FUNCTIONS START ============== //
	// =================================================== //

	// Core method to process each organization's tenders with progress tracking
	private async processOrganizationTendersProcess(
		page: Page,
		organizations: string[],
		baseUrl: string,
		dateRange?: DateRange,
		tendersPerOrganization: number = 20,
		isTenderPerOrganizationLimited: boolean = false
	): Promise<any> {
		const results: Array<{
			organization: string;
			tendersPageLink: string | null;
			found: boolean;
			tenders: Array<ITendersLinkInfo>;
		}> = [];

		try {
			// Store the original URL to navigate back after each organization
			const originalUrl = page.url();

			// Calculate progress per organization
			const progressPerOrganization = 100 / organizations.length;
			let currentOrganizationProgress = 0;

			// Process each organization
			for (const [index, orgName] of organizations.entries()) {
				// Check if scraping should stop before processing each organization
				if (this.shouldStop()) {
					this.logger.info(
						`Scraping stopped by user for session: ${this.sessionId}`
					);
					break;
				}

				try {
					this.logger.info(`Processing organization: ${orgName}`);

					// Update session for current organization
					await sessionManager.updateCurrentActivity(
						this.sessionId,
						orgName,
						"Fetching tender links"
					);

					// Make sure we're on the main organizations page before getting the tender link
					if (page.url() !== originalUrl) {
						this.logger.info(
							`Navigating back to main organizations page`
						);
						await page.goto(originalUrl, {
							waitUntil: "networkidle2",
							timeout: 30000,
						});
						await this.trackPageNavigation(`Navigate to main organizations page for ${orgName}`);
						await page.waitForSelector("table.list_table", {
							timeout: 10000,
						});
					}

					// Check again after navigation
					if (this.shouldStop()) {
						this.logger.info(`Scraping stopped during navigation`);
						break;
					}

					// Extract tender link for this organization
					const tendersPageLink = await this.getTenderPageLink(
						page,
						orgName,
						baseUrl
					);

					let tenders: Array<ITendersLinkInfo> = [];

					if (tendersPageLink) {
						this.logger.info(
							`Navigating to tender page: ${tendersPageLink}`
						);

						// Navigate to the tender page
						await page.goto(tendersPageLink, {
							waitUntil: "networkidle2",
							timeout: 30000,
						});
						await this.trackPageNavigation(`Navigate to tender listing page for ${orgName}`);

						// Wait for the tender table to load
						await page.waitForSelector("table.list_table", {
							timeout: 10000,
						});

						// Check again after loading tender page
						if (this.shouldStop()) {
							this.logger.info(`Scraping stopped at tender page`);
							break;
						}

						// UPDATED: Check if there are tenders available and scrape them with limit and date filtering
						if (isTenderPerOrganizationLimited) {
							this.logger.info(
								`Scraping limited to ${tendersPerOrganization} tenders for ${orgName}`
							);
							tenders = await this.scrapeTendersLinksFromPage(
								page,
								baseUrl,
								tendersPerOrganization,
								dateRange,
								orgName,
								progressPerOrganization,
								currentOrganizationProgress
							);
						} else {
							this.logger.info(
								`Scraping ALL tenders for ${orgName}`
							);
							tenders = await this.scrapeAllTendersFromAllPages(
								page,
								baseUrl,
								dateRange,
								orgName,
								progressPerOrganization,
								currentOrganizationProgress
							);
						}

						this.logger.success(
							`Found ${tenders.length} tenders for ${orgName} after date filtering`
						);

						// After scraping tenders, navigate back to main page for next organization
						this.logger.info(
							`Navigating back to main page for next organization`
						);
						await page.goBack({
							waitUntil: "networkidle2",
							timeout: 30000,
						});
						await this.trackPageNavigation(`Navigate back to main page after processing ${orgName}`);
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

					// Update organization progress
					currentOrganizationProgress += progressPerOrganization;
					await sessionManager.updateProgress(
						this.sessionId,
						currentOrganizationProgress
					);
					await sessionManager.updateStats(this.sessionId, {
						organizationsScraped: index + 1,
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

					// Still update progress even if organization fails
					currentOrganizationProgress += progressPerOrganization;
					await sessionManager.updateProgress(
						this.sessionId,
						currentOrganizationProgress
					);
					await sessionManager.updateStats(this.sessionId, {
						organizationsScraped: index + 1,
					});

					// Try to recover by going back to main page
					try {
						if (page.url() !== originalUrl) {
							await page.goto(originalUrl, {
								waitUntil: "networkidle2",
								timeout: 30000,
							});
							await this.trackPageNavigation(`Recovery navigation to main page after error in ${orgName}`);
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

	// Helper method to scrape tenders from the tender listing page with progress tracking
	private async scrapeTendersLinksFromPage(
		page: Page,
		baseUrl: string,
		limit?: number,
		dateRange?: DateRange,
		orgName?: string,
		orgProgressPercentage?: number,
		currentOrgProgress?: number
	): Promise<Array<ITendersLinkInfo>> {
		try {
			const tenders = await page.evaluate((baseUrl) => {
				const tenderList: Array<ITendersLinkInfo> = [];

				// Get all data rows (excluding header)
				const rows = document.querySelectorAll(
					"table.list_table tr.even, table.list_table tr.odd"
				);

				for (const row of Array.from(rows)) {
					const cells = row.querySelectorAll("td");

					if (cells.length >= 6) {
						// Extract data from each cell
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

			// Apply date range filtering
			const filteredTenders = tenders.filter((tender) =>
				isDateInRange(tender.ePublishedDate, dateRange)
			);

			this.logger.info(
				`Date filtering: ${tenders.length} total tenders, ${filteredTenders.length} after date filter`
			);

			// FIXED: Accumulate tenders found across all organizations
			this.totalTendersFound += filteredTenders.length;
			await sessionManager.updateStats(this.sessionId, {
				tendersFound: this.totalTendersFound,
			});

			// Apply limit if specified (after date filtering)
			const limitedTenders = limit
				? filteredTenders.slice(0, limit)
				: filteredTenders;

			// Calculate progress per tender for this organization
			const progressPerTender =
				orgProgressPercentage && limitedTenders.length > 0
					? orgProgressPercentage / limitedTenders.length
					: 0;

			let tenderProgress = currentOrgProgress || 0;

			// Now scrape detailed information for each tender (with limit applied)
			for (let i = 0; i < limitedTenders.length; i++) {
				// Check if scraping should stop before processing each tender
				if (this.shouldStop()) {
					this.logger.info(
						`Scraping stopped during tender processing`
					);
					break;
				}

				try {
					this.logger.info(
						`Scraping detailed information for tender: ${limitedTenders[i].title}`
					);

					// Update session for current tender
					await sessionManager.updateCurrentActivity(
						this.sessionId,
						orgName || "Unknown Organization",
						`Scraping tender: ${limitedTenders[i].title}`
					);

					const tenderDetails = await this.scrapeTenderDetails(
						page,
						limitedTenders[i].tenderLink,
						baseUrl,
						orgName || "Unknown Organization",
						limitedTenders[i].organizationChain,
						limitedTenders[i].referenceNumber
					);

					limitedTenders[i].tenderDetails = tenderDetails;

					// FIXED: Accumulate tenders scraped across all organizations
					this.totalTendersScraped++;

					// Save tender to database if scraped successfully
					if (tenderDetails) {
						try {
							const saveResult = await tenderService.saveTender(tenderDetails);
							
							if (saveResult.isNew || saveResult.isUpdated) {
								this.totalTendersSaved++;
								this.logger.success(
									`Tender saved successfully: ${tenderDetails.tenderId} (${saveResult.isNew ? "new" : "updated to version " + saveResult.tender.version})`
								);
							} else {
								this.logger.info(
									`Tender unchanged, skipped save: ${tenderDetails.tenderId}`
								);
							}

							// Update tenders saved count in session stats
							await sessionManager.updateStats(this.sessionId, {
								tendersSaved: this.totalTendersSaved,
							});
						} catch (saveError) {
							const errorMessage =
								saveError instanceof Error
									? saveError.message
									: "Unknown error occurred";
							this.logger.error(
								`Error saving tender ${tenderDetails.tenderId}: ${errorMessage}`
							);
							// Continue processing even if save fails
						}
					}

					// Update progress for each tender scraped
					if (progressPerTender > 0) {
						tenderProgress += progressPerTender;
						await sessionManager.updateProgress(
							this.sessionId,
							tenderProgress
						);
					}

					// Update tender scraped count (accumulated total)
					await sessionManager.updateStats(this.sessionId, {
						tenderScraped: this.totalTendersScraped,
					});

					// Go back to the tender listing page
					await page.goBack({
						waitUntil: "networkidle2",
						timeout: 30000,
					});
					await this.trackPageNavigation(`Navigate back to tender listing after scraping tender details`);
					await page.waitForSelector("table.list_table", {
						timeout: 10000,
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Unknown error occurred";
					this.logger.error(
						`Error scraping details for tender ${limitedTenders[i].title}: ${errorMessage}`
					);
					limitedTenders[i].tenderDetails = null;

					// Still accumulate even if tender fails (we attempted to scrape it)
					this.totalTendersScraped++;

					// Still update progress even if tender fails
					if (progressPerTender > 0) {
						tenderProgress += progressPerTender;
						await sessionManager.updateProgress(
							this.sessionId,
							tenderProgress
						);
					}

					// Update tender scraped count (accumulated total)
					await sessionManager.updateStats(this.sessionId, {
						tenderScraped: this.totalTendersScraped,
					});
				}
			}

			return limitedTenders;
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

	// Method to scrape tenders from single page only with progress tracking
	private async scrapeAllTendersFromAllPages(
		page: Page,
		baseUrl: string,
		dateRange?: DateRange,
		orgName?: string,
		orgProgressPercentage?: number,
		currentOrgProgress?: number
	): Promise<Array<ITendersLinkInfo>> {
		try {
			this.logger.info(
				"Scraping tenders from current page (no pagination available)"
			);

			// Simply scrape from the current page without attempting pagination
			const tenders = await this.scrapeTendersLinksFromPage(
				page,
				baseUrl,
				undefined, // No limit
				dateRange,
				orgName,
				orgProgressPercentage,
				currentOrgProgress
			);

			this.logger.success(
				`Scraped ${tenders.length} tenders from current page`
			);

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
		baseUrl: string,
		organisation: string,
		organisationChain: string,
		referenceNumber: string
	): Promise<ScrapedTenderData | null> {
		try {
			this.logger.info(`Scraping tender details from: ${tenderLink}`);

			await page.goto(tenderLink, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});
			await this.trackPageNavigation(`Navigate to tender details page`);

			await page.waitForSelector(".page_content", { timeout: 10000 });

			const scrapedData = await page.evaluate(() => {
				// Helper function to extract text content from element
				const getText = (element: Element | null): string => {
					if (!element) return "";
					// Get text content and clean it
					let text = element.textContent || "";
					// Replace HTML entities
					text = text.replace(/&nbsp;/g, " ");
					text = text.replace(/\u00A0/g, " "); // Non-breaking space
					text = text.replace(/&amp;/g, "&");
					text = text.replace(/&lt;/g, "<");
					text = text.replace(/&gt;/g, ">");
					// Remove HTML tags if any
					text = text.replace(/<[^>]*>/g, "");
					// Trim and normalize whitespace
					return text.trim().replace(/\s+/g, " ");
				};

				// Helper function to find table by header text
				const findTableByHeader = (headerText: string): HTMLTableElement | null => {
					const headers = document.querySelectorAll(".pageheader");

					for (const header of Array.from(headers)) {
						if (header.textContent?.includes(headerText)) {
							let currentElement: Element | null = header;

							while (currentElement) {
								currentElement = currentElement.parentElement;
								if (currentElement) {
									const table = currentElement.querySelector("table.tablebg");
									if (table) {
										return table as HTMLTableElement;
									}

									let nextSibling = currentElement.nextElementSibling;
									while (nextSibling) {
										const table = nextSibling.querySelector("table.tablebg");
										if (table) {
											return table as HTMLTableElement;
										}
										nextSibling = nextSibling.nextElementSibling;
									}
								}
							}
						}
					}
					return null;
				};

				// Helper function to get value from table by key
				const getValueFromTable = (table: HTMLTableElement | null, keyText: string): string => {
					if (!table) return "";

					const rows = table.querySelectorAll("tr");
					for (const row of Array.from(rows)) {
						const cells = row.querySelectorAll("td");
						
						for (let i = 0; i < cells.length - 1; i += 2) {
							const key = getText(cells[i]);
							if (key.toLowerCase().includes(keyText.toLowerCase())) {
								return getText(cells[i + 1]);
							}
						}
						
						// Handle 4-cell rows (2 key-value pairs)
						if (cells.length === 4) {
							const key1 = getText(cells[0]);
							const value1 = getText(cells[1]);
							const key2 = getText(cells[2]);
							const value2 = getText(cells[3]);

							if (key1.toLowerCase().includes(keyText.toLowerCase())) {
								return value1;
							}
							if (key2.toLowerCase().includes(keyText.toLowerCase())) {
								return value2;
							}
						}
						
						// Handle 6-cell rows (3 key-value pairs)
						if (cells.length === 6) {
							for (let i = 0; i < 6; i += 2) {
								const key = getText(cells[i]);
								const value = getText(cells[i + 1]);
								if (key.toLowerCase().includes(keyText.toLowerCase())) {
									return value;
								}
							}
						}
					}
					return "";
				};

				// Extract all sections
				const basicDetailsTable = findTableByHeader("Basic Details");
				const workItemTable = findTableByHeader("Work Item Details");
				const emdFeeTable = findTableByHeader("EMD Fee Details");
				const criticalDatesTable = findTableByHeader("Critical Dates");
				const authorityTable = findTableByHeader("Tender Inviting Authority");

				// Extract specific fields
				const organisationChain = getValueFromTable(basicDetailsTable, "Organisation Chain");
				const tenderId = getValueFromTable(basicDetailsTable, "Tender ID");
				const tenderRefNo = getValueFromTable(basicDetailsTable, "Tender Reference Number");
				
				const workDescription = getValueFromTable(workItemTable, "Work Description");
				const title = getValueFromTable(workItemTable, "Title");
				const tenderValueText = getValueFromTable(workItemTable, "Tender Value");
				const location = getValueFromTable(workItemTable, "Location");
				const pincode = getValueFromTable(workItemTable, "Pincode");
				const preBidMeetingDate = getValueFromTable(workItemTable, "Pre Bid Meeting Date");
				const preBidMeetingAddress = getValueFromTable(workItemTable, "Pre Bid Meeting Address");
				const preBidMeetingPlace = getValueFromTable(workItemTable, "Pre Bid Meeting Place");
				const periodOfWork = getValueFromTable(workItemTable, "Period Of Work");

				const emdAmountText = getValueFromTable(emdFeeTable, "EMD Amount");
				const emdFeeType = getValueFromTable(emdFeeTable, "EMD Fee Type");
				const emdExceptionAllowed = getValueFromTable(emdFeeTable, "EMD Exemption Allowed");
				const emdPercentageText = getValueFromTable(emdFeeTable, "EMD Percentage");
				const emdPayableTo = getValueFromTable(emdFeeTable, "EMD Payable To");
				const emdPayableAt = getValueFromTable(emdFeeTable, "EMD Payable At");

				const publishedDate = getValueFromTable(criticalDatesTable, "Published Date");
				const bidOpeningDate = getValueFromTable(criticalDatesTable, "Bid Opening Date");
				const bidSubmissionStartDate = getValueFromTable(criticalDatesTable, "Bid Submission Start Date");
				const bidSubmissionEndDate = getValueFromTable(criticalDatesTable, "Bid Submission End Date");

				const tenderInvitingAuthorityName = getValueFromTable(authorityTable, "Name");
				const tenderInvitingAuthorityAddress = getValueFromTable(authorityTable, "Address");

				return {
					organisationChain,
					tenderId,
					tenderRefNo,
					workDescription,
					title,
					tenderValueText,
					location,
					pincode,
					preBidMeetingDate,
					preBidMeetingAddress,
					preBidMeetingPlace,
					periodOfWork,
					emdAmountText,
					emdFeeType,
					emdExceptionAllowed,
					emdPercentageText,
					emdPayableTo,
					emdPayableAt,
					publishedDate,
					bidOpeningDate,
					bidSubmissionStartDate,
					bidSubmissionEndDate,
					tenderInvitingAuthorityName,
					tenderInvitingAuthorityAddress,
				};
			});

			// Transform scraped data to ScrapedTenderData format
			const transformedTender = this.transformToScrapedTenderData(
				scrapedData,
				tenderLink,
				organisation,
				organisationChain,
				referenceNumber
			);

			if (transformedTender) {
				this.logger.success("Successfully scraped and transformed tender details");
				this.logger.info(`Scraped Tender Data: ${JSON.stringify(transformedTender, null, 2)}`);
				return transformedTender;
			}

			this.logger.warning("Failed to transform tender data - missing required fields");
			return null;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error scraping tender details: ${errorMessage}`);
			return null;
		}
	}

	// Transform scraped raw data to ScrapedTenderData interface format
	private transformToScrapedTenderData(
		scrapedData: any,
		tenderLink: string,
		organisation: string,
		organisationChain: string,
		referenceNumber: string
	): ScrapedTenderData | null {
		try {
			// Helper to parse currency values (remove commas and parse)
			const parseCurrency = (value: string): number | undefined => {
				if (!value || value.toLowerCase() === "na") return undefined;
				const cleaned = value.replace(/[₹,\s]/g, "");
				const parsed = parseFloat(cleaned);
				return isNaN(parsed) ? undefined : parsed;
			};

			// Helper to parse boolean from Yes/No
			const parseBoolean = (value: string): boolean => {
				return value?.toLowerCase().trim() === "yes";
			};

			// Helper to parse percentage
			const parsePercentage = (value: string): number | undefined => {
				if (!value || value.toLowerCase() === "na") return undefined;
				const cleaned = value.replace(/[%\s]/g, "");
				const parsed = parseFloat(cleaned);
				return isNaN(parsed) ? undefined : parsed;
			};

			// Helper to normalize string values: trim, convert "NA"/empty to undefined
			const normalizeString = (value: string | undefined | null): string | undefined => {
				if (!value) return undefined;
				const trimmed = value.trim();
				if (trimmed === "" || trimmed.toLowerCase() === "na" || trimmed === "N/A") {
					return undefined;
				}
				return trimmed;
			};

			// Extract organisation from chain if not provided
			const org = organisation || organisationChain?.split("-")[0]?.trim() || "";

			// Get organisation chain from scraped data or parameter
			const finalOrgChain = scrapedData.organisationChain || organisationChain || "";

			// Required fields validation
			if (!scrapedData.workDescription || !finalOrgChain) {
				this.logger.warning("Missing required fields: workDescription or organisationChain");
				return null;
			}

			// Build the transformed data with normalized values
			const transformed: ScrapedTenderData = {
				tenderId: (scrapedData.tenderId || referenceNumber || "").trim(),
				tenderRefNo: (scrapedData.tenderRefNo || referenceNumber || "").trim(),
				version: 1, // Default version
				isLatest: true, // Assume latest for new scrapes
				tenderValue: parseCurrency(scrapedData.tenderValueText),
				workDescription: (scrapedData.workDescription || scrapedData.title || "").trim(),
				preBidMeetingDate: normalizeString(scrapedData.preBidMeetingDate),
				preBidMeetingAddress: normalizeString(scrapedData.preBidMeetingAddress),
				preBidMeetingPlace: normalizeString(scrapedData.preBidMeetingPlace),
				periodOfWork: normalizeString(scrapedData.periodOfWork),
				organisationChain: finalOrgChain.trim(),
				organisation: org.trim(),
				tenderInvitingAuthorityName: normalizeString(scrapedData.tenderInvitingAuthorityName),
				tenderInvitingAuthorityAddress: normalizeString(scrapedData.tenderInvitingAuthorityAddress),
				emdAmount: parseCurrency(scrapedData.emdAmountText),
				emdFeeType: normalizeString(scrapedData.emdFeeType),
				emdExceptionAllowed: parseBoolean(scrapedData.emdExceptionAllowed),
				emdPercentage: parsePercentage(scrapedData.emdPercentageText),
				emdPayableTo: normalizeString(scrapedData.emdPayableTo),
				emdPayableAt: normalizeString(scrapedData.emdPayableAt),
				principal: undefined, // Not in HTML structure
				location: normalizeString(scrapedData.location),
				pincode: normalizeString(scrapedData.pincode),
				publishedDate: scrapedData.publishedDate
					? scrapedData.publishedDate.trim()
					: new Date().toISOString(), // Fallback to current date as ISO string if not found
				bidOpeningDate: normalizeString(scrapedData.bidOpeningDate),
				bidSubmissionStartDate: normalizeString(scrapedData.bidSubmissionStartDate),
				bidSubmissionEndDate: normalizeString(scrapedData.bidSubmissionEndDate),
				isSuretyBondAllowed: false, // Not in HTML structure, default to false
				sourceOfTender: undefined, // Not in HTML structure
				compressedTenderDocumentsURI: undefined, // Not directly in HTML structure
				provider: ScrapingProvider.EPROCURE,
				sourceUrl: tenderLink,
				scrapedAt: new Date(),
				dataHash: this.generateDataHash(scrapedData, tenderLink),
				sessionId: this.sessionId || undefined,
			};

			return transformed;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`Error transforming tender data: ${errorMessage}`);
			return null;
		}
	}

	// Generate data hash for deduplication
	private generateDataHash(scrapedData: any, tenderLink: string): string {
		try {
			const hashInput = JSON.stringify({
				tenderId: scrapedData.tenderId,
				tenderRefNo: scrapedData.tenderRefNo,
				tenderLink,
				workDescription: scrapedData.workDescription,
			});

			return crypto.createHash("sha256").update(hashInput).digest("hex");
		} catch (error) {
			// Fallback hash if generation fails
			return crypto.createHash("sha256").update(tenderLink + Date.now()).digest("hex");
		}
	}

	// =================================================== //
	// ============= HELPER FUNCTIONS END =============== //
	// =================================================== //
}
