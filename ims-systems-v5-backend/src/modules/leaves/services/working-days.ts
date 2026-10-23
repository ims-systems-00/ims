import Holidays from "date-holidays";
import type { LeaveHoliday } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function listPublicHolidays(
  countryCode: string,
  year: number
): LeaveHoliday[] {
  const calendar = new Holidays(countryCode.toUpperCase());
  return calendar
    .getHolidays(year)
    .filter((holiday) => holiday.type === "public")
    .map((holiday) => ({
      name: holiday.name,
      type: holiday.type,
      date: holiday.date.slice(0, 10),
    }));
}

function holidayKeys(countryCode: string, from: Date, to: Date): Set<string> {
  const keys = new Set<string>();
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year++) {
    for (const holiday of listPublicHolidays(countryCode, year)) {
      keys.add(holiday.date);
    }
  }
  return keys;
}

export type WorkingDaysInput = {
  startDate: Date;
  endDate: Date;
  startDayFraction: number;
  endDayFraction: number;
  countryCode: string;
};

/**
 * Working days in the inclusive range, excluding weekends and public holidays
 * for the country. The unworked part of the start/end day is deducted when
 * those days are working days; a single-day range uses the smaller fraction.
 */
export function calculateWorkingDays(input: WorkingDaysInput): number {
  const start = startOfUtcDay(input.startDate);
  const end = startOfUtcDay(input.endDate);
  if (end < start) return 0;

  const holidays = holidayKeys(input.countryCode, start, end);
  const isWorkingDay = (date: Date): boolean => {
    const weekday = date.getUTCDay();
    return weekday !== 0 && weekday !== 6 && !holidays.has(dateKey(date));
  };

  let days = 0;
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    if (isWorkingDay(new Date(time))) days += 1;
  }

  if (start.getTime() === end.getTime()) {
    if (!isWorkingDay(start)) return 0;
    return round2(Math.min(input.startDayFraction, input.endDayFraction));
  }

  if (isWorkingDay(start)) days -= 1 - input.startDayFraction;
  if (isWorkingDay(end)) days -= 1 - input.endDayFraction;

  return round2(Math.max(days, 0));
}
