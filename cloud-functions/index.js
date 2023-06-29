import functions from "@google-cloud/functions-framework";
import handler from "./src/BitmapHttpServer";
functions.http("bitmap-server", (req, res) => {
  handler(req, res);
});
