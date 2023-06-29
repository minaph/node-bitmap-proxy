import { base64UrlEncode } from "./base64UrlEncode";

type JSONObject = {
  [key: string]: JSONValue;
};

type JSONArray = JSONValue[];

type JSONValue = string | number | boolean | JSONArray | JSONObject;

interface ProxyTargetResponse {
  headers: JSONObject;
  status: number;
  statusText: string;
  body: Uint8Array;
}

type NodeHTTPRequestOptions = {
  method: string;
  path: string;
  hostname: string;
  protocol: string;
  body?: string;
  port?: string;
  headers?: Object;
};


async function fetchInternal(
  endpoint: string,
  input: string | Request,
  init?: RequestInit
): Promise<Response> {
  console.time("fetch");

  const {
    url,
    method,
    headers,
    body,
    // referrer,
    // referrerPolicy,
    // mode,
    // credentials,
    // cache,
    // redirect,
    // integrity,
    // keepalive,
    signal,
    // window,
  } = new Request(input, init);

  const { hostname, pathname, protocol, search, port } = new URL(url);

  const request: NodeHTTPRequestOptions = {
    method,
    path: pathname + search,
    hostname,
    protocol,
  };

  if (port.length) {
    request.port = port;
  }

  if (body) {
    const reader = body.getReader();
    let chunks: number[] = [];
    let chunk: ReadableStreamReadResult<Uint8Array>;
    while ((chunk = await reader.read()) && !chunk.done) {
      // chunks.push(chunk.value);
      chunks = [...chunks, ...chunk.value];
    }
    request.body = base64UrlEncode(Uint8Array.from(chunks));
  }

  const entries = [...headers.entries()];

  if (entries) {
    request.headers = Object.fromEntries(entries);
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  const requestUrl = ((req: NodeHTTPRequestOptions) => {
    const encoder = new TextEncoder();
    return new URL(endpoint +
      base64UrlEncode(encoder.encode(JSON.stringify(req))));
  })(request);

  try {
    signal?.addEventListener("abort", () => {
      throw new DOMException("Aborted", "AbortError");
    });

    const result = await fetchImageAsResponse(requestUrl.href)

    console.timeEnd("fetch");
    console.debug(result);
    return result;
  } catch (error) {
    console.error("Error during fetch:", error);
    throw error;
  }
}

async function fetchImageAsResponse(
  imageURL: string,
): Promise<Response> {
  try {
    console.time("fetchImage");

    // img setup & load
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageURL;
    await img.decode();

    console.timeLog("fetchImage", "image decode");

    // canvas setup
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;

    // hack
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    // get response
    ctx.drawImage(img, 0, 0);
    const RGBA = ctx.getImageData(0, 0, img.width, img.height).data;
    console.assert(RGBA.length === img.width * img.height * 4);

    // decode
    let binary = RGBA.filter((_, i) => i % 4 !== 3).reverse();

    console.timeLog("fetch", "binary decode");

    // get first 2 bytes as uint16, which is the length of the header
    const headerLength = new Uint16Array(binary.subarray(0, 2).buffer)[0];

    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(binary.subarray(2, headerLength + 2));
    const { status, statusText, headers } = JSON.parse(text) as {
      headers: Record<string, string>;
    } & ProxyTargetResponse;

    const bodyEnd = binary.lastIndexOf(1);
    const body = binary.slice(headerLength + 2, bodyEnd).buffer;

    // draw image to canvas
    ctx.drawImage(img, 0, 0);

    console.timeLog("fetchImage", "text decode");

    // make response
    const result = new Response(body, { status, statusText, headers });

    console.timeEnd("fetchImage");
    console.debug(result);
    return result;
  } catch (error) {
    console.error("Error during fetchImage:", error);
    return Promise.reject(error);
  }
}

async function fetch(input: string, init?: RequestInit): Promise<Response> {
  const endpoint = "https://vercel-bitmap-proxy.vercel.app/";
  // const endpoint = "http://localhost:3000/";
  return fetchInternal(endpoint, input, init);
}

type RaceResult = {
  endpoint: string;
  response: Response;
};

async function fetchRace(
  input: string,
  init?: RequestInit
): Promise<RaceResult> {
  const endpoints = [
    "https://vercel-bitmap-proxy.vercel.app/",
    "https://asia-northeast1-scrgoogproject-1651036452801.cloudfunctions.net/function-2?q=",
    "https://exuberant-quilt-chimpanzee.glitch.me/?q=",
  ];
  const promises = endpoints.map(async (endpoint) => {
    const response = await fetchInternal(endpoint, input, init);
    return { endpoint, response };
  });
  return Promise.race(promises);
}


export { fetch, fetchRace, fetchInternal, fetchImageAsResponse };
