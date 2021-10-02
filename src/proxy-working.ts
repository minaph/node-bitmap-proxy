import http from "http";
import { Stream } from "stream";
import url from "url";
import { gzipSync } from "zlib";

/// <reference path="./@types/cors-anywhere.d.ts" />
import { createServer, withCORS } from "../lib/cors-anywhere.js";
import BitmapDuplex from "./BitmapDuplex";

import fs from "fs";

console.log(typeof withCORS, withCORS);

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

  const res = new BitmapDuplex(originalRes, {
    allowHalfOpen: true,
  });


  [res, originalRes].forEach((r) => attachErrorHandler(r, originalRes));

  cors_anywhere_internal.emit("request", req, res);

  res.on("pipe", (_: NodeJS.ReadableStream) => {
    console.log("pipe!");

    // originalRes.headers = res.headers;
    originalRes.headers = {};
    try {
      originalRes.headers = withCORS(originalRes.headers!, req);
      console.log("headers", originalRes.headers);
    } catch (error) {
      console.log(error);
    }
  });

  res.on("finish", () => {
    // res.pipe(originalRes);
    res.on("data", (chunk: Buffer | null) => {
      console.log("data!", chunk?.byteLength);

      const str = fs.createWriteStream("./test/test.bmp");
      str.write(gzipSync(chunk!));
      str.end();

      if (!originalRes.headersSent) {
        originalRes.statusCode = 200;
        originalRes.setHeader("Content-Type", "image/bmp");
        originalRes.setHeader("Content-Encoding", "gzip");
        originalRes.setHeader("Content-Length", chunk?.byteLength!);
        Object.entries(originalRes.headers!).forEach(([key, value]) => {
          originalRes.setHeader(key, value!);
        });

        originalRes.write(gzipSync(chunk!));
      }
    });
    res.on("end", () => {
      console.log("end!");
      originalRes.end();
    });
  });
}

function attachErrorHandler(stream: Stream, res: http.ServerResponse) {
  stream.on("error", (error) => {
    console.log(`${error}`);
    res.statusCode = 500;
    res.end("500 error");
  });
}
