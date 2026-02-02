import { Hono } from "hono";
import {
  isFiveMinutesBeforeFajr,
  is10MinutesBeforeSunrise,
  getPrayerTimes,
  getNextTriggerTimes,
} from "./utils";

const app = new Hono();

/**
 * GET /microservices/prayer
 * Debug endpoint to see cached times
 */
app.get("/", async (c) => {
  const times = await getPrayerTimes();
  return c.json(times);
});

/**
 * GET /microservices/prayer/wake-up
 * Returns "1" if 5 mins before Fajr, else "0"
 */
app.get("/wake-up", async (c) => {
  const shouldWakeUp = await isFiveMinutesBeforeFajr();
  return c.text(shouldWakeUp ? "1" : "0");
});

/**
 * GET /microservices/prayer/wake-up-sunrise
 * Returns "1" if 10 mins before Sunrise, else "0"
 */
app.get("/wake-up-sunrise", async (c) => {
  const shouldWakeUp = await is10MinutesBeforeSunrise();
  return c.text(shouldWakeUp ? "1" : "0");
});

/**
 * GET /microservices/prayer/next-trigger
 * Returns next trigger times for Fajr and Sunrise alarms
 */
app.get("/next-trigger", async (c) => {
  const times = await getNextTriggerTimes();
  return c.json(times);
});

app.get("/test", (c) => c.text("Prayer Service Reachable"));

app.onError((err, c) => {
  console.error(`Prayer Service Error: ${err}`);
  return c.text(`Prayer Service Error: ${err.message}`, 500);
});

app.get("/debug-time", async (c) => {
  const timings = await getPrayerTimes();
  const sunriseTime = timings.Sunrise;

  const [sunriseHour, sunriseMinute] = sunriseTime.split(":").map(Number);

  // Current Jakarta Time Construction
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );

  const sunriseDate = new Date(now);
  sunriseDate.setHours(sunriseHour, sunriseMinute, 0, 0);

  // Wake up time (10 mins before)
  const wakeUpTime = new Date(sunriseDate.getTime() - 10 * 60 * 1000);

  return c.json({
    now: now.toString(),
    now_hours: now.getHours(),
    now_mins: now.getMinutes(),
    sunrise_str: sunriseTime,
    sunrise_obj: sunriseDate.toString(),
    wake_up_obj: wakeUpTime.toString(),
    wake_up_hours: wakeUpTime.getHours(),
    wake_up_mins: wakeUpTime.getMinutes(),
    match:
      now.getHours() === wakeUpTime.getHours() &&
      now.getMinutes() === wakeUpTime.getMinutes(),
  });
});

export { app as prayerRoute };
