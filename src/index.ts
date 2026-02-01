import { Hono } from "hono";
import { remindersRoute } from "./routes/reminders";
import { microservices } from "./routes/microservices";
import { homeRoute } from "./routes/home";
import { processReminders, type Env } from "./services/scheduler";

const app = new Hono<{ Bindings: Env }>();

// Routes
app.route("/", homeRoute);
app.route("/reminders", remindersRoute);
app.route("/microservices", microservices);
app.get("/health", (c) => c.json({ ok: true }));

// Export for CF Workers
export default {
  fetch: app.fetch,
  scheduled: async (
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ) => {
    ctx.waitUntil(processReminders(env));
  },
};
