import { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "http";
import { Bitmap } from "./bitmap";

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

import { Duplex, DuplexOptions, PipelineCallback } from "stream";


class BitmapDuplex extends Duplex {
  bitmap: Bitmap | null;
  chunks: (string | Buffer)[];
  data: Uint8Array | null;
  index: number;
  _res: ServerResponse;
  private headerHistory: Parameters<ServerResponse["setHeader"]>[];

  constructor(res: ServerResponse, options: DuplexOptions) {
    super(options);

    this.chunks = [];
    this.bitmap = null;
    this.data = null;
    this.index = 0;

    this._res = res;
    this.headerHistory = [];

    this.on("finish", () => {
      console.log("finish!");
      this.getImage();
      this._read(this.data!.length);
    });
  }

  get headers() {
    return this._res.getHeaders();
  }

  set headers(value: OutgoingHttpHeaders) {
    Object.entries(value).forEach(([key, value]) => {
      this._res.setHeader(key, value!);
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
      this.push(Buffer.from(this.data?.subarray(this.index, (this.index += size)).buffer, 0, size));
    } else if (this.data && size && this.index + size  > this.data!.length) {
      this.push(null);
    } else if (this.data && this.index === this.data.length) {
      this.push(null);
    } else if (this.data && !size) {
      this.push(Buffer.from(this.data.buffer));
    }
  }

  private getImage() {
    const data = BufferOrStringToUint8Array(this.chunks);
    this.bitmap = Bitmap.fromUint8Array(data);
    this.data = this.bitmap.getLittleEndian();
    // return this.bitmap.getLittleEndian();
  }

  writeHead(
    statusCode: number,
    statusMessage?: string,
    obj?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): ServerResponse {
    console.log({ statusCode, statusMessage, obj });
    return this._res.writeHead(statusCode, statusMessage, obj);
  }

  setHeader(
    name: string,
    value: string | number | readonly string[]
  ): ServerResponse {

    console.log({ name, value });

    return this._res.setHeader(name, value);
  }

  getHeaders(): OutgoingHttpHeaders {
    return this._res.getHeaders();
  }
}

export default BitmapDuplex;
