import handler from "./BitmapHttpServer";
import functions from '@google-cloud/functions-framework';
// export { handler };

functions.http("bitmap-server", (req, res) => {
  handler(req, res);
});