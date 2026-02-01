import { Hono } from "hono";
import { fngRoute } from "./fng";
import { prayerRoute } from "./prayer";

const app = new Hono();

// Mount all microservices here
app.route("/fng", fngRoute);
app.route("/prayer", prayerRoute);

export { app as microservices };
