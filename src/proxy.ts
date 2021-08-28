import http from "http";
// import url from "url";
import fetch from "node-fetch";
import { Bitmap } from "./bitmap";
import { Buffer } from "buffer";

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer(async (req, res) => {
  // const url_parse = new URL(req.url!);
  // const queryUrl = url_parse.searchParams.get("url");
  const queryUrl = req.url!.split("?url=")[1];
  console.log({ queryUrl });
  if (queryUrl) {
    const response = await fetch(queryUrl!);
    const body = await response.text();

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/bmp");
    const result = Bitmap.fromString(body);
    console.log({
      result,
      length: result.toString().length,
      data: result.getLittleEndian(),
    });
    res.end(Buffer.from(result.getLittleEndian().buffer));
  } else {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain");
    res.end("Bad request");
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
