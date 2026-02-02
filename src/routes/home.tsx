import { Hono } from "hono";
import { createDb } from "../db";
import { reminders } from "../db/schema";
import { eq } from "drizzle-orm";
import type { Env } from "../services/scheduler";
import { getNextTriggerTimes } from "./microservices/prayer/utils";

/**
 * Convert UTC cron expression to WIB (UTC+7) and format as readable string
 * Returns format like "Friday at 14:30" or "Daily at 17:00"
 */
function formatCronToWib(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [minute, hour, day, month, weekday] = parts;

  // Convert hour from UTC to WIB (+7)
  const hourNum = parseInt(hour, 10);
  if (isNaN(hourNum)) return cron; // If hour is not a simple number (e.g., */2), skip

  const wibHour = (hourNum + 7) % 24;
  const timeStr = `${String(wibHour).padStart(2, "0")}:${minute.padStart(2, "0")}`;

  // Format weekday
  const weekdayNames: Record<string, string> = {
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
  };

  // Check for patterns
  if (day === "*" && month === "*") {
    if (weekday === "*") {
      return `Daily at ${timeStr}`;
    } else if (weekdayNames[weekday]) {
      return `${weekdayNames[weekday]} at ${timeStr}`;
    } else if (weekday.includes("-")) {
      // Range like 1-5 for Mon-Fri
      return `Weekdays at ${timeStr}`;
    }
  }

  // Fallback to the original cron for complex expressions
  return `${timeStr} (cron)`;
}

function formatSchedule(
  schedule: string,
  apiUrl: string | null,
  nextTrigger: {
    fajrWakeUp: string;
    sunriseWakeUp: string;
    fridayPrayer: string;
  } | null,
) {
  // For prayer-based conditional reminders, show next trigger time
  if (apiUrl === "/microservices/prayer/wake-up" && nextTrigger) {
    return (
      <span class="next-trigger">Tomorrow at {nextTrigger.fajrWakeUp}</span>
    );
  }
  if (apiUrl === "/microservices/prayer/wake-up-sunrise" && nextTrigger) {
    return (
      <span class="next-trigger">Tomorrow at {nextTrigger.sunriseWakeUp}</span>
    );
  }
  if (apiUrl === "/microservices/prayer/friday-prayer" && nextTrigger) {
    return (
      <span class="next-trigger">Friday at {nextTrigger.fridayPrayer}</span>
    );
  }

  try {
    const formatted = formatCronToWib(schedule);
    return (
      <span class="local-cron" data-cron={schedule}>
        {formatted}
      </span>
    );
  } catch (e) {
    // If parsing fails, it might be a date
    const date = new Date(schedule);
    if (!isNaN(date.getTime())) {
      return (
        <span class="local-time" data-time={schedule}>
          {schedule}
        </span>
      );
    }
    return schedule;
  }
}

function formatMessage(message: string) {
  const parts = message.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((part) => {
        const match = part.match(/^\{\{([^}]+)\}\}$/);
        if (match) {
          return <span class="message-param">{match[1]}</span>;
        }
        return part;
      })}
    </>
  );
}

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const activeReminders = await db.select().from(reminders);

  // Fetch next trigger times for prayer reminders
  let nextTrigger: {
    fajrWakeUp: string;
    sunriseWakeUp: string;
    fridayPrayer: string;
  } | null = null;
  try {
    nextTrigger = await getNextTriggerTimes();
  } catch (e) {
    console.error("Failed to fetch next trigger times:", e);
  }

  return c.html(
    <html>
      <head>
        <title>Teleworker Status</title>
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z'/%3E%3Cpath d='M12 15h.01'/%3E%3Cpath d='M12 7v4'/%3E%3C/svg%3E"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <main>
          <header>
            <div class="logo">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-message-square-warning-icon lucide-message-square-warning"
              >
                <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                <path d="M12 15h.01" />
                <path d="M12 7v4" />
              </svg>
              <h1>Teleworker</h1>
            </div>
            <div class="status-badge">
              <span class="dot"></span>
              Operational
            </div>
          </header>

          <section class="hero">
            <h2>Your personal Telegram assistant.</h2>
            <p>
              Running on Cloudflare Workers. Handling alarms, reminders, and
              microservices.
            </p>
          </section>

          <section class="grid">
            {activeReminders.map((reminder) => (
              <div class="card">
                <div class="card-main">
                  <div class="card-top">
                    <h3>{reminder.name}</h3>
                    {reminder.apiUrl && (
                      <span class="badge-api" title={reminder.apiUrl}>
                        CONDITIONAL
                      </span>
                    )}
                    {reminder.active ? (
                      <span class="status-dot active" title="Active"></span>
                    ) : (
                      <span class="status-dot inactive" title="Inactive"></span>
                    )}
                  </div>
                  <p class="message">{formatMessage(reminder.message)}</p>
                </div>
                <div class="card-meta">
                  <span class="meta-item" title={reminder.when}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {formatSchedule(
                      reminder.when,
                      reminder.apiUrl,
                      nextTrigger,
                    )}
                  </span>
                  <span class="meta-item" title="Action">
                    {reminder.ring ? (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .57 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.81.57A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Call
                      </>
                    ) : (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Chat
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {activeReminders.length === 0 && (
              <div class="empty-state">
                <p>No active reminders configured.</p>
              </div>
            )}
          </section>

          <footer>
            <p>Deployed on Cloudflare Workers</p>
          </footer>
          <script
            dangerouslySetInnerHTML={{
              __html: `
            // Format Dates
            document.querySelectorAll('.local-time').forEach(el => {
              try {
                const date = new Date(el.dataset.time);
                if(!isNaN(date)) {
                   el.textContent = date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                }
              } catch(e){}
            });

            // Format Daily Crons
            document.querySelectorAll('.local-cron').forEach(el => {
                const cron = el.dataset.cron.trim();
                // Match "m h * * *" (Daily)
                const dailyMatch = cron.match(/^(\\d+)\\s+(\\d+)\\s+\\*\\s+\\*\\s+\\*$/);
                
                if (dailyMatch) {
                    const min = parseInt(dailyMatch[1]);
                    const hour = parseInt(dailyMatch[2]);
                    
                    const date = new Date();
                    date.setUTCHours(hour, min, 0, 0);
                    
                    const timeStr = date.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
                    el.textContent = "Daily at " + timeStr;
                    el.title = "Converted from " + hour + ":" + (min<10?'0'+min:min) + " UTC";
                } else if (cron === "* * * * *") {
                    el.textContent = "Every minute";
                }
                // Leave complex crons as server-rendered text
            });
          `,
            }}
          />
        </main>
      </body>
    </html>,
  );
});

const css = `
:root {
  --bg: #000;
  --fg: #ededed;
  --gray: #888;
  --border: #333;
  --card-bg: #0a0a0a;
  --accent: #fff;
  --mono: 'JetBrains Mono', monospace;
  --sans: 'Inter', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

main {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo h1 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray);
  border: 1px solid var(--border);
  padding: 4px 12px;
  border-radius: 99px;
  background: #111;
}

.dot {
  width: 8px;
  height: 8px;
  background: #00ff95;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(0, 255, 149, 0.4);
}

.hero {
  margin-bottom: 60px;
}

.hero h2 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -1px;
  margin-bottom: 12px;
   background: linear-gradient(to right, #fff, #888);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  color: var(--gray);
  font-size: 18px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px; /* Increased padding */
  display: flex;
  flex-direction: column; /* Column on mobile by default or row? Let's check query */
  gap: 12px; /* Gap between main and meta */
  justify-content: space-between;
  align-items: flex-start; /* Align start */
  transition: border-color 0.2s;
  /* Removed fixed height */
}

@media (min-width: 600px) {
  .card {
     flex-direction: row;
     align-items: center;
  }
}

.card:hover {
  border-color: #555;
}

.card-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px; /* Increased gap */
  width: 100%;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-top h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  margin: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.active {
  background: #00ff95;
  box-shadow: 0 0 6px rgba(0, 255, 149, 0.4);
}

.status-dot.inactive {
  background: #333;
}

.badge-api {
  font-size: 10px;
  color: var(--gray);
  border: 1px solid #333;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.message {
  font-size: 13px;
  color: var(--gray);
  line-height: 1.5;
}

.message-param {
  font-family: var(--mono);
  background: #222;
  border: 1px solid #333;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #aaa;
  margin: 0 2px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--gray);
  white-space: nowrap;
}


.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--gray);
    font-size: 13px;
    border: 1px dashed var(--border);
    border-radius: 6px;
}

footer {
    margin-top: 80px;
    text-align: center;
    font-size: 13px;
    color: #444;
    border-top: 1px solid var(--border);
    padding-top: 40px;
}
`;

export { app as homeRoute };
