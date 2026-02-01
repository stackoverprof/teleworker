import { Hono } from "hono";
import { getFearGreedIndex, isExtremeFear, isExtremeGreed } from "./utils";

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
 * GET /microservices/fng/extreme-fear
 * Returns "1" if extreme fear, "0" otherwise
 */
app.get("/extreme-fear", async (c) => {
  const result = await isExtremeFear();
  return c.text(result ? "1" : "0");
});

/**
 * GET /microservices/fng/extreme-greed
 * Returns "1" if extreme greed, "0" otherwise
 */
app.get("/extreme-greed", async (c) => {
  const result = await isExtremeGreed();
  return c.text(result ? "1" : "0");
});

export { app as fngRoute };
