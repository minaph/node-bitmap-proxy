
import { TextDecoder } from "util";
import { base64UrlDecode } from "../../bitmap-fetch/base64UrlDecode";
import { constructBmpFromBuffer } from "../core/bitmap";

import servertime from "servertime";
import { BmpResponse, BmpResponseContent } from "./BmpResponse";

import * as http from "http";
import { ContentEncoding } from "./ContentEncoding";


import { LocalFileSystem, GoogleCloudStorage, ServerFileSystem, FSAdditionalUtil } from "./FileSystem";


type BmpServerApplication = (
  request: string,
  callback: (content: BmpResponseContent) => void
) => Promise<void>;

type FileStrategy = "local" | "gcs" | "none";


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

// ファイルシステムI/Oの処理を抽象化したインターフェースを使用して処理を行う
// ページネーションへの対応

async function processPagination(response: http.ServerResponse, url: URL, fileStrategy: FileStrategy): Promise<string | null> {
  const id = url.searchParams.get("id");
  const n = url.searchParams.get("n");
  const p = url.searchParams.get("p");
  const q = url.searchParams.get("q")!;
  let targetQuery: string;

  let fs: (ServerFileSystem & FSAdditionalUtil) | null = null;
  switch (fileStrategy) {
    case "local":
      fs = new LocalFileSystem();
      break;
    case "gcs":
      fs = new GoogleCloudStorage();
      break;
    case "none":
      fs = null;
      break;
    default:
      sendErrorResponse(response, "Invalid file strategy");
      return null;
  }

  if (id && n && p) {
    if (n !== "1") {
      if (fs === null) {
        console.assert(fileStrategy === "none");
        sendErrorResponse(response, "FileSystem not enabled. Strategy: " + fileStrategy);
        return null;
      }

      const fileId = `/tmp/${id}/`;
      const idList = [...Array(Number(n)).keys()].map((i) => fileId + `${i}`);
      if (!(await fs.isExists(fileId))) {
        fs.validateFileId(fileId);
      }
      if (!(await fs.isExists(fileId + `${p}`))) {
        await fs.writeFile(fileId + `${p}`, q);
      }
      if (await fs.isAllExists(idList)) {
        targetQuery = await fs.readAllFiles(idList).catch((e) => {
          if (fileStrategy === "gcs") {
            // retry once
            return fs!.readAllFiles(idList)
          }
          console.error(e);
          throw e;
        });
        // fs.removeAllFiles(idList);
        return targetQuery;
      } else {
        sendSignal(response, true);
        return null;
      }
    }
    return q;
  } else if (n !== "1" && (id || n || p)) {
    sendErrorResponse(response, "Invalid request url: " + url.toString());
    return null;
  } else {
    return q;
  }
}

export function server(internalApplication: BmpServerApplication, fileStrategy: FileStrategy) {

  const ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ = servertime.createTimer();

  function sendBmpResponse(
    response: http.ServerResponse,
    encoding: ContentEncoding,
    buffer: Buffer
  ): void {
    const bitmap = constructBmpFromBuffer(buffer);

    ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.end("2-build");
    ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.start("3-compress");

    const compressed = encoding.encode(bitmap.getUint8LE());

    ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.end("3-compress");

    const responseHeaders = {
      "Content-Type": "image/bmp",
      "Content-Length": compressed.byteLength,
      "Content-Encoding": encoding.type,
      "Access-Control-Allow-Origin": "*",
      "access-control-expose-headers": "Access-Control-Allow-Origin",
      "Cache-Control": "no-store",
      "Server-Timing": ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.getHeader(),
    } as http.OutgoingHttpHeaders;
    response.writeHead(200, responseHeaders);
    response.write(compressed, "binary", () => {
      response.end();
    });
  }

  return async function handler(request: http.IncomingMessage, response: http.ServerResponse) {
    /* 
    1. url分析
    2. pagination対応
    3. base64 decode
    4. any processing
    5. make inner response
    6. bmp binarize
    7. make outer response
    8. end
    */

    ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.start("0-setup");

    const url = new URL(request.url as string, `http://${request.headers.host}`);
    let query = url.searchParams.get("q");
    if (!query) {
      sendErrorResponse(response, "Invalid request url");
      return;
    }

    const contentEncoding = ContentEncoding.fromRequest(request);

    const q = await processPagination(response, url, fileStrategy);
    if (!q) {
      return;
    }
    query = q;
    const decodedQuery = new TextDecoder().decode(base64UrlDecode(q));

    ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.end("0-setup");
    ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.start("1-application");

    try {
      internalApplication(decodedQuery, (content) => {

        ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.end("1-application");
        ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.start("2-build");

        const binary = new BmpResponse(content).toBuffer();
        sendBmpResponse(response, contentEncoding, binary);
      })
    } catch (error) {
      let message = "Application Error: ";
      if (error instanceof Error) {
        message += error.message;
      } else if (typeof error === "string") {
        message += error;
      } else {
        message += internalApplication.name;
      }
      sendErrorResponse(response, message);
    }

  }
}

function sendErrorResponse(response: http.ServerResponse, message: string) {
  response.statusCode = 400;
  response.statusMessage = message;
  sendSignal(response, false);
}


