"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeProxyRequest = exports.ProxyResponse = exports.makeDataUrlRequest = exports.onEnd = void 0;
const util_1 = require("util");
const base64UrlDecode_1 = require("../bitmap-fetch/base64UrlDecode");
const bitmap_1 = require("./bitmap");
const servertime_1 = __importDefault(require("servertime"));
const BitmapProxyResponse_1 = require("./BitmapProxyResponse");
Object.defineProperty(exports, "ProxyResponse", { enumerable: true, get: function () { return BitmapProxyResponse_1.ProxyResponse; } });
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const net = __importStar(require("net"));
const ContentEncoding_1 = require("./ContentEncoding");
function parseDataUrl(input) {
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
function makeDataUrlRequest(reqPath, callback) {
    const { mimeType, body } = parseDataUrl(reqPath);
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
exports.makeDataUrlRequest = makeDataUrlRequest;
function makeProxyRequest(json, callback) {
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
    }
    else {
        const httpModule = json.protocol === "https:" ? https : http;
        const req = httpModule.request(options, callback);
        return req;
    }
}
exports.makeProxyRequest = makeProxyRequest;
function handler(request, response) {
    const serverTiming = servertime_1.default.createTimer();
    serverTiming.start("0-setup");
    const url = new URL(request.url, `http://${request.headers.host}`);
    const q = url.searchParams.get("q");
    if (!q) {
        sendErrorResponse(response, "Invalid request url");
        return;
    }
    const json = decodeRequest(q, response);
    if (!json) {
        return;
    }
    const contentEncoding = ContentEncoding_1.ContentEncoding.fromRequest(request);
    serverTiming.end("0-setup");
    serverTiming.start("1-connect");
    const req = makeProxyRequest(json, (res) => {
        const { headers, statusCode, statusMessage } = res;
        let ttfb = false;
        const dataBuffer = [];
        res.on("data", (data) => {
            if (!ttfb) {
                ttfb = true;
                serverTiming.end("2-request");
                serverTiming.start("3-download");
            }
            if (typeof data === "string") {
                dataBuffer.push(Buffer.from(data));
            }
            else {
                dataBuffer.push(data);
            }
        });
        res.on("end", () => {
            onEnd(response, serverTiming, contentEncoding, {
                headers: headers,
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
        req?.write((0, base64UrlDecode_1.base64UrlDecode)(json.body));
    }
    req?.end();
}
exports.default = handler;
function decodeRequest(q, response) {
    try {
        const _json = JSON.parse(new util_1.TextDecoder().decode((0, base64UrlDecode_1.base64UrlDecode)(q)));
        return _json;
    }
    catch (e) {
        console.log(e);
        console.log(q);
        sendErrorResponse(response, "Undecodable request");
        return null;
    }
}
function sendErrorResponse(response, message) {
    response.statusCode = 400;
    response.statusMessage = message;
    response.end();
}
function onEnd(response, serverTiming, contentEncoding, result, dataBuffer) {
    serverTiming.end("3-download");
    serverTiming.start("4-build");
    const binary = new BitmapProxyResponse_1.ProxyResponse({
        headers: result.headers,
        status: result.status,
        statusText: result.statusText,
        body: Buffer.concat(dataBuffer)
    }).toBuffer();
    const bitmap = (0, bitmap_1.fromBuffer)(binary);
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
exports.onEnd = onEnd;
function onConnect(serverTiming) {
    serverTiming.end("1-connect");
    serverTiming.start("2-request");
}
