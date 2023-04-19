import {
  OutgoingHttpHeaders,
  RequestOptions,
} from "http";
import { TextDecoder } from "util";
import { base64UrlDecode } from "../bitmap-fetch/base64UrlDecode";
import { fromBuffer } from "./bitmap";

import servertime, { ServerTiming } from "servertime";
import { JSONObject, ProxyResponse, ProxyTargetResponse } from "./BitmapProxyResponse";

import * as http from "http";
import * as https from "https";
import * as net from "net";
import { ContentEncoding } from "./ContentEncoding";

type FetchRequestOptions = RequestOptions & {
  body?: string;
};

function parseDataUrl(input: string) {
  const matches = /^(\w+\/\w+)?(;base64)?,(.*)$/.exec(input);
  if (!matches) {
    return null;
  }
  const mimeType = matches[1] || "text/plain";
  const isBase64 = !!matches[2];
  const data = matches[3];
  const body = isBase64 ? Buffer.from(data, "base64") : Buffer.from(data);
  return { mimeType, body };
}

function makeDataUrlRequest(reqUrl: string,  callback: (res: http.IncomingMessage) => void) {
  const { mimeType, body } = parseDataUrl(reqUrl)!;
  const res = new http.IncomingMessage(new net.Socket());
  res.statusCode = 200;
  res.statusMessage = "OK";
  res.headers = {
    "content-type": mimeType,
    "content-length": body.length.toString(),
  };
  callback(res);
  res.push(body);
  res.push(null);
}

function makeProxyRequest(json: FetchRequestOptions, callback: (res: http.IncomingMessage) => void) {
  const options = {
    hostname: json.hostname,
    port: json.port || (json.protocol === "https:" ? 443 : 80),
    path: json.path,
    method: json.method || "GET",
    headers: json.headers,
  };
  if (json.protocol === "data:") {
    if (!json.path) {
      throw new Error("Invalid URL");
    }
    makeDataUrlRequest(json.path, callback);
  } else {
    const httpModule = json.protocol === "https:" ? https : http;
    const req = httpModule.request(options, callback);
    return req;
  }
}


export default function handler(request: http.IncomingMessage, response: http.ServerResponse) {
  const serverTiming = servertime.createTimer();
  serverTiming.start("0-setup");

  const url = new URL(request.url as string, `http://${request.headers.host}`);
  const q = url.searchParams.get("q");
  if (!q) {
    sendErrorResponse(response, "Invalid request url");
    return;
  }

  const json = decodeRequest(q as string, response);
  if (!json) {
    return;
  }

  const contentEncoding = ContentEncoding.fromRequest(request);

  serverTiming.end("0-setup");
  serverTiming.start("1-connect");

  const req = makeProxyRequest(json, (res) => {
    const { headers, statusCode, statusMessage } = res;
    let ttfb = false;
    const dataBuffer = [] as Buffer[];
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

    res.on("end", () => {
      onEnd(
        response, serverTiming, contentEncoding, {
        headers: headers as JSONObject,
        status: statusCode || 200,
        statusText: statusMessage || "",
        body: Buffer.concat(dataBuffer)
      }, dataBuffer);
    });
  });

  req?.on("error", (e) => {
    console.error(e);
    sendErrorResponse(response, "Internal Server Error");
  });

  req?.on("socket", (socket) => {
    socket.on("connect", () => {
      onConnect(serverTiming);
    });
    if (!socket.connecting) {
      onConnect(serverTiming);
    }
  });

  if (json.body) {
    req?.write(base64UrlDecode(json.body));
  }
  req?.end();
}


function decodeRequest(q: string, response: http.ServerResponse): FetchRequestOptions | null {
  try {
    const _json = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(q))
    ) as FetchRequestOptions;
    return _json;
  } catch (e) {
    console.log(e);
    console.log(q);
    sendErrorResponse(response, "Undecodable request");
    return null;
  }
}

function sendErrorResponse(response: http.ServerResponse, message: string) {
  response.statusCode = 400;
  response.statusMessage = message;
  response.end();
}

export function onEnd(
  response: http.ServerResponse,
  serverTiming: ServerTiming,
  contentEncoding: ContentEncoding,
  result: ProxyTargetResponse,
  dataBuffer: Buffer[]
): void {
  serverTiming.end("3-download");
  serverTiming.start("4-build");
  const binary = new ProxyResponse({
    headers: result.headers,
    status: result.status,
    statusText: result.statusText,
    body: Buffer.concat(dataBuffer)
  }).toBuffer();
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

function onConnect(serverTiming: ServerTiming): void {
  serverTiming.end("1-connect");
  serverTiming.start("2-request");
}

export {
  makeDataUrlRequest,
  ProxyResponse,
  makeProxyRequest
}

