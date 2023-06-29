"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyResponse = void 0;
class ProxyResponse {
    constructor({ headers, status, statusText, body }) {
        this.header = {
            headers,
            status,
            statusText,
        };
        this.body = body;
        this._header = Buffer.from(JSON.stringify(this.header));
        this.headerLength = this._header.byteLength;
    }
    toBuffer() {
        const totalLength = 2 + this.headerLength + this.body.byteLength;
        const buffer = Buffer.alloc(totalLength);
        buffer.writeUInt16LE(this.headerLength, 0);
        buffer.fill(this._header, 2);
        this.body.copy(buffer, 2 + this.headerLength);
        return buffer;
    }
}
exports.ProxyResponse = ProxyResponse;
