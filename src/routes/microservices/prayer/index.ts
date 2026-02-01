import { Hono } from "hono";
import { isFiveMinutesBeforeFajr, getPrayerTimes } from "./utils";

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

export { app as prayerRoute };
