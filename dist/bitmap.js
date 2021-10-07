"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bitmap = void 0;
function num2LittleEndian(num, bytes) {
    let arr = [];
    for (let i = 0; i < bytes; i++) {
        arr.push(num & 0xff);
        num = num >> 8;
    }
    return arr;
}
class BitmapFileHeader {
    constructor(fileSize, bitmapOffset) {
        this.fileType = "BM";
        this.fileSize = fileSize;
        this.bitmapOffset = bitmapOffset;
    }
    getLittleEndian() {
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
    constructor(width, height) {
        this.size = 40;
        this.planes = 1;
        this.bitPix = 24;
        this.compression = 0;
        this.xPelsPerMeter = 50190;
        this.yPelsPerMeter = 50190;
        this.clrUsed = 0;
        this.clrImportant = 0;
        this.width = width;
        this.height = height;
        this.sizeImage = width * height * 3;
    }
    getLittleEndian() {
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
class Bitmap {
    constructor(width, height) {
        this.length = width * height * 3 + 54;
        this.bitmapFileHeader = new BitmapFileHeader(width * height * 3 + 54, 54);
        this.bitmapInfoHeader = new BitmapInfoHeader(width, height);
        this.bitmapData = null;
    }
    getLittleEndian() {
        if (this.bitmapData === null) {
            console.error("bitmapData is null");
            // this.setData(new Uint8Array(arr));
        }
        const arr = [
            ...this.bitmapFileHeader.getLittleEndian(),
            // .map((x) => (x < 128 ? x : x - 256)),
            ...this.bitmapInfoHeader.getLittleEndian(),
            // .map((x) => (x < 128 ? x : x - 256)),
            ...this.bitmapData,
        ];
        return new Uint8Array(arr);
    }
    setData(data) {
        this.bitmapData = data;
    }
    static fromUint8Array(data) {
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
    static fromString(str) {
        const data = new TextEncoder().encode(str);
        return Bitmap.fromUint8Array(data);
    }
}
exports.Bitmap = Bitmap;
