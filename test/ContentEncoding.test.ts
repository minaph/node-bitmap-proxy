import { test, expect } from "vitest";
import { ContentEncoding, Encodings } from "../src/ContentEncoding";
import { deflateSync, gzipSync, brotliCompressSync } from "zlib";

test("ContentEncoding.get returns 'identity' if Content-Encoding header is not present", () => {
  const headers = { "some-other-header": "value" };
  const contentEncoding = ContentEncoding.get(headers);
  expect(contentEncoding).toBe("identity");
});

test("ContentEncoding.get returns the value of the Content-Encoding header if present", () => {
  const headers = { "content-encoding": "gzip" };
  const contentEncoding = ContentEncoding.get(headers);
  expect(contentEncoding).toBe("gzip");
});

test("ContentEncoding.fromRequest returns a ContentEncoding object with the correct encoding type", () => {
  const request = { headers: { "accept-encoding": "gzip, deflate" } };
  const contentEncoding = ContentEncoding.fromRequest(request as any);
  expect(contentEncoding.type).toBe("gzip");
});

test("ContentEncoding.fromRequest returns a ContentEncoding object with 'identity' encoding if Accept-Encoding header is not present", () => {
  const request = { headers: {} };
  const contentEncoding = ContentEncoding.fromRequest(request as any);
  expect(contentEncoding.type).toBe("identity");
});

test("ContentEncoding.encode compresses the value with the correct encoding type", () => {
  const value = Buffer.from("Hello, world!");
  const encodings: Encodings[] = ["identity", "br", "gzip", "compress"];
  for (const encoding of encodings) {
    const contentEncoding = new ContentEncoding(encoding);
    const compressedValue = contentEncoding.encode(value);
    switch (encoding) {
      case "identity":
        expect(compressedValue).toEqual(value);
        break;
      case "br":
        expect(brotliCompressSync(value)).toEqual(compressedValue);
        break;
      case "gzip":
        expect(gzipSync(value)).toEqual(compressedValue);
        break;
      case "compress":
        expect(deflateSync(value)).toEqual(compressedValue);
        break;
      default:
        throw new Error("Unknown encoding");
    }
  }
});


