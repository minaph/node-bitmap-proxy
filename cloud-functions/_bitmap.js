"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bitmap = void 0;
const buffer_1 = require("buffer");
// function getUint8LE(num: number, bytes: number): Uint8Array {
//   let arr = Buffer.allocUnsafe(bytes);
//   for (let i = 0; i < bytes; i++) {
//     arr[i] = num & 0xff;
//     num = num >> 8;
//   }
//   return arr;
// }
class BinaryBuilder {
    constructor(size) {
        this.offset = 0;
        this.byteLength = size;
        this.buffer = buffer_1.Buffer.allocUnsafe(size);
    }
    push(value, bytes) {
        this.buffer.writeUIntLE(value, this.offset, bytes);
        this.offset += bytes;
        return this;
    }
    append(value) {
        this.buffer.fill(value, this.offset);
        this.offset += value.byteLength;
        return this;
    }
    end() {
        const result = this.buffer;
        this.buffer = null;
        return result;
    }
    static make(arr) {
        return buffer_1.Buffer.from(arr);
    }
}
class BitmapFileHeader extends BinaryBuilder {
    constructor(fileSize, bitmapOffset) {
        super(BitmapFileHeader.byteLength);
        this.fileType = "BM";
        this.fileSize = fileSize;
        this.bitmapOffset = bitmapOffset;
    }
    getUint8LE() {
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
BitmapFileHeader.byteLength = 14;
class BitmapInfoHeader extends BinaryBuilder {
    constructor(width, height) {
        super(BitmapInfoHeader.byteLength);
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
    getUint8LE() {
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
BitmapInfoHeader.byteLength = 40;
class Bitmap extends BinaryBuilder {
    constructor(width, height) {
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
        if (buffer_1.Buffer.isBuffer(this.bitmapData)) {
            this.append(this.bitmapData);
        }
        else {
            this.append(BinaryBuilder.make(this.bitmapData));
        }
        console.assert(this.offset === this.byteLength);
        return this.end();
    }
    setData(data) {
        this.bitmapData = data;
    }
}
exports.Bitmap = Bitmap;
