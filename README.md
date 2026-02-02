# 📡 Teleworker

<div align="center">

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)

**Your personal Telegram assistant, running serverlessly on Cloudflare Workers.**

[Features](#-features) • [Architecture](#-architecture) • [Setup](#-setup) • [Usage](#-usage)

</div>

---

## ✨ Features

### 🔔 Smart Reminders

- **Cron-based scheduling** - Set recurring reminders with cron expressions
- **One-time scheduling** - Schedule reminders for specific dates/times
- **Conditional triggers** - Reminders that only fire when conditions are met
- **Phone calls** - Get called via CallMeBot for critical reminders

### 🕌 Prayer Times Integration

- Fetches daily prayer times from [Aladhan API](https://aladhan.com/prayer-times-api)
- **Fajr Wake-up Alarm** - 5 minutes before Fajr with phone call
- **Sunrise Alarm** - 10 minutes before sunrise
- **Friday Prayer Reminder** - 30 minutes before Jumu'ah

### 📊 Crypto Fear & Greed Index

- Fetches BTC Fear & Greed Index from [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/)
- Alerts on extreme fear (≤24) or extreme greed (≥76)
- Dynamic messages with live data interpolation

### 🗓️ Meeting Reminders

- Weekly meeting reminders (Fridays)
- Monthly meeting reminders (Last Thursday of month)
- Pre-meeting and start-time notifications

### 🤖 MCP Server (AI Integration)

- Built-in [Model Context Protocol](https://modelcontextprotocol.io/) server
- Connect Claude Desktop or other AI assistants
- Manage reminders through natural language

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │  Hono   │  │  Scheduler  │  │     Microservices        │ │
│  │ Router  │  │   (Cron)    │  ├──────────────────────────┤ │
│  │         │  │             │  │ /fng      - Fear & Greed │ │
│  │ /       │  │ * * * * *   │  │ /prayer   - Prayer Times │ │
│  │ /remind │  │ Checks DB   │  │ /meetings - Monthly      │ │
│  │ /mcp    │  │ every min   │  └──────────────────────────┘ │
│  └────┬────┘  └──────┬──────┘                               │
│       │              │                                      │
│       └──────────────┼──────────────────────────────────────┤
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │   D1 SQLite   │                              │
│              │   Database    │                              │
│              └───────────────┘                              │
└─────────────────────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   ┌─────────────┐          ┌─────────────┐
   │  Telegram   │          │  CallMeBot  │
   │  Bot API    │          │  (Calls)    │
   └─────────────┘          └─────────────┘
```

---

## 🛠️ Tech Stack

| Component       | Technology                                             |
| --------------- | ------------------------------------------------------ |
| **Runtime**     | Cloudflare Workers                                     |
| **Framework**   | [Hono](https://hono.dev/)                              |
| **Database**    | D1 (SQLite) + [Drizzle ORM](https://orm.drizzle.team/) |
| **Language**    | TypeScript                                             |
| **Styling**     | JSX (Server-rendered)                                  |
| **AI Protocol** | MCP (Model Context Protocol)                           |

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Cloudflare account
- Telegram Bot (from [@BotFather](https://t.me/BotFather))
- CallMeBot authorized (message [@CallMeBot_txtbot](https://t.me/CallMeBot_txtbot))

### Installation

```bash
# Clone the repository
git clone https://github.com/stackoverprof/teleworker.git
cd teleworker

# Install dependencies
npm install

# Create D1 database
wrangler d1 create teleworker-db
# Update database_id in wrangler.toml

# Run migrations
npm run db:migrate

# Set secrets
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put ADMIN_PASSWORD
wrangler secret put CALLMEBOT_USER
```

### Development

```bash
npm run dev
```

### Deploy

```bash
npm run deploy
```

---

## 📖 Usage

### API Endpoints

| Endpoint                | Method | Description                  |
| ----------------------- | ------ | ---------------------------- |
| `/`                     | GET    | Dashboard with all reminders |
| `/reminders`            | GET    | List all reminders           |
| `/reminders`            | POST   | Create a reminder            |
| `/reminders/:id`        | PUT    | Update a reminder            |
| `/reminders/:id`        | DELETE | Delete a reminder            |
| `/microservices/prayer` | GET    | Current prayer times         |
| `/microservices/fng`    | GET    | Fear & Greed Index           |
| `/mcp/sse`              | GET    | MCP Server (SSE)             |

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

### Conditional Reminders

Use `apiUrl` to add conditions:

```json
{
  "name": "Wake Up Alarm",
  "message": "🌅 Fajr is at {{time}}!",
  "when": "* * * * *",
  "apiUrl": "/microservices/prayer/wake-up",
  "ring": 1
}
```

The reminder only fires when the internal check returns `true`.

---

## 🔐 Security

- All write operations require `X-Admin-Password` header
- Secrets stored in Cloudflare Workers secrets (not in code)
- MCP endpoint protected with token authentication

---

## 📜 License

MIT © [stackoverprof](https://github.com/stackoverprof)

---

<div align="center">

**Built with ❤️ and ☕ on Cloudflare Workers**

</div>
