import {
  TIMEZONE,
  CITY,
  COUNTRY,
  PRAYER_METHOD as METHOD,
} from "../../../lib/constants";

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface AladhanResponse {
  code: number;
  status: string;
  data: {
    timings: PrayerTimes;
  };
}

const API_URL = `http://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=${METHOD}`;

/**
 * Fetch prayer times for Sidoarjo with daily caching
 */
export async function getPrayerTimes(): Promise<PrayerTimes> {
  const dateObj = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE }),
  );
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  const dateString = `${day}-${month}-${year}`; // DD-MM-YYYY for Aladhan API

  const url = new URL(API_URL);
  url.searchParams.set("date", dateString);

  const cacheKey = new Request(url.toString());
  const cache = caches.default;

  // Check cache
  let response = await cache.match(cacheKey);

  if (!response) {
    console.log(
      `Fetching fresh prayer times from Aladhan for ${dateString}...`,
    );
    response = await fetch(url.toString());

    // Clone to cache
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "max-age=86400"); // Cache for 24h

    // Store in cache
    try {
      await cache.put(cacheKey, response.clone());
    } catch (e) {
      console.error("Failed to cache prayer times:", e);
    }
  }

  const data = (await response.json()) as AladhanResponse;
  return data.data.timings;
}

/**
 * Check if it is currently exactly 5 minutes before Fajr
 */
export async function isFiveMinutesBeforeFajr(): Promise<boolean> {
  const timings = await getPrayerTimes();
  const fajrTime = timings.Fajr; // "04:18" (HH:mm)

  // Parse Fajr time
  const [fajrHour, fajrMinute] = fajrTime.split(":").map(Number);

  // Create Date object for Fajr today
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE }),
  );
  const fajrDate = new Date(now);
  fajrDate.setHours(fajrHour, fajrMinute, 0, 0);

  // Subtract 5 minutes
  const wakeUpTime = new Date(fajrDate.getTime() - 5 * 60 * 1000);

  // Compare with current time (ignore seconds)
  return now.getMinutes() === wakeUpTime.getMinutes();
}

/**
 * Check if it is currently exactly 10 minutes before Sunrise
 */
export async function is10MinutesBeforeSunrise(): Promise<boolean> {
  const timings = await getPrayerTimes();
  const sunriseTime = timings.Sunrise; // "05:30" etc

  const [sunriseHour, sunriseMinute] = sunriseTime.split(":").map(Number);

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  const sunriseDate = new Date(now);
  sunriseDate.setHours(sunriseHour, sunriseMinute, 0, 0);

  // Subtract 10 minutes
  const wakeUpTime = new Date(sunriseDate.getTime() - 10 * 60 * 1000);

  return (
    now.getHours() === wakeUpTime.getHours() &&
    now.getMinutes() === wakeUpTime.getMinutes()
  );
}
