import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"
import { DateRange } from "./scraper/scraper.interface";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



// Date parsing utility function
export function parseEProcureDate(dateString: string): Date | null {
  try {
    if (!dateString) return null;

    // Clean the date string: remove HTML entities, extra whitespace, and non-breaking spaces
    let cleaned = dateString
      .replace(/&nbsp;/g, " ")
      .replace(/\u00A0/g, " ") // Replace non-breaking space
      .trim()
      .replace(/\s+/g, " "); // Replace multiple spaces with single space

    // Handle various date formats from E-Procure website
    const formats = [
      // Format: "25-Nov-2025 03:30 PM" or "09-Oct-2025 05:20 PM"
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s+([AP]M)$/i,
      // Format: "25-Nov-2025 03:30PM" (no space before AM/PM)
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})([AP]M)$/i,
      // Format: "09/10/2025 05:20 PM"
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+([AP]M)$/i,
      // Format: "09/10/2025"
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // Format: "09-Oct-2025" (without time)
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/i,
    ];

    for (const format of formats) {
      const match = cleaned.match(format);
      if (match) {
        // Check if this format has time component (6th group is AM/PM)
        if (match[6]) {
          // Format with time: "25-Nov-2025 03:30 PM"
          let day: number, month: number, year: number, hours: number, minutes: number;
          
          // Check if it's DD-MMM-YYYY format or DD/MM/YYYY format
          if (match[2] && /[A-Za-z]/.test(match[2])) {
            // DD-MMM-YYYY format
            day = parseInt(match[1], 10);
            month = getMonthNumber(match[2]);
            year = parseInt(match[3], 10);
          } else {
            // DD/MM/YYYY format
            day = parseInt(match[1], 10);
            month = parseInt(match[2], 10) - 1; // Month is 0-indexed
            year = parseInt(match[3], 10);
          }
          
          hours = parseInt(match[4], 10);
          minutes = parseInt(match[5], 10);
          const period = match[6].toUpperCase();

          // Validate values
          if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
            continue;
          }

          // Convert to 24-hour format
          if (period === "PM" && hours < 12) {
            hours += 12;
          } else if (period === "AM" && hours === 12) {
            hours = 0;
          }

          const date = new Date(year, month, day, hours, minutes);
          
          // Validate the created date
          if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
          }
        } else if (match[3]) {
          // Format without time
          let day: number, month: number, year: number;
          
          if (match[2] && /[A-Za-z]/.test(match[2])) {
            // DD-MMM-YYYY format
            day = parseInt(match[1], 10);
            month = getMonthNumber(match[2]);
            year = parseInt(match[3], 10);
          } else {
            // DD/MM/YYYY format
            day = parseInt(match[1], 10);
            month = parseInt(match[2], 10) - 1; // Month is 0-indexed
            year = parseInt(match[3], 10);
          }

          if (isNaN(day) || isNaN(month) || isNaN(year)) {
            continue;
          }

          const date = new Date(year, month, day);
          
          // Validate the created date
          if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
          }
        }
      }
    }

    // If no format matched, return null instead of trying native parsing
    return null;
  } catch (error) {
    return null;
  }
}

// Month name to number mapping
export function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  return months[monthName.toLowerCase()] || 0;
}

// Date range validation function
export function  isDateInRange(dateString: string, dateRange?: DateRange): boolean {
  if (!dateRange) return true; // No date range filter applied

  const tenderDate = parseEProcureDate(dateString);
  if (!tenderDate) return true; // If date parsing fails, include the tender

  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  // Validate the date range
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return true;
  }

  // Check if tender date is within the range (inclusive)
  return tenderDate >= startDate && tenderDate <= endDate;
}