import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

/**
 * Register Convex components used by this app.
 *
 * - `agent` provides server-side AI agent infrastructure: thread/message
 *   storage, delta streaming over websockets, tool approval flow, file
 *   storage, multi-step tool loops, usage tracking. We layer thin app-
 *   specific wrappers on top in /convex/chat/*.ts.
 */
const app = defineApp();
app.use(agent);

export default app;
