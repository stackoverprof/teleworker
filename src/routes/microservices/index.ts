import { Hono } from "hono";
import { fngRoute } from "./fng";
import { prayerRoute } from "./prayer";
import { meetingsRoute } from "./meetings";

const app = new Hono();

// Mount all microservices here
app.route("/fng", fngRoute);
app.route("/prayer", prayerRoute);
app.route("/meetings", meetingsRoute);

export { app as microservices };
