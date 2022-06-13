import { Buffer } from "buffer";

// function getUint8LE(num: number, bytes: number): Uint8Array {
//   let arr = Buffer.allocUnsafe(bytes);
//   for (let i = 0; i < bytes; i++) {
//     arr[i] = num & 0xff;
//     num = num >> 8;
//   }
//   return arr;
// }

class BinaryBuilder {
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

class BitmapFileHeader extends BinaryBuilder {
  fileType: string = "BM";
  fileSize: number;
  bitmapOffset: number;
  static byteLength: number = 14;

  constructor(fileSize: number, bitmapOffset: number) {
    super(BitmapFileHeader.byteLength);
    this.fileSize = fileSize;
    this.bitmapOffset = bitmapOffset;
  }

  getUint8LE(): ReturnType<typeof BinaryBuilder.prototype.end> {
    // let arr = Buffer.allocUnsafe(this.fileSize);
    this.push(this.fileType.charCodeAt(0), 1);
    this.push(this.fileType.charCodeAt(1), 1);
    this.push(this.fileSize, 4);
    this.offset += 4;
    this.push(this.bitmapOffset, 4);

    console.assert(this.offset === BitmapFileHeader.byteLength);

    return this.end();
  }
}

class BitmapInfoHeader extends BinaryBuilder {
  size: number = 40;
  width: number;
  height: number;
  planes: number = 1;
  bitPix: number = 24;
  compression: number = 0;
  sizeImage: number;
  xPelsPerMeter: number = 50190;
  yPelsPerMeter: number = 50190;
  clrUsed: number = 0;
  clrImportant: number = 0;
  static byteLength: number = 40;

  constructor(width: number, height: number) {
    super(BitmapInfoHeader.byteLength);
    this.width = width;
    this.height = height;
    this.sizeImage = width * height * 3;
  }
  getUint8LE(): Buffer {
    // let arr = [];
    this.push(this.size, 4);
    this.push(this.width, 4);
    this.push(this.height, 4);
    this.push(this.planes, 2);
    this.push(this.bitPix, 2);
    this.push(this.compression, 4);
    this.push(this.sizeImage, 4);
    this.push(this.xPelsPerMeter, 4);
    this.push(this.yPelsPerMeter, 4);
    this.push(this.clrUsed, 4);
    this.push(this.clrImportant, 4);

    console.assert(this.offset === BitmapInfoHeader.byteLength);

    return this.end();
  }
}

export class Bitmap extends BinaryBuilder {
  bitmapFileHeader: BitmapFileHeader;
  bitmapInfoHeader: BitmapInfoHeader;

  bitmapData: Buffer | number[] | null;
  byteLength: number;

  constructor(width: number, height: number) {
    super(width * height * 3 + 54);
    this.byteLength = width * height * 3 + 54;

    this.bitmapFileHeader = new BitmapFileHeader(this.byteLength, 54);
    this.bitmapInfoHeader = new BitmapInfoHeader(width, height);
    this.bitmapData = null;
  }

  getUint8LE() {
    if (this.bitmapData === null) {
      console.error("bitmapData is null");
    }

    this.append(this.bitmapFileHeader.getUint8LE());
    this.append(this.bitmapInfoHeader.getUint8LE());
    if (Buffer.isBuffer(this.bitmapData)) {
      this.append(this.bitmapData);
    } else {
      this.append(BinaryBuilder.make(this.bitmapData!));
    }

    console.assert(this.offset === this.byteLength);

    return this.end();
  }

  private setData(data: number[]) {
    this.bitmapData = data;
  }

  // static

  // toString() {
  //     return new TextDecoder("utf-8").decode(this.getUint8LE());
  // }

  // static fromString(str: string) {
  //     const data = new TextEncoder().encode(str);
  //     return Bitmap.fromUint8Array(data);
  // }
}
