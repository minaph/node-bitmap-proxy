import {
    IncomingMessage,
    OutgoingHttpHeader,
    OutgoingHttpHeaders,
    ServerResponse,
} from "http";
import { Bitmap } from "./bitmap";
import zlib from "zlib";
import { Writable, WritableOptions, PipelineCallback, Readable } from "stream";
import { ProxyTargetResponse, JSONObject } from "./BitmapProxyResponse";

import { gzipSync, createGzip } from "zlib";

/// <reference path="./@types/cors-anywhere.d.ts" />

function BufferOrStringToUint8Array(buffers: (Buffer | string)[]): Uint8Array {
    let totalLength = 0;
    const encoder = new TextEncoder();
    for (const i in buffers) {
        if (typeof buffers[i] === "string") {
            buffers[i] = encoder.encode(buffers[i] as string) as Buffer;
        }
        totalLength += buffers[i].length;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const bufferOrString of buffers) {
        const buffer = bufferOrString as Buffer;
        for (let i = 0; i < buffer.length; i++) {
            result[offset + i] = buffer[i];
        }
        offset += buffer.length;
    }
    return result;
}

/** Propeties of ServerResponse used in lib/cors-anywhere.js */
interface CORSAnywhereServerResponse {
    headers: OutgoingHttpHeaders;
    statusCode: number;
    statusMessage: string;
    headersSent: boolean;
    // writableEnded: boolean;
    // end: (data?: any) => void;
    removeHeader(name: string): void;
    writeHead: ServerResponse["writeHead"];
    getHeaderNames: ServerResponse["getHeaderNames"];
}

/**
 * Minimum implementation of ServerResponse to capture data without to be sent to the client.
 * */
class AbridgedResponse extends Writable implements CORSAnywhereServerResponse {
    bitmap: Bitmap | null;
    chunks: (string | Buffer)[];
    data: Uint8Array | null;
    index: number;
    protected headerHistory: OutgoingHttpHeaders;
    private _headersSent = false;
    private _statusCode = 200;
    private _statusMessage: string = "";

    constructor(options?: WritableOptions) {
        super(options);

        this.chunks = [];
        this.bitmap = null;
        this.data = null;
        this.index = 0;

        this.headerHistory = {};
    }

    get headers() {
        return Object.assign({}, this.headerHistory);
    }

    set headers(value: OutgoingHttpHeaders) {
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

    set statusCode(value: number) {
        this._statusCode = value;
    }

    get statusMessage() {
        return this._statusMessage;
    }

    set statusMessage(value: string) {
        this._statusMessage = value;
    }

    get headersSent() {
        return this._headersSent;
    }

    writeHead(
        statusCode: number,
        statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
        headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
    ) {
        console.log({ statusCode, obj: headers });

        if (this._headersSent) {
            throw new Error("Headers already sent");
        }

        if (!headers) {
            headers = {};
        } else if (Array.isArray(headers)) {
            const _headers = {} as OutgoingHttpHeaders;
            for (const index of Array(headers.length / 2).keys()) {
                const key = headers[index * 2].toString();
                _headers[key] = headers[index * 2 + 1];
            }
            headers = _headers;
        }

        if (typeof statusMessage === "string") {
            this.statusMessage = statusMessage;
        } else if (Array.isArray(statusMessage)) {
            this.setHeader(statusMessage[0].toString(), statusMessage[1]);
            headers[statusMessage[0].toString()] = statusMessage[1];
            statusMessage = undefined;
        } else if (typeof statusMessage === "object") {
            Object.entries(statusMessage).forEach(([key, value]) => {
                this.setHeader(key.toString(), value!);
                (headers as OutgoingHttpHeaders)[key.toString()] = value;
            });
            statusMessage = undefined;
        }

        this._headersSent = true;

        return this as any;
    }

    setHeader(
        name: string,
        value: string | number | string[]
    ): AbridgedResponse {
        if (this._headersSent) {
            throw new Error("Headers already sent");
        }
        console.log({ name, value });
        this.headerHistory[name] = value;

        return this;
    }

    removeHeader(name: string): AbridgedResponse {
        if (this._headersSent) {
            throw new Error("Headers already sent");
        }

        delete this.headerHistory[name];
        return this;
    }

    getHeaderNames() {
        return Object.keys(this.headers);
    }

    _write(
        chunk: Buffer | string,
        _: string,
        callback: PipelineCallback<Writable>
    ) {
        this.chunks.push(chunk);
        callback(null);
    }
}

interface ReportWriter extends Writable {
    result(): ProxyTargetResponse;
}

/** Implementation of ReportWriter */
export class ResponseReportWriter
    extends AbridgedResponse
    implements ReportWriter
{
    private decompress(): Buffer {
        let encodingStack = this.headerHistory["content-encoding"] as
            | string[]
            | string
            | undefined;

        let encodings: string[];

        if (!encodingStack) {
            encodings = [];
        } else if (!Array.isArray(encodingStack)) {
            encodings = encodingStack.split(",");
        } else {
            encodings = encodingStack;
        }
        console.log({ encodings });

        let result = Buffer.from(BufferOrStringToUint8Array(this.chunks));

        for (const encoding of encodings) {
            switch (encoding) {
                case "br":
                    result = zlib.brotliDecompressSync(result);
                    break;
                // Or, just use zlib.createUnzip() to handle both of the following cases:
                case "gzip":
                    result = zlib.gunzipSync(result);
                    break;
                case "deflate":
                    result = zlib.inflateSync(result);
                    break;
                default:
                    throw new Error(`Unknown encoding ${encoding}`);
            }
        }

        return result;
    }

    result(): ProxyTargetResponse {
        return {
            status: this.statusCode,
            statusText: this.statusMessage,
            headers: this.headers as JSONObject,
            body: this.decompress().toString("utf-8"),
        };
    }
}

/** Embed bitmap into response and send to the client */
export class BitmapEmbedder {
    protected bitmap: Bitmap | null;

    constructor(private readonly response: ProxyTargetResponse) {
        this.bitmap = null;
    }

    protected _image() {
        const response = this.response;

        const json = JSON.stringify(response);

        try {
            JSON.parse(json);
        } catch (e) {
            new Error(`Invalid JSON: ${e}, ${json}`);
        }

        const data = BufferOrStringToUint8Array([JSON.stringify(response)]);
        this.bitmap = Bitmap.fromUint8Array(data);
        // this.data = this.bitmap.getLittleEndian();
    }
}

export class BitmapContentSender extends BitmapEmbedder {
    static pipe(
        source: ReportWriter,
        target: ServerResponse,
        overwriteHeader?: OutgoingHttpHeaders
    ): void {
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

    public send(
        response: ServerResponse,
        overwriteHeader?: OutgoingHttpHeaders
    ) {
        this._image();

        // todo: accept-encoding header check
        response.statusCode = 200;
        response.setHeader("Content-Type", "image/bmp");
        response.setHeader("Content-Encoding", "gzip");
        // response.setHeader("Content-Length", this.bitmap!.length);

        overwriteHeader &&
            Object.entries(overwriteHeader).forEach(([key, value]) => {
                response.setHeader(key, value!);
            });

        // response.writeProcessing();

        const gzip = createGzip();
        const gzipped = Readable.from([this.bitmap!.getLittleEndian()]).pipe(
            gzip
        );
        response.setHeader("Content-Length", gzipped.readableLength);

        gzipped.pipe(response);

        // const data = gzipSync(this.bitmap!.getLittleEndian());
        // console.log("sending", { byteLength: data.byteLength });
        // response.end(data);
    }
}

class BitmappableResponse extends ServerResponse {
    constructor(
        response: IncomingMessage,
        private readonly headers: OutgoingHttpHeaders
    ) {
        super(response);
    }
}
