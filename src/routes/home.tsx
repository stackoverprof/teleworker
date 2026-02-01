import { Hono } from "hono";
import { createDb } from "../db";
import { reminders } from "../db/schema";
import { eq } from "drizzle-orm";
import type { Env } from "../services/scheduler";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const activeReminders = await db.select().from(reminders);

  return c.html(
    <html>
      <head>
        <title>Teleworker Status</title>
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
              <svg height="24" viewBox="0 0 75 65" fill="#fff">
                <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
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
                <div class="card-header">
                  <h3>{reminder.name}</h3>
                  {reminder.active ? (
                    <span class="badge active">Active</span>
                  ) : (
                    <span class="badge inactive">Inactive</span>
                  )}
                </div>
                <div class="card-body">
                  <div class="row">
                    <span class="label">Message</span>
                    <p class="mono">{reminder.message}</p>
                  </div>
                  <div class="row">
                    <span class="label">Schedule</span>
                    <p class="mono">{reminder.when}</p>
                  </div>
                  <div class="row">
                    <span class="label">Action</span>
                    <p class="mono">
                      {reminder.ring ? "Message + Call 📞" : "Message Only 💬"}
                    </p>
                  </div>
                  {reminder.apiUrl && (
                    <div class="row">
                      <span class="label">Condition API</span>
                      <p class="mono truncate" title={reminder.apiUrl}>
                        {reminder.apiUrl}
                      </p>
                    </div>
                  )}
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;
}

.card:hover {
  border-color: #555;
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 500;
  text-transform: uppercase;
}

.badge.active {
  background: #111;
  border: 1px solid #333;
  color: #fff;
}

.badge.inactive {
  background: #111;
  border: 1px solid #333;
  color: #666;
}

.row {
  margin-bottom: 12px;
}

.row:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 12px;
  color: var(--gray);
  margin-bottom: 4px;
}

.mono {
  font-family: var(--mono);
  font-size: 13px;
  color: #ccc;
  word-break: break-all;
}

.truncate {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--gray);
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
