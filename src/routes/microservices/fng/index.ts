import { Hono } from "hono";
import { getFearGreedIndex, isExtremeStatus } from "./utils";

const app = new Hono();

/**
 * GET /microservices/fng
 * Returns current FNG data
 */
app.get("/", async (c) => {
  const data = await getFearGreedIndex();
  return c.json(data);
});

/**
 * GET /microservices/fng/extreme-any
 * Returns "1" if either extreme fear or greed, "0" otherwise
 */
app.get("/extreme-any", async (c) => {
  const result = await isExtremeStatus();
  return c.text(result ? "1" : "0");
});

export { app as fngRoute };
