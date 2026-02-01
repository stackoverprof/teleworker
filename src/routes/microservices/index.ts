import { Hono } from "hono";
import { fngRoute } from "./fng";

const app = new Hono();

// Mount all microservices here
app.route("/fng", fngRoute);

export { app as microservices };
