# 📡 Teleworker

<div align="center">

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)

**Your personal Telegram assistant, running serverlessly on Cloudflare Workers.**

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Usage](#-usage)

</div>

---

## ✨ Features

- 🔔 **Smart Reminders** - Cron-based, one-time, or conditional triggers
- ⏰ **iOS Automation** - `/automation` endpoint for iOS Shortcuts alarms
- 🕌 **Prayer Times** - Fajr, sunrise, and Jumu'ah reminders
- 📊 **Crypto Alerts** - BTC Fear & Greed extreme notifications

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Telegram account

### Step 1: Clone & Install

```bash
git clone https://github.com/stackoverprof/teleworker.git
cd teleworker
npm install
```

### Step 2: Create Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. **Save the token** (looks like `123456789:ABCdefGHI...`)

### Step 3: Get Your Chat ID

This is needed so your bot knows where to send messages.

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your **Chat ID** (a number like `925512522`)
3. **Save this number** - you'll use it when creating reminders

### Step 4: Create D1 Database

```bash
npx wrangler d1 create teleworker-db
```

This outputs a database ID. Copy it and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "teleworker-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Paste here
```

### Step 5: Run Migrations

```bash
npm run db:migrate
```

### Step 6: Set Secrets

```bash
# Your Telegram bot token from Step 2
npx wrangler secret put TELEGRAM_BOT_TOKEN

# A password to protect your API (make up any secure password)
npx wrangler secret put ADMIN_PASSWORD
```

### Step 7: Deploy!

```bash
npm run deploy
```

Your bot is now live at `https://teleworker.YOUR_SUBDOMAIN.workers.dev` 🎉

---

## 🔧 Configuration

### All Configuration Values

- `TELEGRAM_BOT_TOKEN` — Set via `wrangler secret put`, get from [@BotFather](https://t.me/BotFather)
- `ADMIN_PASSWORD` — Set via `wrangler secret put`, make up any secure password
- `database_id` — Set in `wrangler.toml`, get from `wrangler d1 create` output
- `chatIds` — Used when creating reminders, get from [@userinfobot](https://t.me/userinfobot)

### Optional: Customize Location

Prayer times are configured for Jakarta. To change, edit `src/lib/constants.ts`:

```typescript
export const COORDINATES = {
  latitude: -6.2088, // Your latitude
  longitude: 106.8456, // Your longitude
};
export const TIMEZONE = "Asia/Jakarta"; // Your timezone
```

---

## � Usage

### Creating a Reminder

```bash
curl -X POST https://your-worker.workers.dev/reminders \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: YOUR_PASSWORD" \
  -d '{
    "name": "Daily Standup",
    "message": "🚀 Time for standup meeting!",
    "chatIds": "YOUR_CHAT_ID",
    "when": "0 2 * * 1-5",
    "ring": 0,
    "active": 1
  }'
```

### Field Reference

- `name` (string) — Display name for the reminder
- `message` (string) — Message to send (supports `{{variables}}`)
- `chatIds` (string) — Your Telegram chat ID from [@userinfobot](https://t.me/userinfobot)
- `when` (string) — Cron expression (UTC) or ISO date
- `ring` (0 or 1) — 0 = Telegram only, 1 = Include in /automation for iOS alarms
- `active` (0 or 1) — 0 = Paused, 1 = Active
- `apiUrl` (string, optional) — Internal route for conditional triggers

### Cron Examples

- `0 2 * * 1-5` — 2:00 AM UTC, Mon-Fri (9:00 AM WIB)
- `30 7 * * 5` — 7:30 AM UTC, Friday (2:30 PM WIB)
- `0 10 * * *` — 10:00 AM UTC, daily (5:00 PM WIB)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │    Hono     │  │  Scheduler  │  │    Microservices     │ │
│  │   Router    │  │   (Cron)    │  ├──────────────────────┤ │
│  │             │  │             │  │ /fng    - Fear&Greed │ │
│  │ /reminders  │  │ * * * * *   │  │ /prayer - Prayer     │ │
│  │ /automation │  │ Checks DB   │  │ /meetings - Monthly  │ │
│  │             │  │ every min   │  └──────────────────────┘ │
│  └──────┬──────┘  └──────┬──────┘                           │
│         │                │                                  │
│         └────────────────┼──────────────────────────────────┤
│                          ▼                                  │
│                  ┌───────────────┐                          │
│                  │   D1 SQLite   │                          │
│                  └───────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  Telegram   │          │     iOS     │
       │  Bot API    │          │  Shortcuts  │
       └─────────────┘          └─────────────┘
```

---

## 📜 License

MIT © [stackoverprof](https://github.com/stackoverprof)

---

<div align="center">

**Built with ❤️ and ☕ on Cloudflare Workers**

</div>
