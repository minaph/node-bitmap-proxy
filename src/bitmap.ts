function num2LittleEndian(num: number, bytes: number): number[] {
  let arr = [];
  for (let i = 0; i < bytes; i++) {
    arr.push(num & 0xff);
    num = num >> 8;
  }
  return arr;
}

class BitmapFileHeader {
  fileType: string = "BM";
  fileSize: number;
  bitmapOffset: number;

  constructor(fileSize: number, bitmapOffset: number) {
    this.fileSize = fileSize;
    this.bitmapOffset = bitmapOffset;
  }

  getLittleEndian(): number[] {
    let arr = [];
    arr.push(this.fileType.charCodeAt(0));
    arr.push(this.fileType.charCodeAt(1));
    arr.push(...num2LittleEndian(this.fileSize, 4));
    arr.push(...Array(4).fill(0));
    arr.push(...num2LittleEndian(this.bitmapOffset, 4));

    return arr;
  }
}

class BitmapInfoHeader {
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

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.sizeImage = width * height * 3;
  }
  getLittleEndian(): number[] {
    let arr = [];
    arr.push(...num2LittleEndian(this.size, 4));
    arr.push(...num2LittleEndian(this.width, 4));
    arr.push(...num2LittleEndian(this.height, 4));
    arr.push(...num2LittleEndian(this.planes, 2));
    arr.push(...num2LittleEndian(this.bitPix, 2));
    arr.push(...num2LittleEndian(this.compression, 4));
    arr.push(...num2LittleEndian(this.sizeImage, 4));
    arr.push(...num2LittleEndian(this.xPelsPerMeter, 4));
    arr.push(...num2LittleEndian(this.yPelsPerMeter, 4));
    arr.push(...num2LittleEndian(this.clrUsed, 4));
    arr.push(...num2LittleEndian(this.clrImportant, 4));

    return arr;
  }
}

export class Bitmap {
  bitmapFileHeader: BitmapFileHeader;
  bitmapInfoHeader: BitmapInfoHeader;

  bitmapData: Uint8Array | null;
  length: number;

  constructor(width: number, height: number) {
    this.length = width * height * 3 + 54;

    this.bitmapFileHeader = new BitmapFileHeader(width * height * 3 + 54, 54);
    this.bitmapInfoHeader = new BitmapInfoHeader(width, height);
    this.bitmapData = null;
  }

  getLittleEndian(): Uint8Array {
    if (this.bitmapData === null) {
      console.error("bitmapData is null");
      // this.setData(new Uint8Array(arr));
    }
    const arr = [
      ...this.bitmapFileHeader.getLittleEndian(),
      // .map((x) => (x < 128 ? x : x - 256)),
      ...this.bitmapInfoHeader.getLittleEndian(),
      // .map((x) => (x < 128 ? x : x - 256)),
      ...this.bitmapData!,
    ];
    return new Uint8Array(arr);
  }

  private setData(data: Uint8Array) {
    this.bitmapData = data;
  }

  static fromUint8Array(data: Uint8Array) {
    const width = 200;
    const height = Math.ceil(data.length / (width * 3));
    const space = width * height * 3 - data.length;
    console.log({ data: data.length, width, height, space });
    const bitmap = new Bitmap(width, height);

    bitmap.setData(new Uint8Array([...data, ...Array(space).fill(0)]));
    console.log({ bitmap });
    return bitmap;
  }

  toString() {
    return new TextDecoder("utf-8").decode(this.getLittleEndian());
  }

  static fromString(str: string) {
    const data = new TextEncoder().encode(str);
    return Bitmap.fromUint8Array(data);
  }
}
