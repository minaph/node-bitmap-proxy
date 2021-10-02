import { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "http";
import { Bitmap } from "./bitmap";
import zlib from "zlib";
import { Duplex, DuplexOptions, PipelineCallback } from "stream";

function BufferOrStringToUint8Array(buffers: (Buffer | string)[]): Uint8Array {
  let totalLength = 0;
  for (const bufferOrString of buffers) {
    if (typeof bufferOrString === "string") {
      totalLength += bufferOrString.length;
    } else {
      totalLength += bufferOrString.length;
    }
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const bufferOrString of buffers) {
    if (typeof bufferOrString === "string") {
      const string = bufferOrString as string;
      for (let i = 0; i < string.length; i++) {
        result[offset + i] = string.charCodeAt(i);
      }
      offset += string.length;
    } else {
      const buffer = bufferOrString as Buffer;
      for (let i = 0; i < buffer.length; i++) {
        result[offset + i] = buffer[i];
      }
      offset += buffer.length;
    }
  }
  return result;
}

// Propeties of ServerResponse which is used in lib/cors-anywhere.js
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

class BitmapDuplex extends Duplex implements CORSAnywhereServerResponse {
  bitmap: Bitmap | null;
  chunks: (string | Buffer)[];
  data: Uint8Array | null;
  index: number;
  _res: ServerResponse;
  private headerHistory: OutgoingHttpHeaders;
  private _headersSent = false;

  constructor(res: ServerResponse, options: DuplexOptions) {
    super(options);

    this.chunks = [];
    this.bitmap = null;
    this.data = null;
    this.index = 0;

    this._res = res;
    this.headerHistory = {};

    this.on("finish", () => {
      console.log("finish!");
      this.getImage();
      this._read(this.data!.length);
    });
  }

  get headers() {
    return this.headerHistory;
  }

  set headers(value: OutgoingHttpHeaders) {
    Object.entries(value).forEach(([key, value]) => {
      // this._res.setHeader(key, value!);
      this.headerHistory[key] = value;
    });
  }

  get statusCode() {
    return this._res.statusCode;
  }

  set statusCode(value: number) {
    this._res.statusCode = value;
  }

  set statusMessage(value: string) {
    this._res.statusMessage = value;
  }

  get statusMessage() {
    return this._res.statusMessage;
  }

  get headersSent() {
    return this._res.headersSent || this._headersSent;
  }

  writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): ServerResponse {
    console.log({ statusCode, obj: headers });
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

    return this._res.writeHead(statusCode, statusMessage, headers);
  }

  setHeader(name: string, value: string | number | string[]): BitmapDuplex {
    console.log({ name, value });

    // this.headerHistory.push([name, value]);
    this.headerHistory[name] = value;

    // this._res.setHeader(name, value);
    return this;
  }

  removeHeader(name: string): BitmapDuplex {
    delete this.headerHistory[name];
    this._res.removeHeader(name);
    return this;
  }

  getHeaderNames() {
    return Object.keys(this.headers);
  }

  _write(
    chunk: Buffer | string,
    _: string,
    callback: PipelineCallback<Duplex>
  ) {
    this.chunks.push(chunk);
    callback(null);
  }

  _read(size?: number) {
    if (this.data && size && this.index + size <= this.data.length) {
      const buffer = this.data?.subarray(
        this.index,
        (this.index += size)
      ).buffer;
      const imageData = Buffer.from(buffer, 0, size);
      this.push(imageData);
      this.index += size;
      if (this.index >= this.data.length) {
        this.push(null);
      }
    } else if (this.data && size && this.index + size > this.data!.length) {
      const buffer = this.data?.subarray(this.index).buffer;
      this.push(Buffer.from(buffer, 0, this.data!.length - this.index));
      this.push(null);
    } else if (this.data && this.index === this.data.length) {
      this.push(null);
    } else if (this.data && !size) {
      this.push(Buffer.from(this.data.buffer));
      this.push(null);
    } else {
      this.push("");
    }
  }

  private getImage() {
    const response = {
      headers: JSON.parse(JSON.stringify(this.headers)),
      status: this.statusCode,
      statusText: this.statusMessage,
      body: this.decompress().toString("utf8"),
    };

    const data = BufferOrStringToUint8Array([JSON.stringify(response)]);
    this.bitmap = Bitmap.fromUint8Array(data);
    this.data = this.bitmap.getLittleEndian();
  }

  decompress(): Buffer {
    let encodingStack = this.headerHistory["content-encoding"] as
      | string[]
      | string;

    let encodings: string[];
    if (!Array.isArray(encodingStack)) {
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
}

export default BitmapDuplex;
