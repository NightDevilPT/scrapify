import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"
import { DateRange } from "./scraper/scraper.interface";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



// Date parsing utility function
export function parseEProcureDate(dateString: string): Date | null {
  try {
    // Handle various date formats from E-Procure website
    const formats = [
      // Format: "09-Oct-2025 05:20 PM"
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4}) (\d{1,2}):(\d{2}) ([AP]M)$/,
      // Format: "09/10/2025"
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // Format: "09-Oct-2025"
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        if (match[6]) {
          // Format with time: "09-Oct-2025 05:20 PM"
          const day = parseInt(match[1]);
          const month = getMonthNumber(match[2]);
          const year = parseInt(match[3]);
          let hours = parseInt(match[4]);
          const minutes = parseInt(match[5]);
          const period = match[6];

          // Convert to 24-hour format
          if (period === "PM" && hours < 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;

          return new Date(year, month, day, hours, minutes);
        } else if (match[3] && !match[4]) {
          // Format without time: "09-Oct-2025"
          const day = parseInt(match[1]);
          const month = getMonthNumber(match[2]);
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        }
      }
    }

    // Fallback to native Date parsing
    const parsedDate = new Date(dateString);
    console.log(parsedDate.toString(), "CONSOLING DATETIMR")
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
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