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

interface ITendersDetails {
	organizationName: string;
	tenderRefNo: string;
	tenderDescription: string;
	tenderDocument: string;
	tenderType: string;
	numberOfBidsReceived: string;
	selectedBidders: string[];
	contractValue: string;
	selectedBiddersAddress: string;
	publishedDate: string;
	contractDate: string;
	completionInfo: string;
}

// Minimal CONFIG and logger used by the optimized scraper
const CONFIG = { selectorTimeout: 20000 };
const logger = LoggerService.getInstance();

// Optimized tender details scraper
export async function scrapeTenderDetails(page: Page): Promise<any> {
  try {
    // Be lenient: wait for any label cell to appear
    await page.waitForSelector("td.black", {
      timeout: CONFIG.selectorTimeout,
    });

    const records = await page.evaluate(() => {
      const clean = (s?: string | null) => (s || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
      const tdNodes = () => Array.from(document.querySelectorAll("td.black"));
      const getRowCells = (td: Element | null): HTMLTableCellElement[] =>
        td ? (Array.from(td.closest("tr")?.querySelectorAll("td") || []) as HTMLTableCellElement[]) : [];
      const isColon = (td?: HTMLTableCellElement) =>
        !!td && clean(td.textContent).replace(/\s+/g, "") === ":";
      // Generic: from label cell, compute value cell index = labelIdx + 2 (skip colon cell)
      const valueCellFromLabelTd = (labelTd: HTMLTableCellElement | null, forRightSide = false): HTMLTableCellElement | null => {
        if (!labelTd) return null;
        const cells = getRowCells(labelTd);
        const idx = cells.indexOf(labelTd);
        if (idx < 0) return null;
        // Standard structure is [label, colon, value] for each side of row
        const valIdx = idx + 2;
        return cells[valIdx] || null;
      };
      // Helper function to get value from regular rows (single column data) using computed index
      const getValueByLabel = (label: string): string => {
        const labelCell = tdNodes().find((cell) => clean(cell.textContent).startsWith(label));
        if (!labelCell) return "";
        const valTd = valueCellFromLabelTd(labelCell as HTMLTableCellElement);
        return clean(valTd?.textContent || "");
      };

      // Enhanced function to handle labels with optional asterisk using regex
      const getValueWithAsterisk = (
        baseLabel: string,
        position: "left" | "right" = "left"
      ): string => {
        const allCells = tdNodes();

        // Create regex pattern to match baseLabel with optional asterisk and spaces
        const pattern = new RegExp(`^${baseLabel}\\s*\\*?\\s*$`);

        const labelCell = allCells.find((cell) => pattern.test(clean(cell.textContent)));

        if (!labelCell) {
          return "";
        }

        const cells = getRowCells(labelCell);
        const labelIdx = cells.indexOf(labelCell as HTMLTableCellElement);
        if (labelIdx < 0) return "";
        // For both left and right, the value is two cells after the label in this layout
        const valIdx = labelIdx + 2;
        return clean(cells[valIdx]?.textContent || "");
      };

      // Extract special fields
      const orgNameElement = document.querySelector(
        "td.v-a-top.table-border.table-border-right div.event-dtl:not(:has(a))"
      );
      const tenderDocLink = document.querySelector(
        "td.v-a-top.table-border.table-border-right div.event-dtl a"
      );
      const addressElements = document.querySelectorAll(
        "td.v-a-top.table-border.table-border-right div.event-dtl"
      );

      // Handle Contract Value with optional asterisk using regex
      const contractValue = getValueWithAsterisk("Contract Value", "right");

      // Handle other fields that might have asterisks
      const rawValue = getValueWithAsterisk("Number of bids received", "right");
      const numberOfBidsRecieved = Number((rawValue || "").replace(/\D/g, "")); // Convert to number, remove any non-digits

      const nameOfSelectedBidder = getValueByLabel(
        "Name of the selected bidder"
      );
      const tenderType = getValueWithAsterisk("Tender Type", "left");
      const contractDate = getValueWithAsterisk("Contract Date", "right");

      // Extract organization name
      const orgNameFromElement = orgNameElement?.textContent?.trim() || "";
      const orgNameFromLabel = getValueByLabel("Organisation Name");
      const organisationName = orgNameFromElement || orgNameFromLabel;
      const publishedDate = getValueWithAsterisk("Published Date", "left");

      // Extract tender reference number
      const tenderRefNo =
        getValueByLabel("Tender Ref. No.") || getValueByLabel("Tender Reference Number");
      // Extract tender description
      const tenderDescription = getValueByLabel("Tender Description");
      // Extract tender document
      const tenderDocument = (tenderDocLink as HTMLAnchorElement | null)?.getAttribute("href")?.trim() || "";
      // Extract address and completion date
      const addressOfSelectedBidder =
        getValueByLabel("Address of the selected bidder(s)") ||
        addressElements[2]?.textContent?.trim() ||
        "";
      // Extract date of completion
      const dateOfCompletion =
        getValueWithAsterisk("Date of Completion/Completion Period in Days") ||
        null;
      const periodOfWork =
        dateOfCompletion && publishedDate
          ? Math.round(
              (new Date(dateOfCompletion).getTime() -
                new Date(publishedDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null; // or 0 if you prefer

      // Selected bidders label may appear as plural in CPP; try plural first, then singular
      const biddersRaw =
        getValueByLabel("Name of the selected bidder(s)") || nameOfSelectedBidder;

      const result = {
        nameOfTheSelectedBidder: biddersRaw
          .replace(/&amp;?/g, "&")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        numberOfBidsRecieved: Number.isFinite(numberOfBidsRecieved)
          ? numberOfBidsRecieved
          : null,
        tenderValue: contractValue,
        periodOfWork,
        publishedDate: publishedDate,
        location: addressOfSelectedBidder,
        tenderId: "",
        tenderRefNo: tenderRefNo,
        workDescription: tenderDescription,
        organisationChain: organisationName,
        tenderDocument,
        tenderType,
        contractDate,
        dateOfCompletion
      } as any;

      console.log("=== Final Extracted Tender Details ===");
      console.log(JSON.stringify(result, null, 2));
      console.log("=== End Tender Details Extraction ===");

      return result;
    });
	console.log(records, "RECORDSSSSS");
	return records;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error scraping tender details: ${error}`);
    return null;
  }
}
export class EProcureCPPScraper implements ScraperProvider {
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
		this.logger.setContext(EProcureCPPScraper.name);
	}

	// Organization scraping logic
	async getOrganizations(url: string): Promise<OrganizationInfo[] | null> {
		let browser;
		try {
			this.logger.info(
				`Starting E-Procure CPP getOrganizations for URL: ${url}`
			);

			// Launch Puppeteer
			browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			const page = await browser.newPage();

			// Set a realistic user agent
			await page.setUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
			);

			// Navigate
			await page.goto(url, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});

			// Wait for the select to be present
			await page.waitForSelector("select#edit-org-name", {
				timeout: 15000,
			});

			// Extract organizations from the select options (deduplicated by slug)
			const organizations = await page.evaluate(() => {
				const result: OrganizationInfo[] = [];
				const seen = new Set<string>();
				const select = document.querySelector("select#edit-org-name");
				if (!select) return result;

				const options = Array.from(select.querySelectorAll("option"));
				for (const opt of options) {
					const name = (opt.textContent || "").trim();
					// Skip placeholders/empty
					if (!name || name === "-- Select --") continue;

					// Build slug/id similar to previous provider
					const slug = name
						.toLowerCase()
						.replace(/&/g, "and")
						.replace(/[^a-z0-9\s-]/g, "")
						.replace(/\s+/g, "-")
						.replace(/-+/g, "-")
						.replace(/(^-|-$)/g, "");

					if (slug && !seen.has(slug)) {
						seen.add(slug);
						result.push({
							name,
							id: slug,
							value: name,
						});
					}
				}
				return result;
			});

			this.logger.success(
				`CPP: Extracted ${organizations.length} organizations from select#edit-org-name`
			);

			if (organizations.length === 0) {
				this.logger.warning(
					"CPP: No organizations found in the select element"
				);
			}

			return organizations;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			this.logger.error(`CPP getOrganizations error: ${errorMessage}`);
			return null;
		} finally {
			if (browser) {
				await browser.close();
				this.logger.info("Browser closed (CPP getOrganizations)");
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
			// For CPP, treat each (organization, year) pair as a unit of work for ETA
			const yearsForRange = (() => {
				if (!dateRange) return 1;
				const a = new Date(dateRange.startDate).getFullYear();
				const b = new Date(dateRange.endDate).getFullYear();
				return Math.abs(b - a) + 1;
			})();
			await sessionManager.updateStats(this.sessionId, {
				organizationsFound: Math.max(
					1,
					organizations.length * yearsForRange
				),
				organizationsScraped: 0,
				tendersFound: 0,
				tenderScraped: 0,
				tendersSaved: 0,
				pagesNavigated: 0,
			});

			browser = await puppeteer.launch({
				headless: false,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			const page = await browser.newPage();
			await page.setUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
			);

			// Early stop check
			if (this.shouldStop()) {
				this.logger.warning(
					"CPP execute: stop requested before navigation"
				);
				return [];
			}

			await page.goto(url, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});

			// Ensure the CPP form is present
			await page.waitForSelector("select#edit-org-name", {
				timeout: 15000,
			});
			await page.waitForSelector("select#edit-year", { timeout: 15000 });

			// Announce initial activity
			await sessionManager.updateCurrentActivity(
				this.sessionId,
				"INIT",
				"Form ready"
			);

			// Run organization/year submissions based on provided range
			this.logger.info(
				`CPP: Submitting searches for ${organizations.length} organizations across date range`
			);
			const successCount = await this.runCPPOrganizationYearSearches(
				page,
				organizations,
				dateRange,
				isTenderPerOrganizationLimited
					? Math.max(1, tendersPerOrganization)
					: undefined
			);
			this.logger.success(
				`CPP: Completed ${successCount} organization-year submissions`
			);

			// Only mark as completed if not stopped by user
			if (!this.isStopped) {
				sessionManager.completeSession(this.sessionId, {
					status: "COMPLETED",
					progress: 100,
				});
			}

			return [];
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

	// =================================================== //
	// ============ HELPER FUNCTIONS START ============== //
	// =================================================== //
	/**
	 * Scrape CPP AOC detail page and map to ScrapedTenderData (optimized for the given HTML).
	 * Extracts ONLY required fields and performs robust parsing for values and lists.
	 */
	private async scrapeCPPDetailAndMap(
		page: Page
	): Promise<ScrapedTenderData | null> {
		// Ensure detail content is present
		await page
			.waitForSelector("table td.black, #tenderDetailDivTd .event-dtl", {
				timeout: 20000,
			})
			.catch(() => {});

		const raw = await page.evaluate(() => {
			const norm = (s?: string | null) =>
				(s || "")
					.replace(/\u00A0/g, " ")
					.replace(/\s+/g, " ")
					.replace(/[:*()]/g, "")
					.trim()
					.toLowerCase();

			const textOf = (el: Element | null): string => {
				if (!el) return "";
				const txt = (el.textContent || "")
					.replace(/\u00A0/g, " ")
					.replace(/\s+/g, " ")
					.trim();
				return txt;
			};

			const listFromValueTd = (td: Element | null): string[] => {
				if (!td) return [];
				const div = (td as HTMLElement).querySelector(
					".event-dtl"
				) as HTMLElement | null;
				const sourceEl = (div || td) as HTMLElement;
				const html = sourceEl.innerHTML || "";
				const parts = html
					.split(/<br\s*\/?>|,|;/gi)
					.map((frag) => {
						const tmp = document.createElement("div");
						tmp.innerHTML = frag;
						return (tmp.textContent || tmp.innerText || "")
							.replace(/\u00A0/g, " ")
							.replace(/\s+/g, " ")
							.trim();
					})
					.filter(Boolean);
				const seen = new Set<string>();
				const out: string[] = [];
				for (const p of parts) {
					if (!seen.has(p)) {
						seen.add(p);
						out.push(p);
					}
				}
				return out;
			};

			const allLabelTds = Array.from(
				document.querySelectorAll<HTMLTableCellElement>("td.black")
			);

			function valueTdAfterLabel(
				labelVariants: string[]
			): Element | null {
				const wanted = labelVariants.map(norm);
				for (const td of allLabelTds) {
					const t = norm(td.textContent);
					if (
						wanted.includes(t) ||
						wanted.some((w) => t.startsWith(w))
					) {
						let valTd: Element | null = td.nextElementSibling;
						if (valTd && valTd.tagName === "TD") {
							const maybeColon = (valTd.textContent || "")
								.replace(/\s+/g, "")
								.trim();
							if (maybeColon === ":" || maybeColon === "：") {
								valTd = valTd.nextElementSibling;
							}
						}
						if (valTd && valTd.tagName === "TD") return valTd;
					}
				}
				return null;
			}

			function valueAfterLabel(labelVariants: string[]): string {
				const td = valueTdAfterLabel(labelVariants);
				if (!td) return "";
				const div = (td as HTMLElement).querySelector(".event-dtl");
				return textOf(div || td);
			}

			function hrefAfterLabel(labelVariants: string[]): string {
				const td = valueTdAfterLabel(labelVariants);
				if (!td) return "";
				const a = (td as HTMLElement).querySelector(
					"a"
				) as HTMLAnchorElement | null;
				return (a?.href || "").trim();
			}

			// Extract required fields
			const organizationName = valueAfterLabel([
				"Organisation Name",
				"Organization Name",
			]);
			const tenderRefNo = valueAfterLabel([
				"Tender Ref. No.",
				"Tender Ref. No",
				"Tender Reference Number",
			]);
			const tenderDescription = valueAfterLabel([
				"Tender Description",
				"Description",
			]);
			const tenderDocument = hrefAfterLabel(["Tender Document"]);
			const tenderType = valueAfterLabel(["Tender Type", "Type"]);
			const numberOfBidsReceived = valueAfterLabel([
				"Number of bids received",
			]);

			const biddersTd =
				valueTdAfterLabel([
					"Name of the selected bidder(s)",
					"Name of selected bidder(s)",
					"Selected bidder(s)",
					"Selected bidders",
					"Name of the Selected bidder(s)",
				]) || null;
			let selectedBidders = listFromValueTd(biddersTd);
			if (
				(!selectedBidders || selectedBidders.length === 0) &&
				biddersTd
			) {
				const rawText = textOf(biddersTd);
				selectedBidders = rawText
					.split(/,|;/g)
					.map((s) => s.trim())
					.filter(Boolean);
			}

			const contractValue = valueAfterLabel(["Contract Value"]);
			const selectedBiddersAddress = valueAfterLabel([
				"Address of the selected bidder(s)",
			]);
			const publishedDate = valueAfterLabel(["Published Date"]);
			const contractDate = valueAfterLabel(["Contract Date"]);
			const completionInfo = valueAfterLabel([
				"Date of Completion/Completion Period in Days",
			]);

			return {
				organizationName,
				tenderRefNo,
				tenderDescription,
				tenderDocument,
				tenderType,
				numberOfBidsReceived,
				selectedBidders,
				contractValue,
				selectedBiddersAddress,
				publishedDate,
				contractDate,
				completionInfo,
			};
		});

		// Map to ScrapedTenderData
		const normalizeNumber = (s?: string): number | undefined => {
			if (!s) return undefined;
			const digits = s.replace(/[^0-9.]/g, "");
			if (!digits) return undefined;
			const num = parseFloat(digits);
			return isNaN(num) ? undefined : num;
		};

		const safeRef = (raw.tenderRefNo || "").trim();
		const tenderRefNo = safeRef || (raw.tenderDescription || "").trim();
		const tenderId =
			tenderRefNo ||
			crypto
				.createHash("md5")
				.update(
					`${raw.tenderDescription || ""}-${raw.publishedDate || ""}`
				)
				.digest("hex");

		const numberOfBidsReceived = normalizeNumber(raw.numberOfBidsReceived);
		const numberOfBidderSelected = Array.isArray(raw.selectedBidders)
			? raw.selectedBidders.length
			: undefined;
		const selectedBiddersCsv = Array.isArray(raw.selectedBidders)
			? raw.selectedBidders.join(", ")
			: undefined;
		const tenderValue = normalizeNumber(raw.contractValue);

		const mapped: ScrapedTenderData = {
			tenderId,
			tenderRefNo,
			version: 1,
			tenderValue,
			tenderType: raw.tenderType || undefined,
			workDescription: raw.tenderDescription || "",
			organisationChain: raw.organizationName || "",
			organisation: raw.organizationName || "",
			publishedDate: raw.publishedDate || "",
			// Additional mapped fields from requested list
			compressedTenderDocumentsURI: raw.tenderDocument || undefined,
			numberOfBidsReceived,
			numberOfBidderSelected,
			selectedBidders: raw.selectedBidders || undefined,
			selectedBiddersAddress: raw.selectedBiddersAddress || undefined,
			selectedBiddersCsv,
			contractDate: raw.contractDate || undefined,
			completionInfo: raw.completionInfo || undefined,
			// Defaults/meta
			emdExceptionAllowed: false,
			isSuretyBondAllowed: false,
			sourceOfTender: "CPP AOC",
			provider: ScrapingProvider.EPROCURE_CPPP,
			sourceUrl: await page.url(),
			scrapedAt: new Date(),
			dataHash: crypto
				.createHash("md5")
				.update(
					JSON.stringify({
						tenderId,
						tenderRefNo,
						tenderValue,
						workDescription: raw.tenderDescription,
						org: raw.organizationName,
						publishedDate: raw.publishedDate,
					})
				)
				.digest("hex"),
			sessionId: this.sessionId,
		};

		// Log summary
		try {
			this.logger.info(
				`CPP Mapped Tender | ref="${mapped.tenderRefNo}" | org="${
					mapped.organisation
				}" | bidsRec=${
					numberOfBidsReceived ?? 0
				} | bidders=${JSON.stringify(mapped.selectedBidders || [])}`
			);
		} catch {}

		return mapped;
	}
	/**
	 * Submit the CPP "Results Of Tenders - Central" search form for a given organization and year.
	 * This fills:
	 * - Organisation Name: select#edit-org-name
	 * - AOC Published Year: select#edit-year
	 * - Captcha response: input#edit-captcha-response using the ALT text from the captcha image
	 * Finally, it clicks the Search button and waits for navigation. If captcha fails, it retries by refreshing.
	 */
	private async submitCPPFormForOrganizationAndYear(
		page: Page,
		organizationName: string,
		year: number
	): Promise<boolean> {
		if (this.shouldStop()) return false;
		try {
			await sessionManager.updateCurrentActivity(
				this.sessionId,
				organizationName,
				`Submitting for ${organizationName} - Year ${year}`
			);
			// Ensure the essential controls exist
			await page.waitForSelector("select#edit-org-name", {
				timeout: 10000,
			});
			await page.waitForSelector("select#edit-year", { timeout: 10000 });

			// Select Organization by visible text by mapping to value via DOM
			// We set the value by evaluating options because page.select selects by value attribute
			await page.evaluate(
				({ org }) => {
					const select = document.querySelector(
						"select#edit-org-name"
					) as HTMLSelectElement | null;
					if (!select) return;
					let matchedValue: string | null = null;
					for (const opt of Array.from(select.options)) {
						const text = (opt.textContent || "").trim();
						if (text === org) {
							matchedValue = opt.value;
							break;
						}
					}
					if (matchedValue !== null) {
						select.value = matchedValue;
						select.dispatchEvent(
							new Event("change", { bubbles: true })
						);
					}
				},
				{ org: organizationName }
			);

			// Select Year by value
			await page.select("select#edit-year", String(year));

			// Fill captcha using ALT text from the captcha image
			const tryOnce = async (): Promise<boolean> => {
				// Read captcha alt
				const captchaAlt = await page.evaluate(() => {
					const img = document.querySelector(
						'img[data-drupal-selector="edit-captcha-image"]'
					) as HTMLImageElement | null;
					return img?.alt?.trim() || "";
				});

				// If no ALT found, try to refresh the image
				if (!captchaAlt) {
					// Click reload captcha if available
					await page.evaluate(() => {
						const reload = document.querySelector(
							".reload-captcha-wrapper a.reload-captcha"
						) as HTMLAnchorElement | null;
						reload?.click();
					});
					// Wait briefly for new image to load
					await new Promise((resolve) => setTimeout(resolve, 1200));
				}

				const altValue =
					captchaAlt ||
					(await page.evaluate(() => {
						const img = document.querySelector(
							'img[data-drupal-selector="edit-captcha-image"]'
						) as HTMLImageElement | null;
						return img?.alt?.trim() || "";
					}));

				// Type captcha (if still empty, it will likely fail)
				await page.focus("#edit-captcha-response");
				await page.keyboard.down("Control");
				await page.keyboard.press("A");
				await page.keyboard.up("Control");
				await page.keyboard.press("Backspace");
				if (altValue) {
					await page.type("#edit-captcha-response", altValue, {
						delay: 20,
					});
				}

				// Click Search
				const [nav] = await Promise.all([
					// Some forms may not trigger full navigation; fall back to a timeout
					page
						.waitForNavigation({
							waitUntil: "networkidle2",
							timeout: 8000,
						})
						.catch(() => null),
					page.click("#btnSearch"),
				]);

				// If navigation didn't happen, still consider as attempt done; page might have rendered results via ajax
				// Heuristic: check if some results area exists; if not, return false to trigger retry
				const ok = await page.evaluate(() => {
					// Try to detect an expected results container or disappearance of captcha block
					const captchaInput = document.querySelector(
						"#edit-captcha-response"
					);
					return !captchaInput; // if captcha input disappeared, likely succeeded
				});

				return ok || !!nav;
			};

			// Try up to 2 attempts (initial + one refresh)
			const successFirst = await tryOnce();
			if (this.shouldStop()) return false;
			if (successFirst) return true;

			// Refresh page and retry once
			await page.reload({ waitUntil: "networkidle2", timeout: 30000 });
			// Ensure elements present again
			await page.waitForSelector("select#edit-org-name", {
				timeout: 10000,
			});
			await page.waitForSelector("select#edit-year", { timeout: 10000 });

			// Re-apply selections after reload
			await page.evaluate(
				({ org }) => {
					const select = document.querySelector(
						"select#edit-org-name"
					) as HTMLSelectElement | null;
					if (!select) return;
					let matchedValue: string | null = null;
					for (const opt of Array.from(select.options)) {
						const text = (opt.textContent || "").trim();
						if (text === org) {
							matchedValue = opt.value;
							break;
						}
					}
					if (matchedValue !== null) {
						select.value = matchedValue;
						select.dispatchEvent(
							new Event("change", { bubbles: true })
						);
					}
				},
				{ org: organizationName }
			);
			await page.select("select#edit-year", String(year));

			const successSecond = await tryOnce();
			if (this.shouldStop()) return false;
			return successSecond;
		} catch (error) {
			this.logger.error(
				`Failed to submit CPP form for org=${organizationName}, year=${year}: ${error}`
			);
			return false;
		}
	}

	/**
	 * For a list of organization names and a provided date range, iterate orgs first,
	 * then years within the inclusive range [start.year .. end.year], and submit the form.
	 * After each successful submit, scrape the result table with date filtering and pagination.
	 * Returns number of successful submissions.
	 */
	private async runCPPOrganizationYearSearches(
		page: Page,
		organizations: string[],
		dateRange?: DateRange,
		perOrgYearLimit?: number
	): Promise<number> {
		const startYear = dateRange
			? new Date(dateRange.startDate).getFullYear()
			: new Date().getFullYear();
		const endYear = dateRange
			? new Date(dateRange.endDate).getFullYear()
			: new Date().getFullYear();

		const from = Math.min(startYear, endYear);
		const to = Math.max(startYear, endYear);

		let successCount = 0;
		for (const org of organizations) {
			if (this.shouldStop()) break;
			await sessionManager.updateCurrentActivity(
				this.sessionId,
				org,
				"Submitting searches"
			);
			for (let y = from; y <= to; y++) {
				if (this.shouldStop()) break;
				const ok = await this.submitCPPFormForOrganizationAndYear(
					page,
					org,
					y
				);
				if (ok) {
					// Process results in-place by clicking each row link instead of storing URLs
					await sessionManager.updateCurrentActivity(
						this.sessionId,
						org,
						`Processing tenders for year ${y}`
					);
					await this.processCPPResultsInPlace(
						page,
						org,
						y,
						dateRange,
						perOrgYearLimit
					);

					if (this.shouldStop()) break;
					successCount++;
				} else {
					this.logger.warning(
						`CPP form submission may have failed for org=${org}, year=${y}`
					);
				}
				// Year processed -> advance org progress unit for ETA (org-year as unit)
				{
					const s = sessionManager.getSession(this.sessionId);
					const orgFound =
						s?.organizationsFound ||
						Math.max(1, organizations.length * (to - from + 1));
					const orgScraped = (s?.organizationsScraped || 0) + 1;
					await sessionManager.updateStats(this.sessionId, {
						organizationsScraped: orgScraped,
					});
					const progress = Math.min(
						100,
						Math.round((orgScraped / Math.max(orgFound, 1)) * 100)
					);
					await sessionManager.updateProgress(
						this.sessionId,
						progress
					);
				}
				// Small delay between submissions to be gentle
				await new Promise((resolve) => setTimeout(resolve, 600));
			}
		}
		return successCount;
	}

	/**
	 * Phase-1: Discover matching tender links across all pagination pages without scraping details.
	 */
	private async collectCPPResultLinks(
		page: Page,
		dateRange?: DateRange
	): Promise<
		Array<{
			aocDate: string;
			closingDate: string;
			title: string;
			link: string;
			organization: string;
		}>
	> {
		const links: Array<{
			aocDate: string;
			closingDate: string;
			title: string;
			link: string;
			organization: string;
		}> = [];

		const inRange = (aocDateText: string): boolean => {
			if (!dateRange) return true;
			const parse = (s: string) => {
				const [datePart, timePart, ampm] = s.split(" ");
				if (!datePart) return NaN;
				const [dd, mon, yyyy] = datePart.split("-");
				const months: Record<string, number> = {
					Jan: 0,
					Feb: 1,
					Mar: 2,
					Apr: 3,
					May: 4,
					Jun: 5,
					Jul: 6,
					Aug: 7,
					Sep: 8,
					Oct: 9,
					Nov: 10,
					Dec: 11,
				};
				const m = months[mon as keyof typeof months];
				let hours = 0,
					minutes = 0;
				if (timePart) {
					const [hh, mm] = timePart
						.split(":")
						.map((v) => parseInt(v, 10));
					if (!isNaN(hh)) hours = hh;
					if (!isNaN(mm)) minutes = mm;
					if (ampm?.toUpperCase() === "PM" && hours < 12) hours += 12;
					if (ampm?.toUpperCase() === "AM" && hours === 12) hours = 0;
				}
				const d = new Date(
					parseInt(yyyy, 10),
					m,
					parseInt(dd, 10),
					hours,
					minutes,
					0,
					0
				);
				return d.getTime();
			};
			const start = new Date(dateRange.startDate).getTime();
			const end = new Date(dateRange.endDate).getTime();
			const value = parse(aocDateText);
			return (
				!isNaN(value) &&
				value >= Math.min(start, end) &&
				value <= Math.max(start, end)
			);
		};

		while (true) {
			if (this.shouldStop()) break;

			await page
				.waitForSelector("table.list_table", { timeout: 10000 })
				.catch(() => null);

			// Count page
			this.totalPagesNavigated = (this.totalPagesNavigated || 0) + 1;
			await sessionManager.updateStats(this.sessionId, {
				pagesNavigated: this.totalPagesNavigated,
			});

			// Extract rows
			const pageRows = await page.evaluate(() => {
				const out: Array<{
					aocDate: string;
					closingDate: string;
					title: string;
					link: string;
					organization: string;
				}> = [];
				const table = document.querySelector("table.list_table");
				if (!table) return out;
				const rows = table.querySelectorAll("tbody tr");
				rows.forEach((tr) => {
					const tds = tr.querySelectorAll("td");
					if (tds.length >= 5) {
						const aocDate = (tds[1].textContent || "").trim();
						const closingDate = (tds[2].textContent || "").trim();
						const titleCell = tds[3];
						const linkEl = titleCell.querySelector(
							"a"
						) as HTMLAnchorElement | null;
						const titleText = (titleCell.textContent || "").trim();
						const link = linkEl?.href || "";
						const org = (tds[4].textContent || "").trim();
						if (link) {
							out.push({
								aocDate,
								closingDate,
								title: titleText,
								link,
								organization: org,
							});
						}
					}
				});
				return out;
			});

			// Filter by date range and aggregate
			for (const item of pageRows) {
				if (inRange(item.aocDate) && item.link) {
					links.push(item);
				}
			}

			// Next page
			const nextUrl = await page.evaluate(() => {
				const pag = document.querySelector(".pagination");
				if (!pag) return "";
				const anchors = Array.from(
					pag.querySelectorAll("a.paginate_button")
				);
				const next = anchors.find((a) =>
					(a.textContent || "")
						.trim()
						.toLowerCase()
						.startsWith("next")
				);
				return next ? (next as HTMLAnchorElement).href : "";
			});
			if (!nextUrl) break;

			if (this.shouldStop()) break;

			await Promise.all([
				page
					.waitForNavigation({
						waitUntil: "networkidle2",
						timeout: 20000,
					})
					.catch(() => null),
				page.goto(nextUrl, {
					waitUntil: "networkidle2",
					timeout: 30000,
				}),
			]);
		}

		return links;
	}

	/**
	 * Click each matching tender on the current results, scrape detail, go back, handle pagination.
	 * This avoids relying on absolute URLs which may be invalid.
	 */
	private async processCPPResultsInPlace(
		page: Page,
		org: string,
		year: number,
		dateRange?: DateRange,
		perOrgYearLimit?: number
	): Promise<void> {
		const startTs = dateRange ? new Date(dateRange.startDate).getTime() : undefined;
		const endTs = dateRange ? new Date(dateRange.endDate).getTime() : undefined;
		let scraped = 0;

		const parseDateTs = (s: string): number => {
			const [datePart, timePart, ampm] = s.split(" ");
			if (!datePart) return NaN;
			const [dd, mon, yyyy] = datePart.split("-");
			const months: Record<string, number> = {
				Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
				Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
			};
			const m = months[mon as keyof typeof months];
			let hours = 0, minutes = 0;
			if (timePart) {
				const [hh, mm] = timePart.split(":").map((v) => parseInt(v, 10));
				if (!isNaN(hh)) hours = hh;
				if (!isNaN(mm)) minutes = mm;
				if ((ampm || "").toUpperCase() === "PM" && hours < 12) hours += 12;
				if ((ampm || "").toUpperCase() === "AM" && hours === 12) hours = 0;
			}
			const d = new Date(parseInt(yyyy, 10), m, parseInt(dd, 10), hours, minutes, 0, 0);
			return d.getTime();
		};

		const isInRange = (text: string): boolean => {
			if (!startTs || !endTs) return true;
			const ts = parseDateTs(text);
			return !isNaN(ts) && ts >= Math.min(startTs, endTs) && ts <= Math.max(startTs, endTs);
		};

		while (true) {
			if (this.shouldStop()) break;
			await page.waitForSelector("table.list_table", { timeout: 15000 }).catch(() => null);

			// Update active state to indicate we are finding tenders
			await sessionManager.updateCurrentActivity(
				this.sessionId,
				org,
				`finding Tender | year=${year}`
			);

			// Count page
			this.totalPagesNavigated = (this.totalPagesNavigated || 0) + 1;
			await sessionManager.updateStats(this.sessionId, {
				pagesNavigated: this.totalPagesNavigated,
			});

			// Calculate row indices to process based on date range
			const rowsToProcess = await page.evaluate(() => {
				const out: Array<{ idx: number; aocDate: string; title: string }> = [];
				const table = document.querySelector("table.list_table");
				if (!table) return out;
				const rows = table.querySelectorAll("tbody tr");
				rows.forEach((tr, i) => {
					const tds = tr.querySelectorAll("td");
					if (tds.length >= 5) {
						const aocDate = (tds[1].textContent || "").trim();
						const title = (tds[3].textContent || "").trim();
						const a = tds[3].querySelector("a") as HTMLAnchorElement | null;
						if (a && a.getAttribute("href")) {
							out.push({ idx: i, aocDate, title });
						}
					}
				});
				return out;
			});

			// Filter by range on Node side (consistent parser)
			const filtered = rowsToProcess.filter((r) => isInRange(r.aocDate));

			// Update tendersFound (discovered on this page)
			this.totalTendersFound = (this.totalTendersFound || 0) + filtered.length;
			await sessionManager.updateStats(this.sessionId, {
				tendersFound: this.totalTendersFound,
			});

			for (const row of filtered) {
				if (this.shouldStop()) break;
				if (perOrgYearLimit && scraped >= perOrgYearLimit) break;

				await sessionManager.updateCurrentActivity(
					this.sessionId,
					org,
					`scrapping "${row.title}" | org=${org} | year=${year}`
				);

				// Click the row's anchor in-place
				const clicked = await page.evaluate((rowIndex: number) => {
					const table = document.querySelector("table.list_table");
					if (!table) return false;
					const rows = table.querySelectorAll("tbody tr");
					const tr = rows[rowIndex];
					if (!tr) return false;
					const link = tr.querySelector("td:nth-child(4) a") as HTMLAnchorElement | null;
					if (!link) return false;
					link.target = "_self";
					link.click();
					return true;
				}, row.idx);
				if (!clicked) continue;

				// Wait for detail content
				await page
					.waitForSelector("table td.black, #tenderDetailDivTd .event-dtl", {
						timeout: 20000,
					})
					.catch(() => null);

				// Scrape using provided optimized function
				const raw = (await scrapeTenderDetails(page)) as any;

				// Adapt and map
				const adapted: ITendersDetails = {
					organizationName: (raw?.organisationChain || "").trim(),
					tenderRefNo: (raw?.tenderRefNo || "").trim(),
					tenderDescription: (raw?.workDescription || "").trim(),
					tenderDocument: (raw?.tenderDocument || "").trim(),
					tenderType: (raw?.tenderType || "").trim(),
					numberOfBidsReceived:
						raw?.numberOfBidsRecieved != null ? String(raw.numberOfBidsRecieved) : "",
					selectedBidders: Array.isArray(raw?.nameOfTheSelectedBidder)
						? raw.nameOfTheSelectedBidder.map((s: string) => (s || "").trim()).filter(Boolean)
						: [],
					contractValue: (raw?.tenderValue || "").trim(),
					selectedBiddersAddress: (raw?.location || "").trim(),
					publishedDate: (raw?.publishedDate || "").trim(),
					contractDate: (raw?.contractDate || "").trim(),
					completionInfo: (raw?.dateOfCompletion || "").trim(),
				};

				const mapped = await this.mapCPPDetailsToTender(
					adapted,
					row.title,
					await page.url()
				);

				// Save
				try {
					if (mapped) {
						const saved = await tenderService.saveTender(mapped);
						if (saved?.tender) {
							this.totalTendersSaved = (this.totalTendersSaved || 0) + 1;
							await sessionManager.updateStats(this.sessionId, {
								tendersSaved: this.totalTendersSaved,
							});
						}
					}
				} catch (e) {
					this.logger.error(`Failed to save CPP tender: ${e}`);
				}

				// Count scraped
				this.totalTendersScraped = (this.totalTendersScraped || 0) + 1;
				await sessionManager.updateStats(this.sessionId, {
					tenderScraped: this.totalTendersScraped,
				});
				scraped++;

				// Go back to results
				await page
					.goBack({
						waitUntil: "networkidle2",
						timeout: 30000,
					})
					.catch(() => null);
				await page.waitForSelector("table.list_table", { timeout: 15000 }).catch(() => null);
				// After returning to results, set state back to finding
				await sessionManager.updateCurrentActivity(
					this.sessionId,
					org,
					`finding Tender | year=${year}`
				);
			}

			if (perOrgYearLimit && scraped >= perOrgYearLimit) break;
			if (this.shouldStop()) break;

			// Navigate to next page if any
			const hasNext = await page.evaluate(() => {
				const pag = document.querySelector(".pagination") || document;
				// Try common patterns
				const next =
					(pag.querySelector("a.paginate_button.next") as HTMLAnchorElement | null) ||
					Array.from(pag.querySelectorAll("a")).find((a) =>
						(a.textContent || "").trim().toLowerCase().startsWith("next")
					) ||
					null;
				if (!next) return false;
				(next as HTMLAnchorElement).click();
				return true;
			});
			if (!hasNext) break;

			await page
				.waitForNavigation({
					waitUntil: "networkidle2",
					timeout: 20000,
				})
				.catch(() => null);
		}
	}

	/**
	 * Scrape tender details on the AOC full view page.
	 * Extracts labeled values from the details table.
	 */

	// =================================================== //
	// ============= HELPER FUNCTIONS END =============== //
	// =================================================== //

	private async mapCPPDetailsToTender(
		details: ITendersDetails,
		titleFromList: string,
		currentUrl: string
	): Promise<ScrapedTenderData> {
		const normalizeNumber = (s?: string): number | undefined => {
			if (!s) return undefined;
			const digits = s.replace(/[^0-9.]/g, "");
			if (!digits) return undefined;
			const num = parseFloat(digits);
			return isNaN(num) ? undefined : num;
		};

		const tenderRefNo = (details.tenderRefNo || "").trim() || titleFromList;
		const tenderId =
			tenderRefNo ||
			crypto
				.createHash("md5")
				.update(`${titleFromList}-${details.publishedDate || ""}`)
				.digest("hex");

		const numberOfBidsReceived = normalizeNumber(
			details.numberOfBidsReceived
		);
		const numberOfBidderSelected = Array.isArray(details.selectedBidders)
			? details.selectedBidders.length
			: undefined;

		const selectedBiddersCsv = Array.isArray(details.selectedBidders)
			? details.selectedBidders.join(", ")
			: undefined;

		const tenderValue = normalizeNumber(details.contractValue);

		const data: ScrapedTenderData = {
			tenderId,
			tenderRefNo,
			version: 1,
			// Map core
			tenderValue,
			tenderType: details.tenderType || undefined,
			workDescription: details.tenderDescription || titleFromList,
			contractDate: details.contractDate || undefined,
			completionInfo: details.completionInfo || undefined,
			organisationChain: details.organizationName || "",
			organisation: details.organizationName || "",
			// Dates
			publishedDate: details.publishedDate || "",
			bidOpeningDate: details.contractDate || undefined,
			// Other
			emdExceptionAllowed: false,
			isSuretyBondAllowed: false,
			sourceOfTender: "CPP AOC",
			compressedTenderDocumentsURI: details.tenderDocument || undefined,
			// CPP extra
			selectedBidders: details.selectedBidders || undefined,
			numberOfBidsReceived,
			numberOfBidderSelected,
			selectedBiddersAddress: details.selectedBiddersAddress || undefined,
			selectedBiddersCsv,
			// Meta
			provider: ScrapingProvider.EPROCURE_CPPP,
			sourceUrl: currentUrl,
			scrapedAt: new Date(),
			dataHash: crypto
				.createHash("md5")
				.update(
					JSON.stringify({
						tenderId,
						tenderRefNo,
						tenderValue,
						workDescription: details.tenderDescription,
						org: details.organizationName,
						publishedDate: details.publishedDate,
					})
				)
				.digest("hex"),
			sessionId: this.sessionId,
		};

		return data;
	}
}
