import { Hono } from "hono";
import { isLastThursdayOfMonth } from "../prayer/utils";

const app = new Hono();

/**
 * GET /microservices/meetings/monthly
 * Returns "1" if today is the last Thursday of the month, else "0"
 */
app.get("/monthly", async (c) => {
  const isLastThursday = isLastThursdayOfMonth();
  return c.text(isLastThursday ? "1" : "0");
});

app.get("/", (c) => c.json({ service: "meetings", status: "ok" }));

export { app as meetingsRoute };
