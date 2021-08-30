import http from "http";
import { Bitmap } from "./bitmap";
import { Buffer } from "buffer";
/// <reference path="./cors-anywhere.d.ts"/>
import { createServer } from "cors-anywhere";
import assert from "assert";

const hostname = "127.0.0.1";
const port = 3000;

const cors_anywhere = createServer();

const server = http.createServer(function (req, res) {
  const originalWrite = res.write;
  const originalEnd = res.end;
  const buffers: (Buffer | string)[] = [];


  res.write = function (
    this: http.ServerResponse,
    data: Buffer | string,
    encoding: BufferEncoding,
    callback?: (error: Error | null | undefined) => void
  ) {
    assert.ok(Buffer.isBuffer(data) || typeof data === 'string');

    buffers.push(data);
    if (callback) {
      process.nextTick(callback, null);
    }
  } as any;


  res.end = function (
    this: http.ServerResponse,
    data: Buffer | string,
    encoding: BufferEncoding,
    callback?: () => void
  ) {
    if (data) {
      this.write(data, encoding);
    }

    // After calling .end(), .write shouldn't be called any more. So let's
    // restore it so that the default error handling for writing to closed
    // streams would occur.
    this.write = originalWrite;

    // Combine all chunks. Note that we're assuming that all chunks are
    // utf8 strings or buffers whose content is utf8-encoded. If this
    // assumption is not true, then you have to update the .write method
    // above.

    const body = buffers.join('');

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/bmp");
    const result = Bitmap.fromString(body);

    console.log({
      result,
      length: result.toString().length,
      data: result.getLittleEndian(),
    });

    // .end should be called once, so let's restore it so that any default
    // error handling occurs if it occurs again.
    this.end = originalEnd as any;
    this.end(result, 'utf8', callback);
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
