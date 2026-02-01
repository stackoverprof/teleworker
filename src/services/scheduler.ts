import { eq, and } from "drizzle-orm";
import { createDb } from "../db";
import { reminders } from "../db/schema";
import { matchesCron, isCronExpression } from "../lib/cron";
import { sendMessage } from "./telegram";
import { makeCall } from "./callmebot";
import {
  isExtremeFear,
  isExtremeGreed,
  getFearGreedIndex,
} from "../routes/microservices/fng/utils";
import {
  isFiveMinutesBeforeFajr,
  is10MinutesBeforeSunrise,
  getPrayerTimes,
} from "../routes/microservices/prayer/utils";

export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  CALLMEBOT_USER: string;
}

export async function processReminders(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const now = new Date();

  // Fetch all active reminders
  const activeReminders = await db
    .select()
    .from(reminders)
    .where(eq(reminders.active, 1));

  for (const reminder of activeReminders) {
    const shouldTrigger = await checkShouldTrigger(reminder, now);
    if (!shouldTrigger) {
      continue;
    }

    // Check conditional API if set
    if (reminder.apiUrl) {
      try {
        let shouldTriggerCondition = false;
        let contextData: Record<string, string | number> = {};

        // Internal Logic Bypass to avoid Error 1042 (Self-fetch)
        if (reminder.apiUrl.includes("/microservices/fng/extreme-fear")) {
          const data = await getFearGreedIndex();
          if (data.value <= 24) {
            shouldTriggerCondition = true;
            contextData = {
              value: data.value,
              classification: data.classification,
              action: "buying",
            };
          }
        } else if (
          reminder.apiUrl.includes("/microservices/fng/extreme-greed")
        ) {
          const data = await getFearGreedIndex();
          if (data.value >= 76) {
            shouldTriggerCondition = true;
            contextData = {
              value: data.value,
              classification: data.classification,
              action: "selling",
            };
          }
          // New Merged Condition
        } else if (reminder.apiUrl.includes("/microservices/fng/extreme-any")) {
          const data = await getFearGreedIndex();
          if (data.value <= 24 || data.value >= 76) {
            shouldTriggerCondition = true;
            contextData = {
              value: data.value,
              classification: data.classification,
              action: data.value <= 24 ? "buying" : "selling",
            };
          }
        } else if (
          reminder.apiUrl.includes("/microservices/prayer/wake-up-sunrise")
        ) {
        } else if (
          reminder.apiUrl.includes("/microservices/prayer/wake-up-sunrise")
        ) {
          if (await is10MinutesBeforeSunrise()) {
            shouldTriggerCondition = true;
            const times = await getPrayerTimes();
            contextData = { time: times.Sunrise };
          }
        } else if (reminder.apiUrl.includes("/microservices/prayer/wake-up")) {
          if (await isFiveMinutesBeforeFajr()) {
            shouldTriggerCondition = true;
            const times = await getPrayerTimes();
            contextData = { time: times.Fajr };
          }
        } else {
          // External fetch
          const res = await fetch(reminder.apiUrl);
          const text = (await res.text()).trim();
          if (text === "1") shouldTriggerCondition = true;
        }

        if (!shouldTriggerCondition) {
          continue;
        }

        // Dynamic Variable Replacement
        for (const [key, value] of Object.entries(contextData)) {
          reminder.message = reminder.message.replace(
            new RegExp(`{{${key}}}`, "g"),
            String(value),
          );
        }
      } catch (e) {
        console.error(`API check failed for ${reminder.name}:`, e);
        continue; // Skip on API error
      }
    }

    // Send notifications to all chat IDs
    const chatIds = reminder.chatIds.split(",").map((id) => id.trim());

    for (const chatId of chatIds) {
      try {
        await sendMessage(chatId, reminder.message, env.TELEGRAM_BOT_TOKEN);

        // Make call if ring is enabled
        if (reminder.ring === 1) {
          await makeCall(env.CALLMEBOT_USER, reminder.message);
        }
      } catch (e) {
        console.error(`Failed to notify ${chatId}:`, e);
      }
    }

    // Increment count
    await db
      .update(reminders)
      .set({ count: reminder.count + 1 })
      .where(eq(reminders.id, reminder.id));
  }
}

async function checkShouldTrigger(
  reminder: typeof reminders.$inferSelect,
  now: Date,
): Promise<boolean> {
  if (isCronExpression(reminder.when)) {
    // Recurring: check cron match
    return matchesCron(reminder.when, now);
  } else {
    // Scheduled: check if time passed and not yet triggered
    const scheduledTime = new Date(reminder.when);
    return scheduledTime <= now && reminder.count === 0;
  }
}
