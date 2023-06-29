"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bitmap = exports.fromBuffer = void 0;
const buffer_1 = require("buffer");
const BinaryBuilder_1 = require("./BinaryBuilder");
function fromBuffer(data) {
    const width = 256;
    const height = Math.ceil((data.length + 1) / (width * 3));
    const space = width * height * 3 - data.length - 1;
    const bitmap = new Bitmap(width, height);
    bitmap.bitmapData = buffer_1.Buffer.concat([
        data,
        buffer_1.Buffer.alloc(1).fill(1),
        buffer_1.Buffer.alloc(space),
    ]);
    return bitmap;
}
exports.fromBuffer = fromBuffer;
class BitmapFileHeader extends BinaryBuilder_1.BinaryBuilder {
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
class BitmapInfoHeader extends BinaryBuilder_1.BinaryBuilder {
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
class Bitmap extends BinaryBuilder_1.BinaryBuilder {
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
            this.append(BinaryBuilder_1.BinaryBuilder.make(this.bitmapData));
        }
        console.assert(this.offset === this.byteLength);
        return this.end();
    }
}
exports.Bitmap = Bitmap;
