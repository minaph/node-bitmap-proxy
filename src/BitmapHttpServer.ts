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

import fs from "fs";
import fsPromise from "fs/promises";

import { Storage } from "@google-cloud/storage";
const storage = new Storage();
const bucket = storage.bucket('node-bitmap-proxy-yuki');

const fileStrategy: "local" | "gcs" = "gcs";

type FetchRequestOptions = RequestOptions & {
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

function makeDataUrlRequest(reqPath: string, callback: (res: http.IncomingMessage) => void) {
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

function sendSignal(response: http.ServerResponse, flag: boolean) {
  let image: string;
  // base64エンコードされた画像データ 
  // black data:image/bmp;base64,Qk1CAAAAAAAAAD4AAAAoAAAAAQAAAAEAAAABAAEAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAA
  // white data:image/bmp;base64,Qk1CAAAAAAAAAD4AAAAoAAAAAQAAAAEAAAABAAEAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wCAAAAA
  switch (flag) {
    case true:
      image = "Qk1CAAAAAAAAAD4AAAAoAAAAAQAAAAEAAAABAAEAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wCAAAAA";
      break;
    case false:
      image = "Qk1CAAAAAAAAAD4AAAAoAAAAAQAAAAEAAAABAAEAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAA";
      break;
    default:
      throw new Error("Invalid flag");
  }
  returnBmpSignal(response, image);
}

function returnBmpSignal(res: http.ServerResponse, imageData: string) {
  // base64データをバイナリに変換
  const imageBuffer = Buffer.from(imageData, 'base64');

  // レスポンスヘッダーを設定
  const responseHeaders = {
    'Content-Type': 'image/bmp',
    "Access-Control-Allow-Origin": "*",
    "access-control-expose-headers": "Access-Control-Allow-Origin",
    "Cache-Control": "no-store",
    "content-length": imageBuffer.byteLength.toString(),
  }

  // レスポンスヘッダーを書き込み
  res.writeHead(200, responseHeaders);

  // レスポンスに画像データを書き込み
  res.write(imageBuffer);

  // レスポンス終了
  res.end();
}

// function checkAllFilesExist(id: string, n: string) {
//   const path = `/tmp/${id}/`;
//   for (let i = 0; i < parseInt(n); i++) {
//     if (!fs.existsSync(path + `${i}`)) {
//       return false;
//     }
//   }
//   return true;
// }

// function readAllFiles(id: string, n: string) {
//   const path = `/tmp/${id}/`;
//   let data = "";
//   for (let i = 0; i < parseInt(n); i++) {
//     data += fs.readFileSync(path + `${i}`);
//   }
//   return data;
// }


// export default function handler(request: http.IncomingMessage, response: http.ServerResponse) {
//   const serverTiming = servertime.createTimer();
//   serverTiming.start("0-setup");

//   const url = new URL(request.url as string, `http://${request.headers.host}`);
//   let q = url.searchParams.get("q");
//   const id = url.searchParams.get("id");
//   const n = url.searchParams.get("n");
//   const p = url.searchParams.get("p");
//   if (!q) {
//     sendErrorResponse(response, "Invalid request url");
//     return;
//   }

//   if (id && n && p) {
//     if (n !== "1") {
//       const path = `/tmp/${id}/`;
//       if (!fs.existsSync(path)) {
//         fs.mkdirSync(path);
//       }
//       if (!fs.existsSync(path + `${p}`)) {
//         fs.writeFileSync(path + `${p}`, q);
//       }

//       if (checkAllFilesExist(id, n)) {
//         q = readAllFiles(id, n);
//         fs.rmSync(path, { recursive: true, force: true });
//       } else {
//         sendSignal(response, true);
//         return;
//       }
//     }
//   } else if (n !== "1" && (id || n || p)) {
//     sendErrorResponse(response, "Invalid request url");
//     return;
//   }

//   const json = decodeRequest(q, response);
//   if (!json) {
//     sendErrorResponse(response, "Invalid request");
//     return;
//   }

//   const contentEncoding = ContentEncoding.fromRequest(request);

//   serverTiming.end("0-setup");
//   serverTiming.start("1-connect");

//   const req = makeProxyRequest(json, (res) => {
//     const { headers, statusCode, statusMessage } = res;
//     let ttfb = false;
//     const dataBuffer = [] as Buffer[];
//     res.on("data", (data) => {
//       if (!ttfb) {
//         ttfb = true;
//         serverTiming.end("2-request");
//         serverTiming.start("3-download");
//       }
//       if (typeof data === "string") {
//         dataBuffer.push(Buffer.from(data));
//       } else {
//         dataBuffer.push(data);
//       }
//     });

//     res.on("end", () => {
//       onEnd(
//         response, serverTiming, contentEncoding, {
//         headers: headers as JSONObject,
//         status: statusCode || 200,
//         statusText: statusMessage || "",
//         body: Buffer.concat(dataBuffer)
//       }, dataBuffer);
//     });
//   });

//   req?.on("error", (e) => {
//     console.error(e);
//     sendErrorResponse(response, "Internal Server Error");
//   });

//   req?.on("socket", (socket) => {
//     socket.on("connect", () => {
//       onConnect(serverTiming);
//     });
//     if (!socket.connecting) {
//       onConnect(serverTiming);
//     }
//   });

//   if (json.body) {
//     req?.write(base64UrlDecode(json.body));
//   }
//   req?.end();
// }


interface FileSystem {
  isExists(fileId: string): Promise<boolean>;
  validateFileId(fileId: string): Promise<boolean>;
  writeFile(fileId: string, data: string): Promise<void>;
  readFile(fileId: string): Promise<string>;
  remove(fileId: string, options: { recursive: boolean; force: boolean }): Promise<void>;
}

interface FSAdditionalUtil {
  // ファイルの存在確認
  isAllExists(fileIds: string[]): Promise<boolean>;
  readAllFiles(fileIds: string[]): Promise<string>;
  removeAllFiles(fileIds: string[]): Promise<void>;
}

class LocalFileSystem implements FileSystem, FSAdditionalUtil {
  isExists(fileId: string) {
    return Promise.resolve(fs.existsSync(fileId));
  }
  async validateFileId(fileId: string): Promise<boolean> {
    return fsPromise.mkdir(fileId).then(() => true, () => false);
  }
  writeFile(fileId: string, data: string) {
    fs.writeFileSync(fileId, data);
    return Promise.resolve();
  }
  readFile(fileId: string) {
    return Promise.resolve(fs.readFileSync(fileId).toString());
  }
  remove(fileId: string, options: { recursive: boolean; force: boolean }) {
    return Promise.resolve(fs.rmSync(fileId, options));
  }

  isAllExists(fileIds: string[]) {
    return Promise.resolve(fileIds.every((fileId) => this.isExists(fileId)));
  }

  readAllFiles(fileIds: string[]) {
    return Promise.resolve(fileIds.map((fileId) => this.readFile(fileId)).join(""));
  }

  removeAllFiles(fileIds: string[]) {
    return Promise.resolve(
      fileIds.forEach((fileId) => this.remove(fileId, { recursive: true, force: true }))
    );
  }
}

class GoogleCloudStorage implements FileSystem, FSAdditionalUtil {
  isExists(fileId: string) {
    return bucket.file(fileId).exists().then((data) => data[0]);
  }
  async validateFileId(fileId: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  writeFile(fileId: string, data: string) {
    return bucket.file(fileId).save(data);
  }
  async readFile(fileId: string): Promise<string> {
    return (await bucket.file(fileId).download())[0].toString();
  }
  remove(fileId: string) {
    return bucket.file(fileId).delete().then(() => undefined);
  }

  isAllExists(fileIds: string[]) {
    return Promise.all(fileIds.map((fileId) => this.isExists(fileId))).then((data) => data.every((d) => d));
  }

  readAllFiles(fileIds: string[]) {
    return Promise.all(fileIds.map((fileId) => this.readFile(fileId))).then(x => x.join(""));
  }

  removeAllFiles(fileIds: string[]) {
    return Promise.all(fileIds.map((fileId) => this.remove(fileId))).then(() => undefined);
  }
}

export default async function handler(request: http.IncomingMessage, response: http.ServerResponse) {
  const serverTiming = servertime.createTimer();
  serverTiming.start("0-setup");

  const url = new URL(request.url as string, `http://${request.headers.host}`);
  let q = url.searchParams.get("q");
  const id = url.searchParams.get("id");
  const n = url.searchParams.get("n");
  const p = url.searchParams.get("p");
  if (!q) {
    sendErrorResponse(response, "Invalid request url");
    return;
  }

  let fs = null;
  switch (fileStrategy) {
    case "local":
      fs = new LocalFileSystem();
      break;
    case "gcs":
      fs = new GoogleCloudStorage();
      break;
    default:
      sendErrorResponse(response, "Invalid file strategy");
      return;
  }

  // ファイルシステムI/Oの処理を抽象化したインターフェースを使用して処理を行う
  if (id && n && p) {
    if (n !== "1") {
      const fileId = `/tmp/${id}/`;
      const idList = [...Array(Number(n)).keys()].map((i) => fileId + `${i}`);
      if (!(await fs.isExists(fileId))) {
        fs.validateFileId(fileId);
      }
      if (!(await fs.isExists(fileId + `${p}`))) {
        fs.writeFile(fileId + `${p}`, q);
      }
      if (await fs.isAllExists(idList)) {
        q = await fs.readAllFiles(idList);
        fs.remove(fileId, { recursive: true, force: true });
      } else {
        sendSignal(response, true);
        return;
      }
    }
  } else if (n !== "1" && (id || n || p)) {
    sendErrorResponse(response, "Invalid request url");
    return;
  }

  const json = decodeRequest(q, response);
  if (!json) {
    sendErrorResponse(response, "Invalid request");
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
  sendSignal(response, false);
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

