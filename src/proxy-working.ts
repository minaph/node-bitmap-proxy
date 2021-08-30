import http from "http";
import { Bitmap } from "./bitmap";
import { Buffer } from "buffer";

import { createServer } from "cors-anywhere";
import assert from "assert";

const hostname = "127.0.0.1";
const port = 3000;

const cors_anywhere = createServer();

const server = http.createServer(function (req, res) {
  var originalWrite = res.write;

  res.write = function (
    this: http.ServerResponse,
    data: Buffer | string,
    encoding: BufferEncoding,
    callback?: (error: Error | null | undefined) => void
  ) {
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }

    assert.strictEqual(typeof data, "string");

    const body = data;

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/bmp");
    const result = Bitmap.fromString(body);

    console.log({
      result,
      length: result.toString().length,
      data: result.getLittleEndian(),
    });

    return originalWrite.call(this, data, encoding, callback);
  } as any;

  cors_anywhere.emit("request", req, res);
});

// const server = http.createServer(async (req, res) => {
// const urlPattern = /\?url=(.*?)(?:\.png|\.jpe?g)?$/;
// const queryUrlMatch = req.url!.match(urlPattern);
// console.log({ queryUrlMatch });
// if (queryUrlMatch) {
// let queryUrl = queryUrlMatch[1];
// let response: Response;
// if (!queryUrl.startsWith("http")) {
//   queryUrl = "http://" + queryUrl;
// }
// try {
//   response = await fetch(queryUrl);
// } catch (e) {
//   badRequest(res);
//   return;
// }
//   res.end(Buffer.from(result.getLittleEndian().buffer));
// } else {
//   badRequest(res);
// }
// });

// function badRequest(res: http.ServerResponse) {
//   res.statusCode = 400;
//   res.setHeader("Content-Type", "text/plain");
//   res.end("Bad request");
// }

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
