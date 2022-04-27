import {
  JSONObject,
  JSONValue,
  ProxyTargetResponse,
} from "./BitmapProxyResponse.js";

/** Implemented fetch options */
type AllowedRequestInitKeys = [
  "url",

  // "method",
  // "headers",
  // "body",
  // "referrer",
  // "referrerPolicy",
  // "mode",
  // "credentials",
  // "cache",
  // "redirect",
  // "integrity",
  // "keepalive",
  "signal"
  // "window",
];

async function fetch(
  input: string | Request,
  init?: RequestInit
): Promise<Response> {
  const endpoint = "http://localhost:3000/";

  // listed in the same order as in the specifications.
  // see https://fetch.spec.whatwg.org/#ref-for-dom-request%E2%91%A0
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

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  const requestUrl = ((url: string) => {
    if (url.startsWith(endpoint)) {
      url = url.slice(endpoint.length);
    }
    return new URL(url);
  })(url);

  return (async () => {
    signal?.addEventListener("abort", () => {
      throw new DOMException("Aborted", "AbortError");
    });

    // img setup & load
    const img = document.createElement("img");
    img.crossOrigin = "Anonymous";
    img.src = endpoint + requestUrl.href;
    await img.decode();

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

    // binary = decodeRGBA(RGBA, img.width, img.height);
    // console.log({ length: binary.length });
    // });

    const text = new TextDecoder("utf-8").decode(binary).replace(/\0+$/g, "");
    // try {
    //   JSON.parse(text);
    // } catch (error) {
    //   console.log({ text, binary });
    //   throw error;
    // }
    const { status, statusText, headers, body } = JSON.parse(text);

    //　make response
    const result = new Response(body, { status, statusText, headers });
    console.log(result);
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

