import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db";
import { reminders } from "../db/schema";
import { isCronExpression } from "../lib/cron";
import { getPrayerTimes } from "./microservices/prayer/utils";
import { TIMEZONE } from "../lib/constants";
import type { Env } from "../services/scheduler";

export const automationRoute = new Hono<{ Bindings: Env }>();

automationRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
  );

  // Fetch all active call-type reminders (ring = 1)
  const callReminders = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.active, 1), eq(reminders.ring, 1)));

  const alarms: { name: string; time: string; date: string }[] = [];

  // Get prayer times for dynamic alarms
  const prayerTimes = await getPrayerTimes();

  for (const reminder of callReminders) {
    if (isCronExpression(reminder.when)) {
      const parts = reminder.when.trim().split(/\s+/);
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // Check if this cron matches today (day/month/weekday)
      if (!matchesToday(dayOfMonth, month, dayOfWeek, now)) {
        continue;
      }

      // Handle dynamic alarms (with wildcard hour/minute and api_url)
      if ((hour === "*" || minute === "*") && reminder.apiUrl) {
        const alarmDate = await resolveDynamicDate(reminder.apiUrl, prayerTimes, now);
        if (alarmDate) {
          alarms.push({
            name: reminder.name,
            time: formatTime(alarmDate),
            date: formatISO(alarmDate),
          });
        }
      } else if (hour !== "*" && minute !== "*") {
        // Fixed time cron - convert UTC to WIB
        const utcHour = parseInt(hour, 10);
        const utcMinute = parseInt(minute, 10);
        const wibHour = (utcHour + 7) % 24; // UTC+7
        const alarmDate = new Date(now);
        alarmDate.setHours(wibHour, utcMinute, 0, 0);
        alarms.push({
          name: reminder.name,
          time: formatTime(alarmDate),
          date: formatISO(alarmDate),
        });
      }
    } else {
      // ISO date - check if it's today
      const scheduledDate = new Date(reminder.when);
      const scheduledLocal = new Date(
        scheduledDate.toLocaleString("en-US", { timeZone: TIMEZONE })
      );
      if (isSameDay(scheduledLocal, now) && reminder.count === 0) {
        alarms.push({
          name: reminder.name,
          time: formatTime(scheduledLocal),
          date: formatISO(scheduledLocal),
        });
      }
    }
  }

  // Sort by time
  alarms.sort((a, b) => a.time.localeCompare(b.time));

  return c.json({ alarms });
});

/**
 * Resolve dynamic alarm date from API
 */
async function resolveDynamicDate(
  apiUrl: string,
  prayerTimes: Awaited<ReturnType<typeof getPrayerTimes>>,
  now: Date
): Promise<Date | null> {
  switch (apiUrl) {
    case "/microservices/prayer/wake-up": {
      // 5 minutes before Fajr
      const [h, m] = prayerTimes.Fajr.split(":").map(Number);
      const fajr = new Date(now);
      fajr.setHours(h, m, 0, 0);
      return new Date(fajr.getTime() - 5 * 60 * 1000);
    }
    case "/microservices/prayer/wake-up-sunrise": {
      // 10 minutes before Sunrise
      const [h, m] = prayerTimes.Sunrise.split(":").map(Number);
      const sunrise = new Date(now);
      sunrise.setHours(h, m, 0, 0);
      return new Date(sunrise.getTime() - 10 * 60 * 1000);
    }
    case "/microservices/prayer/friday-prayer": {
      // Only on Friday, 30 minutes before Dhuhr
      if (now.getDay() !== 5) return null;
      const [h, m] = prayerTimes.Dhuhr.split(":").map(Number);
      const dhuhr = new Date(now);
      dhuhr.setHours(h, m, 0, 0);
      return new Date(dhuhr.getTime() - 30 * 60 * 1000);
    }
    case "/microservices/meetings/monthly": {
      // Only on last Thursday of month - time is fixed in cron
      return null; // Let the cron handle the time
    }
    default:
      return null;
  }
}

function matchesToday(
  dayOfMonth: string,
  month: string,
  dayOfWeek: string,
  today: Date
): boolean {
  if (dayOfMonth !== "*" && !matchesField(dayOfMonth, today.getDate())) {
    return false;
  }
  if (month !== "*" && !matchesField(month, today.getMonth() + 1)) {
    return false;
  }
  if (dayOfWeek !== "*" && !matchesField(dayOfWeek, today.getDay())) {
    return false;
  }
  return true;
}

function matchesField(field: string, value: number): boolean {
  if (field === "*") return true;

  if (field.includes(",")) {
    return field.split(",").some((f) => matchesField(f.trim(), value));
  }

  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }

  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }

  return parseInt(field, 10) === value;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format date as ISO 8601 local datetime (for iOS Shortcuts)
 * e.g., "2026-02-06T04:05:00"
 */
function formatISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
}
