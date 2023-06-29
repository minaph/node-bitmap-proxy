"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.base64UrlDecode = void 0;
function base64UrlDecode(input) {
    // URL安全な形式をBase64に変換する
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    // Base64データをバイナリに変換する
    const binary = atob(base64);
    // バイナリをTypedArrayに変換する
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
exports.base64UrlDecode = base64UrlDecode;
