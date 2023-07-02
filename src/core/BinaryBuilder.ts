import { Buffer } from "buffer";

export class BinaryBuilder {
  byteLength: number;
  private buffer: Buffer | null;
  offset: number = 0;

  constructor(size: number) {
    this.byteLength = size;
    this.buffer = Buffer.allocUnsafe(size);
  }

  push(value: number, bytes: number) {
    this.buffer!.writeUIntLE(value, this.offset, bytes);
    this.offset += bytes;
    return this;
  }

  append(value: Buffer) {
    this.buffer!.fill(value, this.offset);
    this.offset += value.byteLength;
    return this;
  }

  end(): Buffer {
    const result = this.buffer;
    this.buffer = null;
    return result!;
  }

  static make(arr: number[]) {
    return Buffer.from(arr);
  }
}
