
import { expect, test, vi, it, describe } from "vitest"

import { makeDataUrlRequest, makeProxyRequest, onEnd } from "../src/BitmapHttpServer";
import * as http from "http";

it("makeDataUrlRequest should create a response from a data URL", async () => {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' height='20' width='20' stroke='rgba(128,128,128,1)' stroke-width='2' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' d='M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2'/></svg>";
  const url = "image/svg+xml," + encodeURI(svg);
  let mimeType = "";
  let contentLength = 0;
  const res = await new Promise<{ mimeType, contentLength, data }>((resolve) => {
    makeDataUrlRequest(url, (res) => {
      mimeType = res.headers["content-type"]!;
      contentLength = parseInt(res.headers["content-length"]!);
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ mimeType, contentLength, data });
      });
    });
  });
  expect(res.mimeType).toBe("image/svg+xml");
  expect(res.contentLength).toBe(svg.length);
  expect(res.data).toMatchInlineSnapshot(`"${svg}"`);
});

it("makeProxyRequest should make a request to the specified URL", async () => {
  const req = {
    protocol: "https:",
    hostname: "www.example.com",
    path: "/",
  };
  const res = await new Promise((resolve) => {
    makeProxyRequest(req, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    }).end();
  });
  expect(res).toContain("<!doctype html>");
});

it("onEnd should create a compressed bitmap response", () => {
  const response: any = {
    writeHead: vi.fn(),
    write: vi.fn((_data, _encoding, callback) => {
      callback();
    }),
    end: vi.fn(),
  };
  const serverTiming: any = {
    start: vi.fn(),
    end: vi.fn(),
    getHeader: vi.fn().mockReturnValue(""),
  };
  const contentEncoding: any = {
    type: "gzip",
    encode: vi.fn().mockReturnValue(new Uint8Array()),
  };
  const result = {
    headers: { "content-type": "image/bmp" },
    status: 200,
    statusText: "",
    body: new Buffer("Qk2gA...AAA=", "base64"),
  };
  const dataBuffer = [result.body];
  onEnd(response, serverTiming, contentEncoding, result, dataBuffer);
  expect(serverTiming.start).toHaveBeenCalledTimes(2);
  expect(serverTiming.end).toHaveBeenCalledTimes(3);
  expect(contentEncoding.encode).toHaveBeenCalledTimes(1);
  expect(response.writeHead).toHaveBeenCalledTimes(1);
  expect(response.write).toHaveBeenCalledTimes(1);
  expect(response.end).toHaveBeenCalledTimes(1);
  expect(response.writeHead).toHaveBeenCalledWith(200, {
    "Content-Type": "image/bmp",
    "Content-Length": 0,
    "Content-Encoding": "gzip",
    "Access-Control-Allow-Origin": "*",
    "access-control-expose-headers": "Access-Control-Allow-Origin",
    "Cache-Control": "no-store",
    "Server-Timing": "",
  });
});



// describe('makeProxyRequest', () => {
//   it('should make a request with correct options', async () => {
//     const options = {
//       hostname: 'example.com',
//       port: 8080,
//       path: '/path',
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Bearer abc123'
//       },
//       protocol: 'https:',
//       body: JSON.stringify({ data: 'test' })
//     };

//     const requestSpy = vi.fn<[http.IncomingMessage]>((req) => {
//       expect(req.headers.host).toBe(`${options.hostname}:${options.port}`);
//       expect(req.method).toBe(options.method);
//       expect(req.headers).toEqual(options.headers);
//       return req;
//     });

//     await new Promise((resolve) => {
//       makeProxyRequest(options, requestSpy)
//         .on("close", resolve)
//     })

//     expect(requestSpy).toHaveBeenCalledTimes(1);
//   });
// });
