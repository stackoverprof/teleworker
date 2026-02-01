# teleworker

Telegram reminder bot on Cloudflare Workers.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create D1 database:

   ```bash
   wrangler d1 create teleworker-db
   ```

   Update `database_id` in `wrangler.toml` with the generated ID.

3. Run migrations:

   ```bash
   npm run db:migrate
   ```

4. Set secrets:

   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   ```

5. Update `CALLMEBOT_USER` in `wrangler.toml` with your Telegram username.

6. Authorize CallMeBot: message `@CallMeBot_txtbot` on Telegram.

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```
