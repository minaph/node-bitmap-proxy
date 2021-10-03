import http from "http";
import url from "url";

/// <reference path="./@types/cors-anywhere.d.ts" />
import { createServer, withCORS } from "../lib/cors-anywhere.js";
import { ResponseReportWriter, BitmapContentSender } from "./BitmapEmbedder";

import fs from "fs";

const hostname = "127.0.0.1";
const port = 3000;

const cors_anywhere = createServer({
  handleInitialRequest: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    _a: url.UrlWithParsedQuery
  ) => {
    const flag = req.headers["sec-fetch-dest"] === "image";
    if (flag) {
      console.log("image request", req.headers);
      start(req, res);
    }
    return flag;
  },
});

cors_anywhere.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

function start(
  req: http.IncomingMessage,
  originalRes: http.ServerResponse & { headers?: http.OutgoingHttpHeaders }
) {
  const cors_anywhere_internal = createServer({});

  const overwriteHeader = withCORS({}, req);
  const res = new ResponseReportWriter();
  BitmapContentSender.pipe(res, originalRes, overwriteHeader);

  // start the proxy
  cors_anywhere_internal.emit("request", req, res);

  // res.on("finish", () => {
  //   // res.pipe(originalRes);
  //   res.on("data", (chunk: Buffer | null) => {
  //     console.log("data!", chunk?.byteLength);

  //     const str = fs.createWriteStream("./test/test.bmp");
  //     str.write(gzipSync(chunk!));
  //     str.end();
  //   });
  // });
}



