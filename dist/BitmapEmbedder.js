"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitmapContentSender = exports.BitmapEmbedder = exports.ResponseReportWriter = void 0;
const bitmap_1 = require("./bitmap");
const zlib_1 = __importDefault(require("zlib"));
const stream_1 = require("stream");
const zlib_2 = require("zlib");
/// <reference path="./@types/cors-anywhere.d.ts" />
function BufferOrStringToUint8Array(buffers) {
    let totalLength = 0;
    const encoder = new TextEncoder();
    for (const i in buffers) {
        if (typeof buffers[i] === "string") {
            buffers[i] = encoder.encode(buffers[i]);
        }
        totalLength += buffers[i].length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const bufferOrString of buffers) {
        const buffer = bufferOrString;
        for (let i = 0; i < buffer.length; i++) {
            result[offset + i] = buffer[i];
        }
        offset += buffer.length;
    }
    return result;
}
/**
 * Minimum implementation of ServerResponse to capture data without to be sent to the client.
 * */
class AbridgedResponse extends stream_1.Writable {
    constructor(options) {
        super(options);
        this._headersSent = false;
        this._statusCode = 200;
        this._statusMessage = "";
        this.chunks = [];
        this.bitmap = null;
        this.data = null;
        this.index = 0;
        this.headerHistory = {};
    }
    get headers() {
        return Object.assign({}, this.headerHistory);
    }
    set headers(value) {
        if (this._headersSent) {
            throw new Error("Headers already sent");
        }
        Object.entries(value).forEach(([key, value]) => {
            this.headerHistory[key] = value;
        });
    }
    get statusCode() {
        return this._statusCode;
    }
    set statusCode(value) {
        this._statusCode = value;
    }
    get statusMessage() {
        return this._statusMessage;
    }
    set statusMessage(value) {
        this._statusMessage = value;
    }
    get headersSent() {
        return this._headersSent;
    }
    writeHead(statusCode, statusMessage, headers) {
        console.log({ statusCode, obj: headers });
        if (this._headersSent) {
            throw new Error("Headers already sent");
        }
        if (!headers) {
            headers = {};
        }
        else if (Array.isArray(headers)) {
            const _headers = {};
            for (const index of Array(headers.length / 2).keys()) {
                const key = headers[index * 2].toString();
                _headers[key] = headers[index * 2 + 1];
            }
            headers = _headers;
        }
        if (typeof statusMessage === "string") {
            this.statusMessage = statusMessage;
        }
        else if (Array.isArray(statusMessage)) {
            this.setHeader(statusMessage[0].toString(), statusMessage[1]);
            headers[statusMessage[0].toString()] = statusMessage[1];
            statusMessage = undefined;
        }
        else if (typeof statusMessage === "object") {
            Object.entries(statusMessage).forEach(([key, value]) => {
                this.setHeader(key.toString(), value);
                headers[key.toString()] = value;
            });
            statusMessage = undefined;
        }
        this._headersSent = true;
        return this;
    }
    setHeader(name, value) {
        if (this._headersSent) {
            throw new Error("Headers already sent");
        }
        console.log({ name, value });
        this.headerHistory[name] = value;
        return this;
    }
    removeHeader(name) {
        if (this._headersSent) {
            throw new Error("Headers already sent");
        }
        delete this.headerHistory[name];
        return this;
    }
    getHeaderNames() {
        return Object.keys(this.headers);
    }
    _write(chunk, _, callback) {
        this.chunks.push(chunk);
        callback(null);
    }
}
/** Implementation of ReportWriter */
class ResponseReportWriter extends AbridgedResponse {
    decompress() {
        let encodingStack = this.headerHistory["content-encoding"];
        let encodings;
        if (!encodingStack) {
            encodings = [];
        }
        else if (!Array.isArray(encodingStack)) {
            encodings = encodingStack.split(",");
        }
        else {
            encodings = encodingStack;
        }
        console.log({ encodings });
        let result = Buffer.from(BufferOrStringToUint8Array(this.chunks));
        for (const encoding of encodings) {
            switch (encoding) {
                case "br":
                    result = zlib_1.default.brotliDecompressSync(result);
                    break;
                // Or, just use zlib.createUnzip() to handle both of the following cases:
                case "gzip":
                    result = zlib_1.default.gunzipSync(result);
                    break;
                case "deflate":
                    result = zlib_1.default.inflateSync(result);
                    break;
                default:
                    throw new Error(`Unknown encoding ${encoding}`);
            }
        }
        return result;
    }
    result() {
        return {
            status: this.statusCode,
            statusText: this.statusMessage,
            headers: this.headers,
            body: this.decompress().toString("utf-8"),
        };
    }
}
exports.ResponseReportWriter = ResponseReportWriter;
/** Embed bitmap into response and send to the client */
class BitmapEmbedder {
    constructor(response) {
        this.response = response;
        this.bitmap = null;
    }
    _image() {
        const response = this.response;
        const json = JSON.stringify(response);
        try {
            JSON.parse(json);
        }
        catch (e) {
            new Error(`Invalid JSON: ${e}, ${json}`);
        }
        const data = BufferOrStringToUint8Array([JSON.stringify(response)]);
        this.bitmap = bitmap_1.Bitmap.fromUint8Array(data);
        // this.data = this.bitmap.getLittleEndian();
    }
}
exports.BitmapEmbedder = BitmapEmbedder;
class BitmapContentSender extends BitmapEmbedder {
    static pipe(source, target, overwriteHeader) {
        source.on("finish", () => {
            console.log("finish!");
            const response = source.result();
            // console.log({ response });
            const embedder = new BitmapContentSender(response);
            embedder.send(target, overwriteHeader);
        });
        source.on("error", (e) => {
            target.writeHead(500, "Internal Server Error");
            target.end();
            console.error(e);
        });
        target.on("error", (e) => {
            target.writeHead(500, "Internal Server Error");
            target.end();
            console.error(e);
        });
        source.on("end", () => {
            console.log("source end");
        });
        target.on("end", () => {
            console.log("target end");
        });
    }
    send(response, overwriteHeader) {
        this._image();
        // todo: accept-encoding header check
        response.statusCode = 200;
        response.setHeader("Content-Type", "image/bmp");
        response.setHeader("Content-Encoding", "gzip");
        response.setHeader("Content-Length", this.bitmap.length);
        overwriteHeader &&
            Object.entries(overwriteHeader).forEach(([key, value]) => {
                response.setHeader(key, value);
            });
        // response.writeProcessing();
        const gzip = zlib_2.createGzip();
        stream_1.Readable.from([this.bitmap.getLittleEndian()]).pipe(gzip).pipe(response);
        // const data = gzipSync(this.bitmap!.getLittleEndian());
        // console.log("sending", { byteLength: data.byteLength });
        // response.end(data);
    }
}
exports.BitmapContentSender = BitmapContentSender;
