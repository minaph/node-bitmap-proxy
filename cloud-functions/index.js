"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const https_1 = require("https");
const _bitmap_1 = require("./_bitmap");
const zlib_1 = require("zlib");
const base71_1 = require("./base71");
const servertime_1 = __importDefault(require("servertime"));
function handler(request, response) {
    // servertime.addToResponse(response);
    const serverTiming = servertime_1.default.createTimer();
    serverTiming.start("0-setup");
    const { query: { q }, } = request;
    if (!q) {
        response.status(400).send("Invalid request");
        return;
    }
    const data = base71_1.decodeBase71(q);
    let json;
    try {
        json = JSON.parse(data.toString());
    }
    catch (e) {
        response.status(400).send("Invalid request");
        return;
    }
    if ("path" in json && typeof json.path === "string") {
        json.path = encodeURI(json.path);
    }
    console.log(JSON.stringify(json, null, 2));
    const contentEncoding = ContentEncoding.fromRequest(request);
    let proxyRequest = http_1.request;
    if (json.protocol === "https:") {
        proxyRequest = https_1.request;
    }
    serverTiming.end("0-setup");
    serverTiming.start("1-connect");
    const req = proxyRequest(json, (res) => {
        const { headers, statusCode, statusMessage } = res;
        let body = "";
        let ttfb = false;
        res.on("data", (data) => {
            if (!ttfb) {
                ttfb = true;
                serverTiming.end("2-request");
                serverTiming.start("3-download");
            }
            if (Buffer.isBuffer(data)) {
                data = data.toString();
            }
            else if (typeof data !== "string") {
                throw new Error("Unexpected data type");
            }
            body += data;
        });
        res.on("end", onEnd);
        function onEnd() {
            serverTiming.end("3-download");
            serverTiming.start("4-build");
            const result = JSON.stringify({
                headers,
                status: statusCode,
                statusText: statusMessage,
                body,
            });
            const binary = Buffer.from(result);
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
            };
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
    req.end();
}
exports.default = handler;
function fromBuffer(data) {
    const width = 256;
    const height = Math.ceil(data.length / (width * 3));
    const space = width * height * 3 - data.length;
    const bitmap = new _bitmap_1.Bitmap(width, height);
    bitmap.bitmapData = Buffer.concat([data, Buffer.alloc(space)]);
    return bitmap;
}
class ContentEncoding {
    constructor(type) {
        this.type = type;
    }
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
    encode(value) {
        switch (this.type) {
            case "br":
                return zlib_1.brotliCompressSync(value);
            case "gzip":
                return zlib_1.gzipSync(value);
            case "compress":
                return zlib_1.deflateSync(value);
            case "identity":
                return value;
            default:
                throw new Error("Unknown encoding");
        }
    }
}
