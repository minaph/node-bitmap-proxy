import {
  JSONObject,
  JSONValue,
  ProxyTargetResponse,
} from "../api/_BitmapProxyResponse";

import { RequestOptions } from "http";

import { base71 } from "./base71";

async function fetch(
  input: string | Request,
  init?: RequestInit
): Promise<Response> {
  console.time("fetch");
  const endpoint = "https://vercel-bitmap-proxy-minaph.vercel.app/";

  const {
    url,
    method,
    headers,
    body,
    referrer,
    referrerPolicy,
    mode,
    credentials,
    cache,
    redirect,
    integrity,
    keepalive,
    signal,
    // window,
  } = new Request(input, init);

  const { hostname, pathname, protocol, search, port } = new URL(url);

  const request: RequestOptions = {
    method,
    path: encodeURI(pathname + search),
    hostname,
    protocol,
  };

  if (port.length) {
    request.port = port;
  }

  const entries = [...headers.entries()];

  if (entries) {
    request.headers = Object.fromEntries(entries);
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  const requestUrl = ((url: string) => {
    // if (!url.startsWith(endpoint)) {
    //   url = endpoint + url;
    // }
    // url +=
    return new URL(endpoint + base71(JSON.stringify(request)));
  })(url);

  return (async () => {
    signal?.addEventListener("abort", () => {
      throw new DOMException("Aborted", "AbortError");
    });

    console.timeLog("fetch", "setup");

    // img setup & load
    const img = document.createElement("img");
    img.crossOrigin = "Anonymous";
    img.src = requestUrl.href;
    await img.decode();

    console.timeLog("fetch", "image decode");

    // canvas setup
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;

    let binary;

    // recordTime(requestUrl.href, () => {
    // hack
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    // get response
    ctx.drawImage(img, 0, 0);
    const RGBA = ctx.getImageData(0, 0, img.width, img.height).data;
    console.assert(RGBA.length === img.width * img.height * 4);

    // decode
    binary = RGBA.filter((_, i) => i % 4 !== 3).reverse();

    console.timeLog("fetch", "binary decode");

    const text = new TextDecoder("utf-8").decode(binary).replace(/\0+$/g, "");
    const { status, statusText, headers, body } = JSON.parse(text);

    console.timeLog("fetch", "text decode");

    //　make response
    const result = new Response(body, { status, statusText, headers });

    console.timeEnd("fetch");
    console.debug(result);
    return result;
  })();
}

// let total = 0;

// function recordTime(name: string, fn: () => void) {
//   const start = new Date();
//   fn();
//   const end = new Date();
//   const elapsed = end.getTime() - start.getTime();
//   // total += elapsed;
//   console.log(name, elapsed);
// }

export default fetch;
