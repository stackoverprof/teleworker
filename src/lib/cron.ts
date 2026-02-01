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
