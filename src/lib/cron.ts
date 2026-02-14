/**
 * Simple cron expression matcher
 * Supports: minute hour day-of-month month day-of-week
 * Each field can be * (any) or a specific number
 */
export function matchesCron(cronExpr: string, date: Date): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const checks = [
    { field: minute, value: date.getMinutes() },
    { field: hour, value: date.getHours() },
    { field: dayOfMonth, value: date.getDate() },
    { field: month, value: date.getMonth() + 1 },
    { field: dayOfWeek, value: date.getDay() },
  ];

  return checks.every(({ field, value }) => matchesField(field, value));
}

function matchesField(field: string, value: number): boolean {
  if (field === "*") return true;

  // Handle comma-separated values: 1,2,3
  if (field.includes(",")) {
    return field.split(",").some((f) => matchesField(f.trim(), value));
  }

  // Handle ranges: 1-5
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }

  // Handle step values: */5
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }

  // Exact match
  return parseInt(field, 10) === value;
}

/**
 * Check if a string looks like a cron expression
 */
export function isCronExpression(when: string): boolean {
  const parts = when.trim().split(/\s+/);
  return parts.length === 5;
}

/**
 * ISO 8601 Duration interval support
 * Format: P<value><unit>@<reference-date>[T<HH:MM>]
 * Examples: P9M@2025-09-13, P5Y@2021-01-15T10:00
 */
export interface IntervalPattern {
  value: number;
  unit: "D" | "M" | "Y"; // Days, Months, Years
  referenceDate: Date;
  hour: number; // 0-23 UTC
  minute: number; // 0-59
}

export function isIntervalExpression(when: string): boolean {
  return when.startsWith("P");
}

export function parseInterval(when: string): IntervalPattern | null {
  // Pattern: P<N><unit>@<date>[T<HH:MM>]
  const match = when.match(
    /^P(\d+)([DMY])@(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?$/,
  );
  if (!match) return null;

  const [, value, unit, date, hour, minute] = match;
  const wibHour = hour ? parseInt(hour) : 8; // Default 8 AM WIB
  const wibMinute = minute ? parseInt(minute) : 0;

  return {
    value: parseInt(value),
    unit: unit as "D" | "M" | "Y",
    referenceDate: new Date(date + "T00:00:00Z"),
    hour: (wibHour - 7 + 24) % 24, // Convert WIB to UTC
    minute: wibMinute,
  };
}

export function getNextIntervalDate(
  pattern: IntervalPattern,
  count: number,
): Date {
  const result = new Date(pattern.referenceDate);
  const multiplier = count + 1;

  switch (pattern.unit) {
    case "D":
      result.setUTCDate(result.getUTCDate() + pattern.value * multiplier);
      break;
    case "M":
      result.setUTCMonth(result.getUTCMonth() + pattern.value * multiplier);
      break;
    case "Y":
      result.setUTCFullYear(
        result.getUTCFullYear() + pattern.value * multiplier,
      );
      break;
  }

  result.setUTCHours(pattern.hour, pattern.minute, 0, 0);
  return result;
}

/**
 * Format interval expression as human-readable string
 * P6M@2025-12-15 → "Every 6 months from Dec 15, 2025"
 * P9M@2025-09-13T10:00 → "Every 9 months from Sep 13, 2025 at 10:00"
 */
export function formatInterval(when: string): string | null {
  const pattern = parseInterval(when);
  if (!pattern) return null;

  const unitNames: Record<string, string> = {
    D: "day",
    M: "month",
    Y: "year",
  };

  const unit = unitNames[pattern.unit];
  const unitPlural = pattern.value === 1 ? unit : unit + "s";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const date = pattern.referenceDate;
  const monthName = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();

  // Convert UTC hour back to WIB for display
  const wibHour = (pattern.hour + 7) % 24;
  const timeStr =
    wibHour !== 8 || pattern.minute !== 0
      ? ` at ${String(wibHour).padStart(2, "0")}:${String(pattern.minute).padStart(2, "0")}`
      : "";

  return `Every ${pattern.value} ${unitPlural} from ${monthName} ${day}, ${year}${timeStr}`;
}
