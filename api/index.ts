import type { VercelResponse, VercelRequest } from "@vercel/node";
import {
  request as HTTPRequest,
  RequestOptions,
  IncomingMessage,
  OutgoingHttpHeaders,
} from "http";
import { request as HTTPSRequest } from "https";
import { Bitmap } from "./_bitmap";
import { gzipSync, brotliCompressSync, deflateSync } from "zlib";
import { base64UrlDecode } from "../bitmap-fetch/base64UrlDecode"

import servertime from "servertime";
import { ProxyTargetResponse, ProxyResponse } from "./_BitmapProxyResponse";

export default function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // servertime.addToResponse(response);
  const serverTiming = servertime.createTimer();

  serverTiming.start("0-setup");

  const {
    query: { q },
  } = request;
  if (!q) {
    response.status(400).send("Invalid request url");
    return;
  }

  const data = base64UrlDecode(q as string);
  let json: RequestOptions;
  let reqBody: Uint8Array | null = null;
  try {
    const _json = JSON.parse(data.toString()) as RequestOptions & { body?: string };
    if (_json.body) {
      reqBody = base64UrlDecode(_json.body);
      delete _json.body;
    }
    json = _json as RequestOptions;
  } catch (e) {
    console.log(e);
    console.log(data);
    response.status(400).send("Undecodable request");
    return;
  }

  console.log(JSON.stringify(json, null, 2));
  const contentEncoding = ContentEncoding.fromRequest(request);

  let proxyRequest = HTTPRequest;
  if (json.protocol === "https:") {
    proxyRequest = HTTPSRequest;
  }

  serverTiming.end("0-setup");
  serverTiming.start("1-connect");

  const req = proxyRequest(json, (res) => {
    const { headers, statusCode, statusMessage } = res;
    // let body = "";
    let ttfb = false;
    const dataBuffer = [] as Buffer[];
    // res.setEncoding("utf8");
    res.on("data", (data) => {
      if (!ttfb) {
        ttfb = true;
        serverTiming.end("2-request");
        serverTiming.start("3-download");
      }
      if (typeof data === "string") {
        dataBuffer.push(Buffer.from(data));
      } else {
        dataBuffer.push(data);
      }
    });

    res.on("end", onEnd);

    function onEnd() {
      serverTiming.end("3-download");
      serverTiming.start("4-build");
      const result = {
        headers,
        status: statusCode,
        statusText: statusMessage,
        // body,
        body: Buffer.concat(dataBuffer),
      } as ProxyTargetResponse;
      // const binary = Buffer.from(result);
      const binary = new ProxyResponse(result).toBuffer();
      const bitmap = fromBuffer(binary);
      serverTiming.end("4-build");
      serverTiming.start("5-compress");
      const compressed = contentEncoding.encode(bitmap.getUint8LE());
      serverTiming.end("5-compress");
      const responseHeaders = {
        "Content-Type": "image/bmp",
        "Content-Length": compressed.byteLength,
        "Content-Encoding": contentEncoding.type,
        "Access-Control-Allow-Origin": "*",
        "access-control-expose-headers": "Access-Control-Allow-Origin",
        "Cache-Control": "no-store",
        "Server-Timing": serverTiming.getHeader(),
      } as OutgoingHttpHeaders;
      response.writeHead(200, responseHeaders);
      response.write(compressed, "binary", () => {
        response.end();
      });
    }
  });
  req.on("error", (e) => {
    console.error(e);
    response.status(500).send("Internal Server Error");
  });

  req.on("socket", (socket) => {
    socket.on("connect", onConnect);
    if (!socket.connecting) {
      onConnect();
    }
    function onConnect() {
      serverTiming.end("1-connect");
      serverTiming.start("2-request");
    }
  });

  if (reqBody) {
    req.write(reqBody);
  }
  req.end();
}





function fromBuffer(data: Buffer) {
  const width = 256;
  const height = Math.ceil((data.length + 1) / (width * 3));
  const space = width * height * 3 - data.length - 1;

  const bitmap = new Bitmap(width, height);

  bitmap.bitmapData = Buffer.concat([
    data,
    Buffer.alloc(1).fill(1),
    Buffer.alloc(space),
  ]);
  return bitmap;
}

type Encodings = "identity" | "br" | "gzip" | "compress";

class ContentEncoding {
  static get(headers: { [key: string]: string }) {
    const contentEncoding = headers["content-encoding"];
    if (contentEncoding) {
      return contentEncoding;
    }
    return "identity";
  }

  static fromRequest(request: IncomingMessage) {
    if (!("accept-encoding" in request.headers)) {
      return new ContentEncoding("identity");
    }
    const acceptEncoding = request.headers["accept-encoding"] as string;
    const selected: {
      type: Encodings;
      quality: number;
    } = {
      type: "identity",
      quality: 0,
    };
    for (const item of acceptEncoding.split(",")) {
      let encoding: string, quality: number;
      if (item.includes(";")) {
        let _q: string;
        [encoding, _q] = item.split(";");
        quality = parseFloat(_q.split("=")[1]);
      } else {
        [encoding, quality] = [item, 1];
      }
      if (quality > selected.quality) {
        selected.type = encoding.trim() as Encodings;
        selected.quality = quality;
      }
    }
    return new ContentEncoding(selected.type);
  }

  type: Encodings;
  constructor(type: Encodings) {
    this.type = type;
  }

  encode(value: Buffer): Buffer {
    switch (this.type) {
      case "br":
        return brotliCompressSync(value);
      case "gzip":
        return gzipSync(value);
      case "compress":
        return deflateSync(value);
      case "identity":
        return value;
      default:
        throw new Error("Unknown encoding");
    }
  }
}
