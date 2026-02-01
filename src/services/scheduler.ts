import { eq, and } from "drizzle-orm";
import { createDb } from "../db";
import { reminders } from "../db/schema";
import { matchesCron, isCronExpression } from "../lib/cron";
import { sendMessage } from "./telegram";
import { makeCall } from "./callmebot";
import { getFearGreedIndex } from "../routes/microservices/fng/utils";
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
        const handlers: Record<
          string,
          () => Promise<{
            trigger: boolean;
            data: Record<string, string | number>;
          }>
        > = {
          "/microservices/fng/extreme-any": async () => {
            const data = await getFearGreedIndex();
            const trigger = data.value <= 24 || data.value >= 76;
            return {
              trigger,
              data: {
                value: data.value,
                classification: data.classification,
                action: data.value <= 24 ? "buying" : "selling",
              },
            };
          },
          "/microservices/prayer/wake-up-sunrise": async () => {
            const trigger = await is10MinutesBeforeSunrise();
            const times = await getPrayerTimes();
            return { trigger, data: { time: times.Sunrise } };
          },
          "/microservices/prayer/wake-up": async () => {
            const trigger = await isFiveMinutesBeforeFajr();
            const times = await getPrayerTimes();
            return { trigger, data: { time: times.Fajr } };
          },
        };

        const matchingRoute = Object.keys(handlers).find((route) =>
          reminder.apiUrl.includes(route),
        );

        if (matchingRoute) {
          const result = await handlers[matchingRoute]();
          shouldTriggerCondition = result.trigger;
          contextData = result.data;
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
