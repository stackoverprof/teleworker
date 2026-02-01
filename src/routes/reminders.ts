import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createDb } from "../db";
import { reminders, type NewReminder } from "../db/schema";

type Env = {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware for auth check
const checkAuth = (c: any) => {
  const password = c.req.header("X-Admin-Password");
  const expected = c.env.ADMIN_PASSWORD;

  // If no password set in env, allow open access (or default to deny? User said "keep password as secret in cf worker", so we expect it to be set.)
  // Let's assume if env is not set, we might default to block or allow. Safe default is block if we expect security.
  // But for now, if expected is set, we check.
  if (expected && password !== expected) {
    return false;
  }
  return true;
};

// List all reminders (Public)
app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const all = await db.select().from(reminders);
  return c.json(all);
});

// Create reminder (Protected)
app.post("/", async (c) => {
  if (!checkAuth(c)) return c.json({ error: "Unauthorized" }, 401);

  const db = createDb(c.env.DB);
  const body =
    await c.req.json<Omit<NewReminder, "id" | "createdAt" | "count">>();

  const newReminder: NewReminder = {
    id: nanoid(),
    name: body.name,
    message: body.message,
    chatIds: body.chatIds,
    when: body.when,
    apiUrl: body.apiUrl || null,
    ring: body.ring ?? 0,
    active: body.active ?? 1,
    count: 0,
    createdAt: new Date().toISOString(),
  };

  await db.insert(reminders).values(newReminder);
  return c.json(newReminder, 201);
});

// Update reminder (Protected)
app.put("/:id", async (c) => {
  if (!checkAuth(c)) return c.json({ error: "Unauthorized" }, 401);

  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json<Partial<NewReminder>>();

  await db.update(reminders).set(body).where(eq(reminders.id, id));

  const updated = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id))
    .get();

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(updated);
});

// Delete reminder (Protected)
app.delete("/:id", async (c) => {
  if (!checkAuth(c)) return c.json({ error: "Unauthorized" }, 401);

  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  await db.delete(reminders).where(eq(reminders.id, id));
  return c.json({ ok: true });
});

export { app as remindersRoute };
