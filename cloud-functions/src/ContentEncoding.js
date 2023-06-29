"use strict";
/**
 * HTTPのContent-Encodingヘッダーを処理するためのクラス。
 *
 * @module ContentEncoding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentEncoding = void 0;
const zlib_1 = require("zlib");
class ContentEncoding {
    static get(headers) {
        const contentEncoding = headers["content-encoding"];
        if (contentEncoding) {
            return contentEncoding;
        }
        return "identity";
    }
    static fromRequest(request) {
        if (!("accept-encoding" in request.headers)) {
            return new ContentEncoding("identity");
        }
        const acceptEncoding = request.headers["accept-encoding"];
        const selected = {
            type: "identity",
            quality: 0,
        };
        for (const item of acceptEncoding.split(",")) {
            let encoding, quality;
            if (item.includes(";")) {
                let _q;
                [encoding, _q] = item.split(";");
                quality = parseFloat(_q.split("=")[1]);
            }
            else {
                [encoding, quality] = [item, 1];
            }
            if (quality > selected.quality) {
                selected.type = encoding.trim();
                selected.quality = quality;
            }
        }
        return new ContentEncoding(selected.type);
    }
    constructor(type) {
        this.type = type;
    }
    encode(value) {
        switch (this.type) {
            case "br":
                return (0, zlib_1.brotliCompressSync)(value);
            case "gzip":
                return (0, zlib_1.gzipSync)(value);
            case "compress":
                return (0, zlib_1.deflateSync)(value);
            case "identity":
                return value;
            default:
                throw new Error("Unknown encoding");
        }
    }
}
exports.ContentEncoding = ContentEncoding;
