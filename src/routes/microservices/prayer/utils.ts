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

const CITY = "Sidoarjo";
const COUNTRY = "Indonesia";
const METHOD = 20; // Kemenag RI
const API_URL = `http://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=${METHOD}`;

/**
 * Fetch prayer times for Sidoarjo with daily caching
 */
export async function getPrayerTimes(): Promise<PrayerTimes> {
  const cacheUrl = new URL(API_URL);
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  }); // YYYY-MM-DD
  cacheUrl.searchParams.set("date", today); // Force cache key per day

  const cacheKey = new Request(cacheUrl.toString());
  const cache = caches.default;

  // Check cache
  let response = await cache.match(cacheKey);

  if (!response) {
    console.log("Fetching fresh prayer times from Aladhan...");
    response = await fetch(API_URL);

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
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
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
