import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Route handler exposing the UploadThing file router at /api/uploadthing.
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
