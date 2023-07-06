import { base64UrlDecode } from "../../bitmap-fetch/base64UrlDecode";
import { JSONObject, BmpResponseContent } from "../server/BmpResponse";
// import { http, https } from "follow-redirects";
import * as http from "http";
import * as https from "https";
import type * as httpType from "http";
import * as net from "net";

type FetchRequestOptions = httpType.RequestOptions & {
  body?: string;
};

function parseDataUrl(input: string) {
  const matches = /^(\w+\/[\w+]+)?(;base64)?,(.*)$/.exec(input);
  if (!matches) {
    return null;
  }
  const mimeType = matches[1] || "text/plain";
  const isBase64 = !!matches[2];
  const data = matches[3];
  const body = isBase64 ? Buffer.from(decodeURI(data), "base64") : Buffer.from(decodeURI(data));
  return { mimeType, body };
}

export function makeDataUrlRequest(reqPath: string, callback: (res: httpType.IncomingMessage) => void) {
  const { mimeType, body } = parseDataUrl(reqPath)!;
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

export function makeProxyRequest(json: FetchRequestOptions, callback: (res: httpType.IncomingMessage) => void) {
  const options = {
    hostname: json.hostname,
    port: json.port || (json.protocol === "https:" ? 443 : 80),
    path: json.path,
    method: json.method || "GET",
    headers: json.headers,
    maxBodyLength: 300 * 1024 * 1024
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

export async function proxyService(request: string, callback: (content: BmpResponseContent) => void): Promise<void> {

  const parsedRequestOptions = parseRequestToProxy(request);
  if (!parsedRequestOptions) {
    throw new Error("Invalid request");
  }

  const proxyRequest = makeProxyRequest(parsedRequestOptions, (res) => {
    const { headers, statusCode, statusMessage } = res;
    const dataBuffer = [] as Buffer[];
    res.on("data", (data) => {
      if (typeof data === "string") {
        dataBuffer.push(Buffer.from(data));
      } else {
        dataBuffer.push(data);
      }
    });

    res.on("end", () => {
      const content = {
        headers: headers as JSONObject,
        status: statusCode || 200,
        statusText: statusMessage || "",
        body: Buffer.concat(dataBuffer)
      };
      callback(content);
    });
  });

  proxyRequest?.on("error", (e) => {
    console.error(e);
    throw e
  });

  if (parsedRequestOptions.body) {
    proxyRequest?.write(base64UrlDecode(parsedRequestOptions.body));
  }
  proxyRequest?.end();
}

function parseRequestToProxy(q: string): FetchRequestOptions | null {
  try {
    const _json = JSON.parse(q) as FetchRequestOptions;
    return _json;
  } catch (e) {
    console.log(e, q);
    throw new Error("Undecodable request");
  }
}
