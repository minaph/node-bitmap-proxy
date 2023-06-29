"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryBuilder = void 0;
const buffer_1 = require("buffer");
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
exports.BinaryBuilder = BinaryBuilder;
