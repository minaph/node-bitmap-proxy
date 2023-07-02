/**
 * HTTPのContent-Encodingヘッダーを処理するためのクラス。
 *
 * @module ContentEncoding
 */

import { IncomingMessage } from "http";
import { brotliCompressSync, deflateSync, gzipSync } from "zlib";

export type Encodings = "identity" | "br" | "gzip" | "compress";

export class ContentEncoding {
  static get(headers: { [key: string]: string; }) {
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
